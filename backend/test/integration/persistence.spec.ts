import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { compare, hash } from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedDemo } from '../../src/prisma/seed-demo.js';

const rollback = new Error('ROLLBACK_TEST_DATA');
let client: PrismaClient;
let userId: string;
let categoryId: string;

beforeAll(async () => {
  const rawUrl = process.env.TEST_DATABASE_URL;
  if (!rawUrl || process.env.NODE_ENV === 'production')
    throw new Error('Informe TEST_DATABASE_URL de testes.');
  const url = new URL(rawUrl);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.pathname !== '/cubity_support_test' ||
    url.username !== 'cubity_test' ||
    !['127.0.0.1', 'localhost', 'db-test'].includes(url.hostname)
  ) {
    throw new Error(
      'Banco de testes rejeitado: use cubity_support_test/cubity_test em host local ou db-test.',
    );
  }
  const deploy = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: rawUrl },
      encoding: 'utf8',
      timeout: 45000,
    },
  );
  if (deploy.status !== 0)
    throw new Error('Migrations do banco de testes falharam.');
  client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: rawUrl }),
  });
  const user = await client.user.create({
    data: {
      name: 'Integration',
      username: 'test.' + randomUUID(),
      passwordHash: await hash('test-password', 4),
    },
  });
  const category = await client.category.create({
    data: { name: 'Integration ' + randomUUID() },
  });
  userId = user.id;
  categoryId = category.id;
});

afterAll(async () => {
  if (!client) return;
  try {
    if (userId) {
      await client.request.deleteMany({ where: { requesterId: userId } });
      await client.user.delete({ where: { id: userId } });
    }
    if (categoryId) await client.category.delete({ where: { id: categoryId } });
  } finally {
    await client.$disconnect();
  }
});

const requestData = () => ({
  title: 'Teste de persistência',
  description: 'Descrição',
  requesterId: userId,
  categoryId,
});

it('seeds twice without duplicates and preserves existing identities and credentials', async () => {
  await expect(
    client.$transaction(
      async (tx) => {
        await seedDemo(tx);
        const ana = await tx.user.findUniqueOrThrow({
          where: { username: 'ana.demo' },
        });
        expect(await compare('demo123', ana.passwordHash)).toBe(true);
        const changedHash = await hash('changed-password', 4);
        await tx.user.update({
          where: { id: ana.id },
          data: { name: 'Preserved Name', passwordHash: changedHash },
        });
        await seedDemo(tx);
        const preserved = await tx.user.findUniqueOrThrow({
          where: { username: 'ana.demo' },
        });
        expect(preserved).toMatchObject({
          id: ana.id,
          name: 'Preserved Name',
          passwordHash: changedHash,
        });
        expect(
          await tx.user.count({
            where: { username: { in: ['ana.demo', 'bruno.demo'] } },
          }),
        ).toBe(2);
        expect(
          await tx.category.count({
            where: {
              name: {
                in: ['TI', 'RH', 'Compras', 'Financeiro', 'Infraestrutura'],
              },
            },
          }),
        ).toBe(5);
        throw rollback;
      },
      { timeout: 30000 },
    ),
  ).rejects.toBe(rollback);
});

it('assigns UUID, unique code, timestamp and OPEN under concurrent writes', async () => {
  const rows = await Promise.all(
    Array.from({ length: 20 }, () =>
      client.request.create({ data: requestData() }),
    ),
  );
  expect(new Set(rows.map((row) => row.code)).size).toBe(20);
  for (const row of rows) {
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.code).toMatch(/^SOL-\d{4,}$/);
    expect(row.status).toBe('OPEN');
    expect(row.createdAt).toBeInstanceOf(Date);
  }
});

it('rejects duplicate usernames, category names and request codes', async () => {
  const user = await client.user.findUniqueOrThrow({ where: { id: userId } });
  await expect(
    client.user.create({
      data: {
        name: 'Duplicate',
        username: user.username,
        passwordHash: user.passwordHash,
      },
    }),
  ).rejects.toMatchObject({ code: 'P2002' });
  const category = await client.category.findUniqueOrThrow({
    where: { id: categoryId },
  });
  await expect(
    client.category.create({ data: { name: category.name } }),
  ).rejects.toMatchObject({ code: 'P2002' });
  const original = await client.request.create({ data: requestData() });
  await expect(
    client.request.create({ data: { ...requestData(), code: original.code } }),
  ).rejects.toMatchObject({ code: 'P2002' });
});

it('enforces foreign keys and preserves referenced users/categories', async () => {
  await expect(
    client.request.create({
      data: { ...requestData(), categoryId: randomUUID() },
    }),
  ).rejects.toMatchObject({ code: 'P2003' });
  await expect(
    client.request.create({
      data: { ...requestData(), requesterId: randomUUID() },
    }),
  ).rejects.toMatchObject({ code: 'P2003' });
  await client.request.create({ data: requestData() });
  await expect(
    client.user.delete({ where: { id: userId } }),
  ).rejects.toMatchObject({ code: 'P2003' });
  await expect(
    client.category.delete({ where: { id: categoryId } }),
  ).rejects.toMatchObject({ code: 'P2003' });
});

it.each([
  { title: ' ' },
  { description: '\t\n ' },
  { title: 'a'.repeat(61) },
  { description: 'a'.repeat(1001) },
])('rejects invalid text %j at database level', async (invalid) => {
  await expect(
    client.request.create({ data: { ...requestData(), ...invalid } }),
  ).rejects.toThrow();
});

it('stores the session sid/json/expiration shape with indexed expiration', async () => {
  const sid = 'integration-' + randomUUID();
  await expect(
    client.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          sid,
          sess: { cookie: { originalMaxAge: 3600000 }, userId },
          expire: new Date(Date.now() + 3600000),
        },
      });
      const session = await tx.session.findUniqueOrThrow({ where: { sid } });
      expect(session.sess).toMatchObject({ userId });
      const indexes = await tx.$queryRaw<
        { indexname: string }[]
      >`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'session'`;
      expect(indexes.map((index) => index.indexname)).toContain(
        'IDX_session_expire',
      );
      throw rollback;
    }),
  ).rejects.toBe(rollback);
});

it('keeps codes unique beyond four digits without truncation', async () => {
  await client.$queryRaw`SELECT setval('public.request_code_seq', 10000, false)`;
  const first = await client.request.create({ data: requestData() });
  const second = await client.request.create({ data: requestData() });
  expect(first.code).toBe('SOL-10000');
  expect(second.code).toBe('SOL-10001');
});
