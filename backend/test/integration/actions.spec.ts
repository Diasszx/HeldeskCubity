import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { hash } from 'bcrypt';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type RequestStatus,
} from '../../src/generated/prisma/client.js';
import { validateEnvironment } from '../../src/config/environment.js';
import { setupApplication } from '../../src/setup.js';
import { RequestsService } from '../../src/requests/requests.service.js';

let app: INestApplication;
let client: PrismaClient;
const users: string[] = [];
const categories: string[] = [];
const sessions = new Set<string>();
type Actor = { agent: ReturnType<typeof request.agent>; token: string };
let owner: Actor;
let other: Actor;
const origin = 'http://portal.test';

function track(response: { headers: Record<string, unknown> }) {
  const raw = response.headers['set-cookie'];
  const values =
    typeof raw === 'string' ? [raw] : (raw as string[] | undefined);
  for (const cookie of values ?? []) {
    if (!cookie.startsWith('cubity.sid=')) continue;
    const value = decodeURIComponent(
      cookie.split(';')[0].slice('cubity.sid='.length),
    );
    if (value.startsWith('s:')) sessions.add(value.slice(2).split('.')[0]);
  }
}
async function login(username: string, password: string): Promise<Actor> {
  const agent = request.agent(app.getHttpServer());
  const csrf = await agent
    .get('/api/auth/csrf')
    .set('Origin', origin)
    .expect(200);
  track(csrf);
  track(
    await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrf.body.csrfToken)
      .send({ username, password })
      .expect(200),
  );
  const renewed = await agent.get('/api/auth/csrf').expect(200);
  track(renewed);
  return { agent, token: renewed.body.csrfToken };
}

beforeAll(async () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value || process.env.NODE_ENV === 'production')
    throw new Error('Banco de testes dedicado obrigatório.');
  const url = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.pathname !== '/cubity_support_test' ||
    url.username !== 'cubity_test' ||
    !['127.0.0.1', 'localhost', 'db-test'].includes(url.hostname)
  )
    throw new Error('Banco de testes rejeitado.');
  process.env.DATABASE_URL = value;
  process.env.SESSION_SECRET =
    'actions-test-secret-with-at-least-thirty-two-characters';
  const migration = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      env: { ...process.env, DATABASE_URL: value, NODE_ENV: 'test' },
      encoding: 'utf8',
      timeout: 45000,
    },
  );
  if (migration.status !== 0) throw new Error('Migration de teste falhou.');
  client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: value }),
  });
  const usernames = [
    'actions.' + randomUUID(),
    'actions.other.' + randomUUID(),
  ];
  const password = 'actions-test-password';
  for (const username of usernames) {
    const user = await client.user.create({
      data: {
        name: 'Actions Integration',
        username,
        passwordHash: await hash(password, 4),
      },
    });
    users.push(user.id);
  }
  for (let index = 0; index < 2; index++) {
    const category = await client.category.create({
      data: { name: 'Actions ' + randomUUID() },
    });
    categories.push(category.id);
  }
  const { AppModule } = await import('../../src/app.module.js');
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(
      new ConfigService(
        validateEnvironment({
          NODE_ENV: 'test',
          DATABASE_URL: value,
          SESSION_SECRET: process.env.SESSION_SECRET,
          APP_ORIGIN: origin,
        }),
      ),
    )
    .compile();
  app = module.createNestApplication({ logger: false });
  setupApplication(app);
  await app.listen(0, '127.0.0.1');
  owner = await login(usernames[0], password);
  other = await login(usernames[1], password);
});

afterAll(async () => {
  if (app) await app.close();
  if (!client) return;
  try {
    await client.session.deleteMany({ where: { sid: { in: [...sessions] } } });
    await client.request.deleteMany({ where: { requesterId: { in: users } } });
    await client.user.deleteMany({ where: { id: { in: users } } });
    await client.category.deleteMany({ where: { id: { in: categories } } });
  } finally {
    await client.$disconnect();
  }
});

const input = () => ({
  title: 'Atualizado',
  description: 'Descrição nova',
  categoryId: categories[1],
});
const fixture = (status: RequestStatus = 'OPEN') =>
  client.request.create({
    data: {
      title: 'Original',
      description: 'Descrição original',
      categoryId: categories[0],
      requesterId: users[0],
      status,
    },
  });
const edit = (actor: Actor, id: string, body: object = input()) =>
  actor.agent
    .patch('/api/requests/' + id)
    .set('Origin', origin)
    .set('X-CSRF-Token', actor.token)
    .send(body);
