import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { prepareTestDatabase } from '../support/test-database.js';
import { Module, Controller, Get, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { hash } from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { validateEnvironment } from '../../src/config/environment.js';
import { SessionRuntime } from '../../src/session/session.runtime.js';
import { setupApplication } from '../../src/setup.js';

const origin = 'http://portal.test';
let app: INestApplication;
let client: PrismaClient;
let databaseUrl: string;
let username: string;
let userId: string;
const sessionIds = new Set<string>();
const password = 'test-password-123';

@Controller('probe')
class ProtectedProbe {
  @Get() get() {
    return { protected: true };
  }
}

function cookieOf(response: { headers: Record<string, unknown> }) {
  const raw = response.headers['set-cookie'];
  const values =
    typeof raw === 'string' ? [raw] : (raw as string[] | undefined);
  const cookie = values
    ?.find((value) => value.startsWith('cubity.sid='))
    ?.split(';')[0];
  if (cookie) {
    const signed = decodeURIComponent(cookie.slice('cubity.sid='.length));
    if (signed.startsWith('s:')) sessionIds.add(signed.slice(2).split('.')[0]);
  }
  return cookie;
}
function sidOf(cookie: string) {
  return decodeURIComponent(cookie.slice('cubity.sid='.length))
    .slice(2)
    .split('.')[0];
}

async function createApp(
  overrides: Record<string, unknown> = {},
  emulateRender = false,
) {
  const { AppModule } = await import('../../src/app.module.js');
  @Module({ imports: [AppModule], controllers: [ProtectedProbe] })
  class Root {}
  const env = validateEnvironment({
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: 'test-secret-with-at-least-thirty-two-characters',
    APP_ORIGIN: origin,
    ...overrides,
  });
  const module = await Test.createTestingModule({ imports: [Root] })
    .overrideProvider(ConfigService)
    // The local PostgreSQL fixture is not TLS; environment validation for cloud
    // URLs is tested separately. Emulate only the ingress contract here.
    .useValue(
      new ConfigService({
        ...env,
        ...(emulateRender ? { HOSTING_PLATFORM: 'render' } : {}),
      }),
    )
    .compile();
  const instance = module.createNestApplication({ logger: false });
  setupApplication(instance);
  await instance.init();
  return instance;
}

beforeAll(async () => {
  const value = prepareTestDatabase();
  process.env.DATABASE_URL = value;
  process.env.SESSION_SECRET =
    'integration-test-secret-at-least-thirty-two-characters';
  databaseUrl = value;
  client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: value }),
  });
  username = 'auth.' + randomUUID();
  const user = await client.user.create({
    data: {
      username,
      name: 'Auth Integration',
      passwordHash: await hash(password, 12),
    },
  });
  userId = user.id;
  app = await createApp();
});

afterAll(async () => {
  if (app) await app.close();
  if (client) {
    try {
      await client.session.deleteMany({
        where: { sid: { in: [...sessionIds] } },
      });
      if (userId) await client.user.delete({ where: { id: userId } });
    } finally {
      await client.$disconnect();
    }
  }
});

async function anonymous() {
  const agent = request.agent(app.getHttpServer());
  const csrf = await agent
    .get('/api/auth/csrf')
    .set('Origin', origin)
    .expect(200);
  const cookie = cookieOf(csrf)!;
  expect(csrf.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
  return { agent, token: csrf.body.csrfToken as string, cookie };
}
async function login() {
  const anonymousSession = await anonymous();
  const result = await anonymousSession.agent
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', anonymousSession.token)
    .send({ username, password })
    .expect(200);
  const cookie = cookieOf(result)!;
  const csrf = await anonymousSession.agent
    .get('/api/auth/csrf')
    .set('Origin', origin)
    .expect(200);
  cookieOf(csrf);
  return {
    ...anonymousSession,
    cookie,
    previousCookie: anonymousSession.cookie,
    previousToken: anonymousSession.token,
    token: csrf.body.csrfToken as string,
    result,
  };
}

it('protects controllers globally and keeps health public without a cookie', async () => {
  const health = await request(app.getHttpServer())
    .get('/api/health')
    .expect(200);
  expect(health.headers['set-cookie']).toBeUndefined();
  await request(app.getHttpServer()).get('/api/probe').expect(401);
  await request(app.getHttpServer()).get('/api/auth/me').expect(401);
});

it('persists anonymous CSRF and emits a scoped HttpOnly SameSite cookie', async () => {
  const session = await anonymous();
  const stored = await client.session.findUniqueOrThrow({
    where: { sid: sidOf(session.cookie) },
  });
  expect(stored.sess).toMatchObject({ csrfToken: session.token });
  const csrf = await session.agent.get('/api/auth/csrf').expect(200);
  expect(csrf.body.csrfToken).toBe(session.token);
  const attributes = String(csrf.headers['set-cookie']);
  expect(attributes).toContain('Path=/api');
  expect(attributes).toContain('HttpOnly');
  expect(attributes).toContain('SameSite=Lax');
  expect(attributes).not.toContain('Secure');
  expect(csrf.headers['cache-control']).toBe('no-store');
});

it('requires valid CSRF before login and refuses foreign origin and cross-site fetch', async () => {
  await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ username, password })
    .expect(403);
  const session = await anonymous();
  await session.agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', '0'.repeat(64))
    .send({ username, password })
    .expect(403);
  const other = await anonymous();
  await session.agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', other.token)
    .send({ username, password })
    .expect(403);
  await session.agent
    .post('/api/auth/login')
    .set('Origin', origin + '.evil')
    .set('X-CSRF-Token', session.token)
    .send({ username, password })
    .expect(403);
  await session.agent
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('Sec-Fetch-Site', 'cross-site')
    .set('X-CSRF-Token', session.token)
    .send({ username, password })
    .expect(403);
  await request(app.getHttpServer())
    .get('/api/auth/csrf')
    .set('Origin', 'http://evil.test')
    .expect(403);
});

