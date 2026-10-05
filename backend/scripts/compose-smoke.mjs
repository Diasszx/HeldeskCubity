import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath, URL, URLSearchParams } from 'node:url';

// This workflow restarts only the dedicated validation project, never the main stack.
assert.equal(
  process.env.COMPOSE_SMOKE,
  'validation',
  'Set COMPOSE_SMOKE=validation explicitly',
);
const origin = 'http://127.0.0.1:8081';
const root = fileURLToPath(new URL('../../', import.meta.url));
const composeArgs = [
  'compose',
  '-p',
  'cubity-compose-check',
  '-f',
  'compose.yaml',
  '-f',
  '.docker/validation.compose.yaml',
];
const env = { ...process.env, POSTGRES_PORT: '5434', APP_PORT: '8081' };

function docker(args, input) {
  const result = spawnSync('docker', [...composeArgs, ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    input,
    timeout: 180_000,
  });
  assert.equal(result.status, 0, `Compose ${args[0]} must succeed`);
  return result.stdout.trim();
}

function accountFingerprint() {
  return docker(
    [
      'exec',
      '-T',
      'db',
      'sh',
      '-c',
      'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At',
    ],
    'SELECT md5(string_agg(id::text || username || "passwordHash", \'\' ORDER BY id)) FROM "User";',
  );
}

async function ready() {
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      if (
        (
          await fetch(`${origin}/api/health`, {
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      )
        return;
    } catch {
      /* Containers can be restarting. */
    }
    await setTimeout(1000);
  }
  assert.fail('Proxy and API must become ready');
}

function session() {
  let cookie = '';
  async function request(path, { method = 'GET', body, expected = 200 } = {}) {
    const response = await fetch(`${origin}/api${path}`, {
      method,
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    for (const value of response.headers.getSetCookie())
      cookie = value.split(';')[0];
    assert.equal(
      response.status,
      expected,
      `${method} ${path} must return ${expected}`,
    );
    return response.status === 204 ? undefined : response.json();
  }
  async function mutate(path, method, body, expected = 200) {
    const { csrfToken } = await request('/auth/csrf');
    const response = await fetch(`${origin}/api${path}`, {
      method,
      headers: {
        Origin: origin,
        Cookie: cookie,
        'X-CSRF-Token': csrfToken,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    for (const value of response.headers.getSetCookie())
      cookie = value.split(';')[0];
    assert.equal(
      response.status,
      expected,
      `${method} ${path} must return ${expected}`,
    );
    return response.status === 204 ? undefined : response.json();
  }
  return { request, mutate, cookie: () => cookie };
}

await ready();
const ana = session();
const bruno = session();
try {
  console.log('Verificando proxy, SPA, sessão, CSRF e operações...');
  assert.equal((await fetch(`${origin}/requests`)).status, 200);
  assert.match(
    await (await fetch(`${origin}/requests`)).text(),
    /<div id="root">/,
  );
  await ana.request('/auth/me', { expected: 401 });
  await ana.mutate(
    '/auth/login',
    'POST',
    { username: 'ana.demo', password: 'wrong' },
    401,
  );
  const user = await ana.mutate('/auth/login', 'POST', {
    username: 'ana.demo',
    password: 'demo123',
  });
  const categories = await ana.request('/categories');
  const before = await ana.request('/dashboard');
  const title = `Compose ${randomBytes(6).toString('hex')} % _`;
  const input = {
    title,
    description: 'Fixture exclusiva da validação Compose.',
    categoryId: categories[0].id,
  };
  const created = await ana.mutate('/requests', 'POST', input, 201);
  assert.equal(created.requesterId, user.id);
  assert.equal(created.status, 'OPEN');
  const edited = await ana.mutate(`/requests/${created.id}`, 'PATCH', {
    ...input,
    description: 'Persistência após recriação.',
  });
  const day = created.createdAt.slice(0, 10);
  const query = new URLSearchParams({
    title: title.toUpperCase(),
    categoryId: input.categoryId,
    status: 'OPEN',
    startDate: day,
    endDate: day,
  });
  assert.deepEqual(
    (await ana.request(`/requests?${query}`)).map(({ id }) => id),
    [created.id],
  );
  const counts = await ana.request('/dashboard');
  assert.equal(counts.total, before.total + 1);
  assert.equal(counts.open, before.open + 1);
  await bruno.mutate('/auth/login', 'POST', {
    username: 'bruno.demo',
    password: 'demo123',
  });
  await bruno.mutate(`/requests/${created.id}`, 'PATCH', input, 403);
  await bruno.mutate(`/requests/${created.id}`, 'DELETE', undefined, 403);
  await bruno.mutate(
    `/requests/${created.id}/status`,
    'PATCH',
    { status: 'COMPLETED' },
    409,
  );
  const fingerprint = accountFingerprint();
  assert.match(fingerprint, /^[a-f0-9]{32}$/);
  const verifyPersistence = async () => {
    assert.equal((await ana.request('/auth/me')).id, user.id);
    assert.deepEqual(await ana.request(`/requests/${created.id}`), edited);
    assert.equal(
      accountFingerprint(),
      fingerprint,
      'Seed must preserve IDs and password hashes',
    );
  };
  console.log('Reiniciando banco, API e proxy; verificando dados e sessão...');
  docker(['restart', 'db', 'api', 'web']);
  await ready();
  await verifyPersistence();
  console.log(
    'Recriando containers e repetindo migrations/seed sem redefinir contas...',
  );
  docker(['up', '-d', '--force-recreate', '--wait', '--wait-timeout', '120']);
  await ready();
  await verifyPersistence();
  console.log('Executando down sem remover volume e iniciando novamente...');
  docker(['down']);
  docker(['up', '-d', '--wait', '--wait-timeout', '120']);
  await ready();
  await verifyPersistence();
  await bruno.mutate(`/requests/${created.id}/status`, 'PATCH', {
    status: 'IN_PROGRESS',
  });
  await ana.mutate(`/requests/${created.id}`, 'PATCH', input, 409);
  await bruno.mutate(`/requests/${created.id}/status`, 'PATCH', {
    status: 'COMPLETED',
  });
  const removable = await ana.mutate(
    '/requests',
    'POST',
    { ...input, title: 'Excluir fixture Compose' },
    201,
  );
  await ana.mutate(`/requests/${removable.id}`, 'DELETE', undefined, 204);
  await ana.request(`/requests/${removable.id}`, { expected: 404 });
  const after = await ana.request('/dashboard');
  assert.equal(after.total, before.total + 1);
  assert.equal(after.completed, before.completed + 1);
  assert.equal(after.total, after.open + after.inProgress + after.completed);
  const oldCookie = ana.cookie();
  await ana.mutate('/auth/logout', 'POST', undefined, 204);
  assert.equal(
    (await fetch(`${origin}/api/auth/me`, { headers: { Cookie: oldCookie } }))
      .status,
    401,
  );
  console.log(
    'Smoke Compose passou: fluxos, permissões, proxy, persistência, seed e logout.',
  );
} finally {
  for (const client of [ana, bruno]) {
    try {
      await client.mutate('/auth/logout', 'POST', undefined, 204);
    } catch {
      /* Already logged out or API unavailable. */
    }
  }
}
