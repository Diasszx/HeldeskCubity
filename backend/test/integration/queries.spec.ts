import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { hash } from 'bcrypt';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type RequestStatus,
} from '../../src/generated/prisma/client.js';
import { validateEnvironment } from '../../src/config/environment.js';
import { setupApplication } from '../../src/setup.js';

let app: INestApplication;
let client: PrismaClient;
let agent: ReturnType<typeof request.agent>;
const users: string[] = [];
const categories: string[] = [];
const sessions = new Set<string>();
const fixtures = new Map<string, { id: string; status: RequestStatus }>();
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
    'queries-test-secret-with-at-least-thirty-two-characters';
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
  if (await client.request.count())
    throw new Error(
      'Este teste de dashboard exige o banco dedicado sem solicitações; não remove dados preexistentes.',
    );
  const password = 'queries-test-password';
  const username = 'queries.' + randomUUID();
  for (const login of [username, 'queries.other.' + randomUUID()]) {
    const user = await client.user.create({
      data: {
        name: 'Queries Integration',
        username: login,
        passwordHash: await hash(password, 4),
      },
    });
    users.push(user.id);
  }
  for (let index = 0; index < 2; index++) {
    const category = await client.category.create({
      data: { name: 'Queries ' + randomUUID() },
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
  await agent.get('/api/requests').expect(200, []);
  await agent
    .get('/api/dashboard')
    .expect(200, { total: 0, open: 0, inProgress: 0, completed: 0 });
  const rows: Array<[string, string, string, RequestStatus, number, number]> = [
    ['before', 'VPN antes', '2026-06-29T23:59:59.999Z', 'OPEN', 0, 0],
    ['first', 'Acesso VPN', '2026-06-30T00:00:00.000Z', 'OPEN', 0, 0],
    ['middle', 'VPN equipe', '2026-06-30T12:00:00.000Z', 'IN_PROGRESS', 0, 1],
    ['last', 'vpn final', '2026-06-30T23:59:59.999Z', 'COMPLETED', 1, 1],
    ['after', 'VPN depois', '2026-07-01T00:00:00.000Z', 'OPEN', 1, 0],
    ['offsetEarly', 'Offset início', '2026-06-30T00:30:00-03:00', 'OPEN', 1, 0],
    ['offsetLate', 'Offset fim', '2026-06-30T23:30:00-03:00', 'OPEN', 1, 0],
    ['percent', 'Taxa 100%', '2026-06-30T12:00:00.000Z', 'OPEN', 0, 0],
    ['underscore', 'item_A', '2026-06-30T12:00:00.000Z', 'OPEN', 0, 0],
    ['underscoreControl', 'itemBA', '2026-06-30T12:00:00.000Z', 'OPEN', 0, 0],
    ['slash', 'pasta\\financeiro', '2026-06-30T12:00:00.000Z', 'OPEN', 0, 0],
  ];
  for (const [key, title, createdAt, status, category, owner] of rows) {
    const stored = await client.request.create({
      data: {
        title,
        description: 'Queries fixture',
        createdAt: new Date(createdAt),
        status,
        categoryId: categories[category],
        requesterId: users[owner],
      },
    });
    fixtures.set(key, { id: stored.id, status });
  }
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

const list = (query: Record<string, string | undefined> = {}) =>
  agent.get('/api/requests').query(query);
const id = (key: string) => fixtures.get(key)!.id;
const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id).sort();
const expected = (...keys: string[]) => keys.map(id).sort();

it('requires session for list, detail and global indicators', async () => {
  for (const path of [
    '/api/requests',
    '/api/requests/' + id('first'),
    '/api/dashboard',
  ])
    await request(app.getHttpServer()).get(path).expect(401);
});

it('lists requests from every owner with stable ordering and safe public fields', async () => {
  const result = await list().expect(200);
  expect(ids(result.body)).toEqual(expected(...fixtures.keys()));
  expect(
    new Set(result.body.map((row: { requesterId: string }) => row.requesterId))
      .size,
  ).toBe(2);
  const sorted = [...result.body].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );
  expect(result.body).toEqual(sorted);
  for (const row of result.body)
    expect(Object.keys(row).sort()).toEqual([
      'categoryId',
      'code',
      'createdAt',
      'description',
      'id',
      'requesterId',
      'status',
      'title',
    ]);
});

it('matches partial title without distinguishing case and trims the search', async () => {
  const result = await list({ title: '  vPn  ' }).expect(200);
  expect(ids(result.body)).toEqual(
    expected('before', 'first', 'middle', 'last', 'after'),
  );
});

it.each([
  ['%', 'percent'],
  ['_', 'underscore'],
  ['\\', 'slash'],
])(
  'searches the literal character %s instead of SQL wildcards',
  async (title, key) => {
    const result = await list({ title }).expect(200);
    expect(ids(result.body)).toEqual(expected(key));
  },
);

it('filters category and status individually', async () => {
  const byCategory = await list({ categoryId: categories[1] }).expect(200);
  expect(ids(byCategory.body)).toEqual(
    expected('last', 'after', 'offsetEarly', 'offsetLate'),
  );
  const byStatus = await list({ status: 'IN_PROGRESS' }).expect(200);
  expect(ids(byStatus.body)).toEqual(expected('middle'));
});

it('includes both UTC day boundaries and excludes adjacent days', async () => {
  const result = await list({
    startDate: '2026-06-30',
    endDate: '2026-06-30',
  }).expect(200);
  expect(ids(result.body)).toEqual(
    expected(
      'first',
      'middle',
      'last',
      'offsetEarly',
      'percent',
      'underscore',
      'underscoreControl',
      'slash',
    ),
  );
});

it('supports each date boundary separately', async () => {
  const start = await list({ startDate: '2026-07-01' }).expect(200);
  expect(ids(start.body)).toEqual(expected('after', 'offsetLate'));
  const end = await list({ endDate: '2026-06-29' }).expect(200);
  expect(ids(end.body)).toEqual(expected('before'));
});

it('combines all filters using AND', async () => {
  const result = await list({
    title: 'vpn',
    categoryId: categories[0],
    status: 'IN_PROGRESS',
    startDate: '2026-06-30',
    endDate: '2026-06-30',
  }).expect(200);
  expect(ids(result.body)).toEqual(expected('middle'));
});

it('returns an empty array for no matches and ignores empty filter values', async () => {
  await list({ title: 'sem-correspondência-' + randomUUID() }).expect(200, []);
  const result = await list({
    title: '  ',
    categoryId: '',
    status: '',
    startDate: '',
    endDate: '',
  }).expect(200);
  expect(ids(result.body)).toEqual(expected(...fixtures.keys()));
});

it.each([
  { startDate: '2026-02-29' },
  { endDate: '2026-04-31' },
  { startDate: '2026-13-01' },
  { startDate: '2026-6-01' },
  { startDate: '2026-06-30T00:00:00Z' },
  { startDate: '0000-01-01' },
  { startDate: '2026-07-01', endDate: '2026-06-30' },
  { categoryId: 'invalid' },
  { categoryId: randomUUID() },
  { status: 'CLOSED' },
  { requesterId: randomUUID() },
  { page: '1' },
])('rejects invalid or unsupported filters %j', async (query) => {
  const result = await list(query).expect(400);
  expect(result.body.code).toBe('VALIDATION');
});

it('rejects repeated query values instead of coercing them to strings', async () => {
  await agent.get('/api/requests?status=OPEN&status=COMPLETED').expect(400);
  await agent.get('/api/requests?title=VPN&title=other').expect(400);
});

it('handles a leap day and the supported four-digit date extremes', async () => {
  await list({ startDate: '2024-02-29', endDate: '2024-02-29' }).expect(
    200,
    [],
  );
  const all = await list({
    startDate: '0001-01-01',
    endDate: '9999-12-31',
  }).expect(200);
  expect(ids(all.body)).toEqual(expected(...fixtures.keys()));
});

it('returns other owners details, 404 for absence and 400 for malformed IDs', async () => {
  const result = await agent.get('/api/requests/' + id('middle')).expect(200);
  const stored = await client.request.findUniqueOrThrow({
    where: { id: id('middle') },
  });
  expect(result.body).toEqual({
    ...stored,
    createdAt: stored.createdAt.toISOString(),
  });
  await agent.get('/api/requests/' + randomUUID()).expect(404);
  await agent.get('/api/requests/not-a-uuid').expect(400);
});

it('keeps global dashboard independent from list filters and consistent after status changes', async () => {
  const before = await client.request.findMany({ orderBy: { id: 'asc' } });
  const listResult = await list({
    status: 'COMPLETED',
    categoryId: categories[1],
  }).expect(200);
  expect(listResult.body).toHaveLength(1);
  await agent
    .get('/api/dashboard')
    .expect(200, { total: 11, open: 9, inProgress: 1, completed: 1 });
  await agent.get('/api/dashboard?status=OPEN').expect(400);
  expect(await client.request.findMany({ orderBy: { id: 'asc' } })).toEqual(
    before,
  );
  await client.request.update({
    where: { id: id('first') },
    data: { status: 'IN_PROGRESS' },
  });
  const changed = await agent
    .get('/api/dashboard')
    .expect(200, { total: 11, open: 8, inProgress: 2, completed: 1 });
  expect(changed.body.total).toBe(
    changed.body.open + changed.body.inProgress + changed.body.completed,
  );
  await client.request.update({
    where: { id: id('first') },
    data: { status: 'OPEN' },
  });
});

it('documents date filters, detail and global dashboard without new query contracts', async () => {
  const result = await request(app.getHttpServer())
    .get('/api/docs-json')
    .expect(200);
  const queries = result.body.paths['/api/requests'].get.parameters;
  expect(
    queries.map((parameter: { name: string }) => parameter.name).sort(),
  ).toEqual(['categoryId', 'endDate', 'startDate', 'status', 'title']);
  expect(
    queries.find((parameter: { name: string }) => parameter.name === 'endDate')
      .description,
  ).toContain('UTC');
  expect(
    result.body.paths['/api/requests/{id}'].get.responses['404'],
  ).toBeDefined();
  expect(result.body.paths['/api/dashboard'].get.security).toEqual([
    { cookie: [] },
  ]);
});

it('returns four zeros and an empty list after removing only its own fixtures', async () => {
  await client.request.deleteMany({
    where: { id: { in: [...fixtures.values()].map((row) => row.id) } },
  });
  await list().expect(200, []);
  await agent
    .get('/api/dashboard')
    .expect(200, { total: 0, open: 0, inProgress: 0, completed: 0 });
});
