import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

const backend = fileURLToPath(new URL('../', import.meta.url));
const base = {
  ...process.env,
  NODE_ENV: 'production',
  HOSTING_PLATFORM: 'render',
  RENDER: 'true',
  RENDER_EXTERNAL_HOSTNAME: 'release-test.onrender.com',
  RENDER_EXTERNAL_URL: 'https://release-test.onrender.com',
  APP_ORIGIN: 'https://release-test.onrender.com',
  TRUSTED_PROXY_IPS: '',
  DATABASE_URL:
    'postgresql://test:PRIVATE_SENTINEL@127.0.0.1:1/unavailable?sslmode=require&connect_timeout=2',
  DATABASE_MIGRATION_URL:
    'postgresql://test:PRIVATE_SENTINEL@127.0.0.1:1/unavailable?sslmode=require&connect_timeout=2',
  SESSION_SECRET: 'release-test-secret-at-least-thirty-two-characters',
  OBSERVE_ENABLED: 'false',
  FRONTEND_DIST: '../frontend/dist',
};
function run(environment) {
  return spawnSync(process.execPath, ['scripts/render-start.mjs'], {
    cwd: backend,
    env: { ...base, ...environment },
    encoding: 'utf8',
    timeout: 150000,
  });
}
function blocked(result) {
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Inicialização Render bloqueada/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /PRIVATE_SENTINEL|Nest application successfully started/,
  );
}
test('invalid platform configuration stops before migrations', () => {
  const result = run({ RENDER: 'false' });
  blocked(result);
  assert.doesNotMatch(result.stdout, /Aplicando migrations/);
});
test('missing frontend build stops before migrations', () => {
  const root = mkdtempSync(join(tmpdir(), 'cubity-release-'));
  try {
    const result = run({ FRONTEND_DIST: root });
    blocked(result);
    assert.doesNotMatch(result.stdout, /Aplicando migrations/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test(
  'failed migrations stop the API without leaking the database URL',
  { timeout: 155000 },
  () => {
    const result = run({});
    blocked(result);
    assert.match(result.stdout, /Aplicando migrations/);
  },
);
