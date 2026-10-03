import { spawnSync } from 'node:child_process';

export function testDatabaseUrl(
  environment: Record<string, string | undefined> = process.env,
) {
  const rejected = () =>
    new Error(
      'Banco de testes rejeitado: use banco e usuário exclusivos em host local ou db-test.',
    );
  if (
    environment.NODE_ENV?.toLowerCase() === 'production' ||
    !environment.TEST_DATABASE_URL
  )
    throw rejected();
  let url: URL;
  try {
    url = new URL(environment.TEST_DATABASE_URL);
  } catch {
    throw rejected();
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    url.pathname !== '/cubity_support_test' ||
    url.username !== 'cubity_test' ||
    !['127.0.0.1', 'localhost', 'db-test'].includes(url.hostname) ||
    url.hash ||
    [...url.searchParams].some(
      ([key, value]) => key !== 'schema' || value !== 'public',
    )
  )
    throw rejected();
  return environment.TEST_DATABASE_URL;
}

export function prepareTestDatabase() {
  const databaseUrl = testDatabaseUrl();
  const migration = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl },
      encoding: 'utf8',
      timeout: 45000,
    },
  );
  if (migration.status !== 0)
    throw new Error(
      'Preparo do banco de testes falhou; nenhum teste foi iniciado nesta suite.',
    );
  return databaseUrl;
}
