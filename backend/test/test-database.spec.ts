import { testDatabaseUrl } from './support/test-database.js';

const safe =
  'postgresql://cubity_test:TEST_PRIVATE_PASSWORD@127.0.0.1:5433/cubity_support_test?schema=public';

it('accepts only dedicated local test connections without relying on DATABASE_URL', () => {
  for (const host of ['127.0.0.1', 'localhost', 'db-test'])
    expect(
      testDatabaseUrl({
        TEST_DATABASE_URL: safe.replace('127.0.0.1', host),
        DATABASE_URL: 'postgresql://production',
      }),
    ).toContain(host);
});

it.each([
  undefined,
  'invalid',
  safe.replace('postgresql:', 'https:'),
  safe.replace('cubity_support_test', 'cubity_support'),
  safe.replace('cubity_test:', 'cubity:'),
  safe.replace('127.0.0.1', 'database.example.com'),
  safe + '&host=database.example.com',
  safe + '&database=production',
  safe + '&user=admin',
  safe.replace('schema=public', 'schema=private'),
  safe + '#production',
])('rejects unsafe test connections without exposing credentials', (value) => {
  let failure: unknown;
  try {
    testDatabaseUrl({ TEST_DATABASE_URL: value });
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).not.toContain('TEST_PRIVATE_PASSWORD');
  expect((failure as Error).message).not.toContain('postgresql://');
});

it.each(['production', 'PRODUCTION'])(
  'refuses tests when NODE_ENV is %s',
  (NODE_ENV) => {
    expect(() =>
      testDatabaseUrl({ NODE_ENV, TEST_DATABASE_URL: safe }),
    ).toThrow('Banco de testes rejeitado');
  },
);
