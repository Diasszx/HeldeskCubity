import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { prepareTestDatabase } from '../support/test-database.js';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { hash } from 'bcrypt';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { validateEnvironment } from '../../src/config/environment.js';
import { setupApplication } from '../../src/setup.js';

const origin = 'http://portal.test';
const password = 'registration-test-password';
let app: INestApplication;
let client: PrismaClient;
let userId: string;
let otherUserId: string;
let categoryId: string;
let username: string;
let agent: ReturnType<typeof request.agent>;
let token: string;
const sessions = new Set<string>();

function track(response: { headers: Record<string, unknown> }) {
  const raw = response.headers['set-cookie'];
  const cookies =
    typeof raw === 'string' ? [raw] : (raw as string[] | undefined);
  for (const cookie of cookies ?? []) {
    if (!cookie.startsWith('cubity.sid=')) continue;
    const value = decodeURIComponent(
      cookie.split(';')[0].slice('cubity.sid='.length),
    );
    if (value.startsWith('s:')) sessions.add(value.slice(2).split('.')[0]);
  }
}

beforeAll(async () => {
  const value = prepareTestDatabase();
  process.env.DATABASE_URL = value;
  process.env.SESSION_SECRET =
    'integration-test-secret-at-least-thirty-two-characters';
  client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: value }),
  });
  username = 'registration.' + randomUUID();
  const user = await client.user.create({
    data: {
      username,
      name: 'Registration Integration',
      passwordHash: await hash(password, 4),
    },
  });
  userId = user.id;
  const other = await client.user.create({
    data: {
      username: 'other.' + randomUUID(),
      name: 'Other Integration',
      passwordHash: await hash(password, 4),
    },
  });
  otherUserId = other.id;
  const category = await client.category.create({
    data: { name: 'Registration ' + randomUUID() },
  });
  categoryId = category.id;
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
  agent = request.agent(app.getHttpServer());
  const csrf = await agent
    .get('/api/auth/csrf')
    .set('Origin', origin)
    .expect(200);
  track(csrf);
  const login = await agent
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrf.body.csrfToken)
    .send({ username, password })
    .expect(200);
  track(login);
  const renewed = await agent
    .get('/api/auth/csrf')
    .set('Origin', origin)
    .expect(200);
  track(renewed);
  token = renewed.body.csrfToken;
});

afterAll(async () => {
  if (app) await app.close();
  if (!client) return;
  try {
    await client.session.deleteMany({ where: { sid: { in: [...sessions] } } });
    const ids = [userId, otherUserId].filter(Boolean);
    await client.request.deleteMany({ where: { requesterId: { in: ids } } });
    await client.user.deleteMany({ where: { id: { in: ids } } });
    if (categoryId) await client.category.delete({ where: { id: categoryId } });
  } finally {
    await client.$disconnect();
  }
});

const input = () => ({
  title: 'Solicitação de teste',
  description: 'Descrição da solicitação',
  categoryId,
});
const create = (body: object) =>
  agent
    .post('/api/requests')
    .set('Origin', origin)
    .set('X-CSRF-Token', token)
    .send(body);
const count = () => client.request.count({ where: { requesterId: userId } });

it('requires session for catalogs and registration, including an anonymous CSRF session', async () => {
  for (const path of ['/api/users', '/api/categories'])
    await request(app.getHttpServer()).get(path).expect(401);
  await request(app.getHttpServer())
    .post('/api/requests')
    .send(input())
    .expect(401);
  const anonymous = request.agent(app.getHttpServer());
  const csrf = await anonymous.get('/api/auth/csrf').expect(200);
  track(csrf);
  await anonymous
    .post('/api/requests')
    .set('X-CSRF-Token', csrf.body.csrfToken)
    .send(input())
    .expect(401);
});

it('returns catalog arrays with only public fields and without changing business data', async () => {
  const before = await count();
  const users = await agent.get('/api/users').expect(200);
  expect(users.body).toEqual(
    expect.arrayContaining([
      { id: userId, name: 'Registration Integration', username },
    ]),
  );
  for (const user of users.body)
    expect(Object.keys(user).sort()).toEqual(['id', 'name', 'username']);
  const categories = await agent.get('/api/categories').expect(200);
  expect(categories.body).toEqual(
    expect.arrayContaining([
      await client.category.findUniqueOrThrow({ where: { id: categoryId } }),
    ]),
  );
  for (const category of categories.body)
    expect(Object.keys(category).sort()).toEqual(['id', 'name']);
  expect(await count()).toBe(before);
});