const remove = (actor: Actor, id: string) =>
  actor.agent
    .delete('/api/requests/' + id)
    .set('Origin', origin)
    .set('X-CSRF-Token', actor.token);
const advance = (actor: Actor, id: string, status: string) =>
  actor.agent
    .patch('/api/requests/' + id + '/status')
    .set('Origin', origin)
    .set('X-CSRF-Token', actor.token)
    .send({ status });
const stored = (id: string) => client.request.findUnique({ where: { id } });

it('requires session and matching CSRF on all three actions without modifying data', async () => {
  const row = await fixture();
  for (const operation of ['edit', 'remove', 'status']) {
    const path =
      '/api/requests/' + row.id + (operation === 'status' ? '/status' : '');
    const anonymous = request(app.getHttpServer());
    await (
      operation === 'remove'
        ? anonymous.delete(path)
        : anonymous
            .patch(path)
            .send(operation === 'status' ? { status: 'IN_PROGRESS' } : input())
    ).expect(401);
    await (
      operation === 'remove'
        ? owner.agent.delete(path)
        : owner.agent
            .patch(path)
            .send(operation === 'status' ? { status: 'IN_PROGRESS' } : input())
    ).expect(403);
    await (
      operation === 'remove'
        ? owner.agent.delete(path)
        : owner.agent.patch(path)
    )
      .set('X-CSRF-Token', other.token)
      .send(operation === 'status' ? { status: 'IN_PROGRESS' } : input())
      .expect(403);
  }
  expect(await stored(row.id)).toEqual(row);
});

it('lets only the owner edit OPEN, preserving automatic fields', async () => {
  const row = await fixture();
  const response = await edit(owner, row.id, {
    title: '  Atualizado  ',
    description: '\n Descrição nova ',
    categoryId: categories[1],
  }).expect(200);
  expect(response.body).toEqual({
    ...row,
    createdAt: row.createdAt.toISOString(),
    ...input(),
  });
  expect(await stored(row.id)).toEqual({ ...row, ...input() });
});

it('rejects other owners edits and deletes with 403 and no mutation', async () => {
  const row = await fixture();
  await edit(other, row.id).expect(403);
  await remove(other, row.id).expect(403);
  expect(await stored(row.id)).toEqual(row);
});

it.each(['IN_PROGRESS', 'COMPLETED'] as const)(
  'refuses owner edit/delete in %s with 409',
  async (status) => {
    const row = await fixture(status);
    await edit(owner, row.id).expect(409);
    await remove(owner, row.id).expect(409);
    expect(await stored(row.id)).toEqual(row);
  },
);

it('deletes owner OPEN with 204, followed by 404 for subsequent actions', async () => {
  const row = await fixture();
  await remove(owner, row.id).expect(204);
  expect(await stored(row.id)).toBeNull();
  await edit(owner, row.id).expect(404);
  await remove(owner, row.id).expect(404);
  await advance(other, row.id, 'IN_PROGRESS').expect(404);
});

it('rejects invalid IDs for every action', async () => {
  await edit(owner, 'invalid').expect(400);
  await remove(owner, 'invalid').expect(400);
  await advance(other, 'invalid', 'IN_PROGRESS').expect(400);
});

it.each([
  { title: '' },
  { title: ' '.repeat(4) },
  { title: 't'.repeat(61) },
  { description: '\n\t' },
  { description: 'd'.repeat(1001) },
  { categoryId: randomUUID() },
  { requesterId: randomUUID() },
  { code: 'CLIENT' },
  { status: 'COMPLETED' },
  { createdAt: '2020-01-01' },
  { id: randomUUID() },
])('rejects invalid edit %j without partial mutation', async (changes) => {
  const row = await fixture();
  await edit(owner, row.id, { ...input(), ...changes }).expect(400);
  expect(await stored(row.id)).toEqual(row);
});

it('requires all three editable fields and accepts their exact normalized limits', async () => {
  const row = await fixture();
  await edit(owner, row.id, { title: 'x', categoryId: categories[1] }).expect(
    400,
  );
  await edit(owner, row.id, {
    ...input(),
    title: ' t'.trim().repeat(60),
    description: 'd'.repeat(1000),
  }).expect(200);
});

it('allows any authenticated user to advance both steps and preserves every other field', async () => {
  const row = await fixture();
  const first = await advance(other, row.id, 'IN_PROGRESS').expect(200);
  expect(first.body).toEqual({
    ...row,
    createdAt: row.createdAt.toISOString(),
    status: 'IN_PROGRESS',
  });
  await advance(owner, row.id, 'COMPLETED').expect(200);
  expect(await stored(row.id)).toEqual({ ...row, status: 'COMPLETED' });
});

