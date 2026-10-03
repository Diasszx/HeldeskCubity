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
