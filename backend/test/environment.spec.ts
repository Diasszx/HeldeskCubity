import 'reflect-metadata';
import { validateEnvironment } from '../src/config/environment.js';
import { renderMigrationUrl } from '../src/hosting/database-url.js';

const valid = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  SESSION_SECRET: 'a'.repeat(32),
};

it('translates pg verify-full to Prisma TLS with strict certificate verification', () => {
  const url = new URL(
    renderMigrationUrl(
      'postgresql://test:test@db.example/test?sslmode=verify-full&schema=public&sslaccept=accept_invalid_certs',
    ),
  );
  expect(url.searchParams.get('sslmode')).toBe('require');
  expect(url.searchParams.get('sslaccept')).toBe('strict');
  expect(url.searchParams.get('schema')).toBe('public');
});

const render = {
  ...valid,
  NODE_ENV: 'production',
  HOSTING_PLATFORM: 'render',
  RENDER: 'true',
  RENDER_EXTERNAL_HOSTNAME: 'cubity-test.onrender.com',
  RENDER_EXTERNAL_URL: 'https://cubity-test.onrender.com',
  FRONTEND_DIST: '../frontend/dist',
  DATABASE_URL: 'postgresql://test:test@db.example/test?sslmode=require',
};

it('derives the Render origin from platform environment and requires TLS database URLs', () => {
  expect(validateEnvironment(render)).toMatchObject({
    APP_ORIGIN: render.RENDER_EXTERNAL_URL,
  });
  expect(
    validateEnvironment({
      ...render,
      DATABASE_MIGRATION_URL: render.DATABASE_URL,
    }),
  ).toMatchObject({
    DATABASE_MIGRATION_URL: render.DATABASE_URL,
  });
});

it.each([
  ['RENDER', 'false'],
  ['NODE_ENV', 'development'],
  ['HOSTING_PLATFORM', 'other'],
  ['RENDER_EXTERNAL_HOSTNAME', 'attacker.test'],
  ['RENDER_EXTERNAL_URL', 'http://cubity-test.onrender.com'],
  ['APP_ORIGIN', 'https://attacker.test'],
  ['TRUSTED_PROXY_IPS', '127.0.0.1'],
  ['FRONTEND_DIST', ''],
  ['DATABASE_URL', valid.DATABASE_URL],
  ['DATABASE_MIGRATION_URL', valid.DATABASE_URL],
])('rejects unsafe Render setting %s', (key, value) => {
  expect(() => validateEnvironment({ ...render, [key]: value })).toThrow(key);
});

describe('Environment', () => {
  it('coerces port and supplies defaults', () => {
    expect(validateEnvironment({ ...valid, PORT: '3010' })).toMatchObject({
      PORT: 3010,
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
    });
  });
  it.each(['DATABASE_URL', 'SESSION_SECRET', 'PORT', 'NODE_ENV'])(
    'rejects invalid %s without exposing values',
    (key) => {
      const secret = 'PRIVATE_INPUT_SENTINEL';
      expect(() => validateEnvironment({ ...valid, [key]: secret })).toThrow(
        key,
      );
      try {
        validateEnvironment({ ...valid, [key]: secret });
      } catch (error) {
        expect((error as Error).message).not.toContain(secret);
        expect((error as Error).message).not.toContain(valid.DATABASE_URL);
      }
    },
  );
});

it('defines rolling session defaults and validates explicit trusted proxy IPs', () => {
  expect(validateEnvironment(valid)).toMatchObject({
    SESSION_TTL_SECONDS: 28800,
    APP_ORIGIN: 'http://127.0.0.1:3000',
    TRUSTED_PROXY_IPS: [],
  });
  expect(
    validateEnvironment({
      ...valid,
      TRUSTED_PROXY_IPS: '127.0.0.1, ::1',
      SESSION_TTL_SECONDS: '3600',
    }),
  ).toMatchObject({
    TRUSTED_PROXY_IPS: ['127.0.0.1', '::1'],
    SESSION_TTL_SECONDS: 3600,
  });
  for (const value of ['true', '*', '1', 'loopback'])
    expect(() =>
      validateEnvironment({ ...valid, TRUSTED_PROXY_IPS: value }),
    ).toThrow('TRUSTED_PROXY_IPS');
});

it('rejects production HTTP origins and public secret placeholders', () => {
  expect(() =>
    validateEnvironment({ ...valid, NODE_ENV: 'production' }),
  ).toThrow('APP_ORIGIN');
  expect(() =>
    validateEnvironment({
      ...valid,
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://portal.test',
      SESSION_SECRET: 'replace-with-a-random-secret-at-least-32-characters',
    }),
  ).toThrow('SESSION_SECRET');
  expect(
    validateEnvironment({
      ...valid,
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://portal.test',
    }).APP_ORIGIN,
  ).toBe('https://portal.test');
  expect(() =>
    validateEnvironment({ ...valid, APP_ORIGIN: 'https://portal.test/path' }),
  ).toThrow('APP_ORIGIN');
  expect(() =>
    validateEnvironment({ ...valid, SESSION_TTL_SECONDS: '0' }),
  ).toThrow('SESSION_TTL_SECONDS');
});