it('requires matching CSRF and refuses a foreign origin without inserting rows', async () => {
  const before = await count();
  await agent.post('/api/requests').send(input()).expect(403);
  await agent
    .post('/api/requests')
    .set('X-CSRF-Token', '0'.repeat(64))
    .send(input())
    .expect(403);
  await agent
    .post('/api/requests')
    .set('Origin', 'http://foreign.test')
    .set('X-CSRF-Token', token)
    .send(input())
    .expect(403);
  expect(await count()).toBe(before);
});

it('trims input and persists the response with server-owned fields and UTC timestamp', async () => {
  const before = Date.now();
  const result = await create({
    ...input(),
    title: '  Pedido  ',
    description: '\n Descrição \t',
  }).expect(201);
  expect(Object.keys(result.body).sort()).toEqual([
    'categoryId',
    'code',
    'createdAt',
    'description',
    'id',
    'requesterId',
    'status',
    'title',
  ]);
  expect(result.body).toMatchObject({
    title: 'Pedido',
    description: 'Descrição',
    categoryId,
    requesterId: userId,
    status: 'OPEN',
  });
  expect(result.body.code).toMatch(/^SOL-\d{4,}$/);
  expect(result.body.createdAt).toMatch(/Z$/);
  expect(Date.parse(result.body.createdAt)).toBeGreaterThanOrEqual(
    before - 1000,
  );
  expect(Date.parse(result.body.createdAt)).toBeLessThanOrEqual(
    Date.now() + 1000,
  );
  const stored = await client.request.findUniqueOrThrow({
    where: { id: result.body.id },
  });
  expect({ ...stored, createdAt: stored.createdAt.toISOString() }).toEqual(
    result.body,
  );
});

it('accepts exact normalized title and description limits', async () => {
  const result = await create({
    ...input(),
    title: '  ' + 't'.repeat(60) + '  ',
    description: '\n' + 'd'.repeat(1000) + '\n',
  }).expect(201);
  expect(result.body.title).toHaveLength(60);
  expect(result.body.description).toHaveLength(1000);
});

it.each([
  ['empty title', { title: '' }],
  ['blank title', { title: '\t \n' }],
  ['long title', { title: 't'.repeat(61) }],
  ['numeric title', { title: 1 }],
  ['blank description', { description: '  \n' }],
  ['empty description', { description: '' }],
  ['long description', { description: 'd'.repeat(1001) }],
  ['null description', { description: null }],
  ['invalid UUID', { categoryId: 'TI' }],
  ['missing category', { categoryId: undefined }],
  ['unknown category', { categoryId: randomUUID() }],
])('rejects %s without inserting rows', async (_name, changes) => {
  const before = await count();
  await create({ ...input(), ...changes }).expect(400);
  expect(await count()).toBe(before);
});

it.each([
  'id',
  'code',
  'createdAt',
  'status',
  'requesterId',
  'userId',
  'extra',
])(
  'rejects the extra field %s and prevents owner assignment',
  async (field) => {
    const before = await count();
    await create({
      ...input(),
      [field]: field === 'requesterId' ? otherUserId : 'client-value',
    }).expect(400);
    expect(await count()).toBe(before);
  },
);

it('rejects missing required fields and non-object payloads', async () => {
  const before = await count();
  for (const body of [
    { description: 'x', categoryId },
    { title: 'x', categoryId },
    {},
    [],
  ])
    await create(body).expect(400);
  expect(await count()).toBe(before);
});

it('creates concurrent requests with distinct persisted codes and IDs', async () => {
  const before = await count();
  const responses = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      create({ ...input(), title: 'Concorrente ' + index }).expect(201),
    ),
  );
  expect(new Set(responses.map((result) => result.body.code)).size).toBe(12);
  expect(new Set(responses.map((result) => result.body.id)).size).toBe(12);
  expect(await count()).toBe(before + 12);
  for (const result of responses)
    expect(result.body).toMatchObject({
      requesterId: userId,
      status: 'OPEN',
      categoryId,
    });
});

it('publishes strict input and safe response schemas with cookie and CSRF requirements', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/docs-json')
    .expect(200);
  const operation = response.body.paths['/api/requests'].post;
  expect(operation.security).toEqual([{ cookie: [] }]);
  expect(operation.parameters).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'X-CSRF-Token',
        required: true,
        in: 'header',
      }),
    ]),
  );
  const body = operation.requestBody.content['application/json'].schema;
  expect(body.additionalProperties).toBe(false);
  expect(body.required).toEqual(['title', 'description', 'categoryId']);
  expect(body.properties.title.maxLength).toBe(60);
  expect(body.properties.description.maxLength).toBe(1000);
  expect(
    operation.responses['201'].content['application/json'].schema.$ref,
  ).toContain('RequestResponse');
});