it('returns identical 401 for wrong username/password and never trims password', async () => {
  const session = await anonymous();
  for (const input of [
    { username, password: 'wrong' },
    { username: 'missing.' + randomUUID(), password },
    { username, password: password + ' ' },
  ]) {
    const response = await session.agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.token)
      .send(input)
      .expect(401);
    expect(response.body).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Autenticação necessária.',
    });
  }
});

it('validates JSON strictly and rejects passwords exceeding 72 UTF-8 bytes', async () => {
  const session = await anonymous();
  for (const input of [
    { username, password, userId },
    { username, password: 'é'.repeat(37) },
    { username },
    { username: ' ', password },
  ]) {
    await session.agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.token)
      .send(input)
      .expect(400);
  }
});

it('regenerates session, rotates CSRF and returns only safe user fields', async () => {
  const session = await login();
  expect(session.cookie).not.toBe(session.previousCookie);
  expect(session.token).not.toBe(session.previousToken);
  expect(session.result.body).toEqual({
    id: userId,
    name: 'Auth Integration',
    username,
  });
  expect(
    await client.session.findUnique({
      where: { sid: sidOf(session.previousCookie) },
    }),
  ).toBeNull();
  const stored = await client.session.findUniqueOrThrow({
    where: { sid: sidOf(session.cookie) },
  });
  expect(stored.sess).toMatchObject({ userId });
  expect(Object.keys(stored.sess as object).sort()).toEqual([
    'cookie',
    'csrfToken',
    'userId',
  ]);
  await request(app.getHttpServer())
    .get('/api/auth/me')
    .set('Cookie', session.previousCookie)
    .expect(401);
  await session.agent.get('/api/auth/me').expect(200, session.result.body);
  await session.agent.get('/api/probe').expect(200, { protected: true });
  await session.agent
    .post('/api/auth/logout')
    .set('X-CSRF-Token', session.previousToken)
    .expect(403);
});

it('keeps identity after the API is closed and recreated', async () => {
  const session = await login();
  await app.close();
  app = await createApp();
  await request(app.getHttpServer())
    .get('/api/auth/me')
    .set('Cookie', session.cookie)
    .expect(200, session.result.body);
});

it('renews server expiration during authenticated activity and rejects an expired store row', async () => {
  const session = await login();
  const sid = sidOf(session.cookie);
  await client.session.update({
    where: { sid },
    data: { expire: new Date(Date.now() + 5000) },
  });
  await session.agent.get('/api/auth/me').expect(200);
  const renewed = await client.session.findUniqueOrThrow({ where: { sid } });
  expect(renewed.expire.getTime()).toBeGreaterThan(
    Date.now() + (28800 - 10) * 1000,
  );
  await client.session.update({
    where: { sid },
    data: { expire: new Date(Date.now() - 10000) },
  });
  await request(app.getHttpServer())
    .get('/api/auth/me')
    .set('Cookie', session.cookie)
    .expect(401);
});

