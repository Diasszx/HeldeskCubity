import 'reflect-metadata';
import { validateEnvironment } from '../src/config/environment.js';

const valid = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  SESSION_SECRET: 'a'.repeat(32),
};

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