it.each([
  ['OPEN', 'OPEN'],
  ['OPEN', 'COMPLETED'],
  ['IN_PROGRESS', 'OPEN'],
  ['IN_PROGRESS', 'IN_PROGRESS'],
  ['COMPLETED', 'OPEN'],
  ['COMPLETED', 'IN_PROGRESS'],
  ['COMPLETED', 'COMPLETED'],
] as const)('rejects %s to %s with 409', async (current, target) => {
  const row = await fixture(current);
  await advance(other, row.id, target).expect(409);
  expect(await stored(row.id)).toEqual(row);
});

it('strictly validates the status body', async () => {
  const row = await fixture();
  for (const body of [
    {},
    { status: 'CLOSED' },
    { status: 1 },
    { status: 'IN_PROGRESS', title: 'Client' },
    [],
  ]) {
    await other.agent
      .patch('/api/requests/' + row.id + '/status')
      .set('X-CSRF-Token', other.token)
      .send(body)
      .expect(400);
  }
  expect(await stored(row.id)).toEqual(row);
});

// Pausa leituras reais do service para intercalar operações HTTP, sem simular a escrita.
function pausedReads(count: number) {
  const service = app.get(RequestsService);
  const original = service.get.bind(service);
  let release!: () => void;
  let arrived!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  let reads = 0;
  const spy = jest.spyOn(service, 'get');
  for (let index = 0; index < count; index++)
    spy.mockImplementationOnce(async (id) => {
      const row = await original(id);
      if (++reads === count) arrived();
      await gate;
      return row;
    });
  return { ready, release, restore: () => spy.mockRestore() };
}

it.each(['edit', 'delete'])(
  'blocks a stale %s after concurrent attendance, with unchanged content',
  async (operation) => {
    const row = await fixture();
    const barrier = pausedReads(1);
    const pending = (
      operation === 'edit' ? edit(owner, row.id) : remove(owner, row.id)
    ).then((result) => result);
    try {
      await barrier.ready;
      await advance(other, row.id, 'IN_PROGRESS').expect(200);
      barrier.release();
      expect((await pending).status).toBe(409);
      expect(await stored(row.id)).toEqual({ ...row, status: 'IN_PROGRESS' });
    } finally {
      barrier.release();
      barrier.restore();
      await pending;
    }
  },
);

it('permits only one of two transitions that both read OPEN before writing', async () => {
  const row = await fixture();
  const barrier = pausedReads(2);
  const first = advance(owner, row.id, 'IN_PROGRESS').then((result) => result);
  const second = advance(other, row.id, 'IN_PROGRESS').then((result) => result);
  try {
    await barrier.ready;
    barrier.release();
    expect(
      (await Promise.all([first, second]))
        .map((result) => result.status)
        .sort(),
    ).toEqual([200, 409]);
    expect(await stored(row.id)).toEqual({ ...row, status: 'IN_PROGRESS' });
  } finally {
    barrier.release();
    barrier.restore();
    await Promise.all([first, second]);
  }
});

it('returns 404 when the row is deleted after the transition read', async () => {
  const row = await fixture();
  const barrier = pausedReads(1);
  const pending = advance(other, row.id, 'IN_PROGRESS').then(
    (result) => result,
  );
  try {
    await barrier.ready;
    await remove(owner, row.id).expect(204);
    barrier.release();
    expect((await pending).status).toBe(404);
    expect(await stored(row.id)).toBeNull();
  } finally {
    barrier.release();
    barrier.restore();
    await pending;
  }
});

it('publishes action status codes and strict bodies in OpenAPI', async () => {
  const result = await request(app.getHttpServer())
    .get('/api/docs-json')
    .expect(200);
  for (const operation of [
    result.body.paths['/api/requests/{id}'].patch,
    result.body.paths['/api/requests/{id}'].delete,
    result.body.paths['/api/requests/{id}/status'].patch,
  ]) {
    for (const code of ['401', '403', '404', '409'])
      expect(operation.responses[code]).toBeDefined();
    expect(operation.security).toEqual([{ cookie: [] }]);
  }
  expect(
    result.body.paths['/api/requests/{id}'].delete.responses['204'],
  ).toBeDefined();
  expect(
    result.body.paths['/api/requests/{id}/status'].patch.requestBody.content[
      'application/json'
    ].schema.additionalProperties,
  ).toBe(false);
});