it('requires CSRF for logout, destroys the row and rejects the previous cookie', async () => {
  const session = await login();
  await session.agent.post('/api/auth/logout').expect(403);
  const result = await session.agent
    .post('/api/auth/logout')
    .set('X-CSRF-Token', session.token)
    .expect(204);
  expect(String(result.headers['set-cookie'])).toContain(
    'cubity.sid=; Path=/api; Expires=Thu, 01 Jan 1970',
  );
  expect(
    await client.session.findUnique({ where: { sid: sidOf(session.cookie) } }),
  ).toBeNull();
  await request(app.getHttpServer())
    .get('/api/auth/me')
    .set('Cookie', session.cookie)
    .expect(401);
});

it('returns sanitized 500 when store reads or login saves fail', async () => {
  const session = await anonymous();
  const runtime = app.get(SessionRuntime);
  const failedSave = jest
    .spyOn(runtime.store, 'set')
    .mockImplementationOnce((_sid, _data, callback) =>
      callback?.(new Error('PRIVATE_STORE_DETAIL')),
    );
  try {
    const response = await session.agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', session.token)
      .send({ username, password })
      .expect(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível processar a requisição.',
    });
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_STORE_DETAIL');
  } finally {
    failedSave.mockRestore();
  }
  const active = await login();
  const failedGet = jest
    .spyOn(runtime.store, 'get')
    .mockImplementationOnce((_sid, callback) =>
      callback(new Error('PRIVATE_STORE_DETAIL')),
    );
  try {
    await active.agent.get('/api/auth/me').expect(500);
  } finally {
    failedGet.mockRestore();
  }
});

it('does not report a successful logout when destruction fails', async () => {
  const session = await login();
  const runtime = app.get(SessionRuntime);
  const failedDestroy = jest
    .spyOn(runtime.store, 'destroy')
    .mockImplementationOnce((_sid, callback) =>
      callback?.(new Error('PRIVATE_STORE_DETAIL')),
    );
  try {
    await session.agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', session.token)
      .expect(500);
  } finally {
    failedDestroy.mockRestore();
  }
  expect(
    await client.session.findUnique({ where: { sid: sidOf(session.cookie) } }),
  ).not.toBeNull();
});

it('requires HTTPS and only trusts explicit proxy addresses in production', async () => {
  const untrusted = await createApp({
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://portal.test',
  });
  try {
    await request(untrusted.getHttpServer())
      .get('/api/auth/csrf')
      .set('X-Forwarded-Proto', 'https')
      .expect(403);
  } finally {
    await untrusted.close();
  }
  const trusted = await createApp({
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://portal.test',
    TRUSTED_PROXY_IPS: '127.0.0.1,::1',
  });
  try {
    const response = await request(trusted.getHttpServer())
      .get('/api/auth/csrf')
      .set('X-Forwarded-Proto', 'https')
      .set('Origin', 'https://portal.test')
      .expect(200);
    cookieOf(response);
    expect(String(response.headers['set-cookie'])).toContain('Secure');
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
  } finally {
    await trusted.close();
  }
});

it('keeps Secure sessions across a Render process restart and rejects forged origins', async () => {
  const settings = {
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://portal.test',
  };
  let hosted = await createApp(settings, true);
  try {
    const csrf = await request(hosted.getHttpServer())
      .get('/api/auth/csrf')
      .set('Origin', 'https://portal.test')
      .set('X-Forwarded-Proto', 'http, https')
      .set('X-Forwarded-Host', 'attacker.test')
      .expect(200);
    const anonymousCookie = cookieOf(csrf)!;
    expect(String(csrf.headers['set-cookie'])).toContain('Secure');
    const authenticated = await request(hosted.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', 'https://portal.test')
      .set('Cookie', anonymousCookie)
      .set('X-CSRF-Token', csrf.body.csrfToken)
      .send({ username, password })
      .expect(200);
    const activeCookie = cookieOf(authenticated)!;
    await hosted.close();
    hosted = await createApp(settings, true);
    await request(hosted.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', activeCookie)
      .set('X-Forwarded-Proto', 'http')
      .expect(200);
    await request(hosted.getHttpServer())
      .get('/api/auth/csrf')
      .set('Cookie', activeCookie)
      .set('Origin', 'https://attacker.test')
      .set('X-Forwarded-Host', 'attacker.test')
      .expect(403);
    await request(hosted.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', activeCookie)
      .expect(403);
    const nonce = await request(hosted.getHttpServer())
      .get('/api/auth/csrf')
      .set('Cookie', activeCookie)
      .set('Origin', 'https://portal.test')
      .expect(200);
    await request(hosted.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', activeCookie)
      .set('Origin', 'https://portal.test')
      .set('X-CSRF-Token', nonce.body.csrfToken)
      .expect(204);
    await request(hosted.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', activeCookie)
      .expect(401);
  } finally {
    await hosted.close();
  }
});
