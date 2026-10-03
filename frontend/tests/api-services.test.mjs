import assert from 'node:assert/strict'
import test from 'node:test'
import { createHttpClient } from '../src/services/http-client.ts'
import { createApiServices } from '../src/services/api-services.ts'
import { createSessionServices } from '../src/services/session-services.ts'

const nonce = 'a'.repeat(64)
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status })

function transport(responder) {
  const calls = []
  const client = createHttpClient({
    fetch: async (url, init) => {
      calls.push({ url, ...init })
      assert.equal(init.credentials, 'include')
      assert.equal(init.headers.Accept, 'application/json')
      return responder(url, init)
    },
  })
  return { calls, services: createApiServices(client) }
}

test('anonymous bootstrap returns null only for 401; failures remain visible', async () => {
  const { services } = transport(() => json({}, 401))
  assert.equal(await services.users.current(), null)
  const failed = transport(() => json({}, 500))
  await assert.rejects(failed.services.users.current(), {
    code: 'INTERNAL_ERROR',
  })
})

test('login, writes and logout use current-session CSRF, including nonce rotation and 204', async () => {
  let currentNonce = nonce
  const { services, calls } = transport((url, init) => {
    if (url === '/api/auth/csrf') return json({ csrfToken: currentNonce })
    assert.equal(init.headers['X-CSRF-Token'], currentNonce)
    if (url === '/api/auth/login') {
      assert.deepEqual(JSON.parse(init.body), {
        username: 'ana.demo',
        password: ' demo123 ',
      })
      currentNonce = 'b'.repeat(64)
      return json({ id: 'ana', name: 'Ana', username: 'ana.demo' })
    }
    return new Response(null, { status: 204 })
  })
  await services.auth.login({
    username: 'ana.demo',
    password: ' demo123 ',
    unexpected: true,
  })
  await services.requests.remove('request/id')
  await services.auth.logout()
  assert.deepEqual(
    calls.map(({ url, method = 'GET' }) => [url, method]),
    [
      ['/api/auth/csrf', 'GET'],
      ['/api/auth/login', 'POST'],
      ['/api/auth/csrf', 'GET'],
      ['/api/requests/request%2Fid', 'DELETE'],
      ['/api/auth/csrf', 'GET'],
      ['/api/auth/logout', 'POST'],
    ],
  )
  assert.equal(calls[3].body, undefined)
})

test('catalogs, detail and global dashboard call their own endpoints', async () => {
  const { services, calls } = transport(() => json([]))
  await services.users.list()
  await services.categories.list()
  await services.requests.get('abc')
  await services.dashboard.indicators()
  assert.deepEqual(
    calls.map(({ url }) => url),
    ['/api/users', '/api/categories', '/api/requests/abc', '/api/dashboard'],
  )
})

test('filter query preserves literal special characters and UTC dates, omitting empty or unknown fields', async () => {
  const { services, calls } = transport(() => json([]))
  await services.requests.list({
    title: '100% & a_b + ação',
    categoryId: '',
    status: 'OPEN',
    startDate: '2026-10-03',
    endDate: '2026-10-03',
    unexpected: 'bad',
  })
  const params = new URL(calls[0].url, 'http://localhost').searchParams
  assert.deepEqual(Object.fromEntries(params), {
    title: '100% & a_b + ação',
    status: 'OPEN',
    startDate: '2026-10-03',
    endDate: '2026-10-03',
  })
  await services.requests.list()
  assert.equal(calls[1].url, '/api/requests')
})

test('create and edit whitelist editable fields; transition sends only status', async () => {
  const { services, calls } = transport((url) =>
    json(url.endsWith('/csrf') ? { csrfToken: nonce } : {}),
  )
  const input = {
    title: 'Título',
    description: 'Descrição',
    categoryId: 'category',
    requesterId: 'forged',
    createdAt: 'forged',
    status: 'COMPLETED',
    code: 'forged',
  }
  await services.requests.create(input)
  await services.requests.update('abc', input)
  await services.requests.changeStatus('abc', 'IN_PROGRESS')
  const writes = calls.filter(({ method }) => method)
  for (const write of writes.slice(0, 2))
    assert.deepEqual(JSON.parse(write.body), {
      title: 'Título',
      description: 'Descrição',
      categoryId: 'category',
    })
  assert.deepEqual(JSON.parse(writes[2].body), { status: 'IN_PROGRESS' })
  assert.deepEqual(
    writes.map(({ method }) => method),
    ['POST', 'PATCH', 'PATCH'],
  )
})

test('HTTP failures are mapped safely, without exposing server HTML or retrying writes', async () => {
  for (const [status, code] of [
    [400, 'VALIDATION'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [500, 'INTERNAL_ERROR'],
    [502, 'INTERNAL_ERROR'],
  ]) {
    const { services, calls } = transport((url) =>
      url.endsWith('/csrf')
        ? json({ csrfToken: nonce })
        : new Response('<secret>database stack trace</secret>', { status }),
    )
    await assert.rejects(
      services.requests.remove('abc'),
      (error) => error.code === code && !error.message.includes('secret'),
    )
    assert.equal(calls.length, 2)
  }
})

test('invalid JSON or CSRF responses prevent successful operations', async () => {
  const invalid = transport(() => new Response('<html>unavailable</html>'))
  await assert.rejects(invalid.services.users.list(), {
    code: 'INTERNAL_ERROR',
  })
  for (const body of [null, {}, { csrfToken: 'invalid' }]) {
    const { services, calls } = transport(() => json(body))
    await assert.rejects(services.requests.remove('abc'), {
      code: 'INTERNAL_ERROR',
    })
    assert.equal(calls.length, 1)
  }
})

test('network failure and timeout are actionable errors; a write is never retried', async () => {
  let attempts = 0
  const offline = createApiServices(
    createHttpClient({
      fetch: async () => {
        attempts++
        throw new TypeError('fetch failed')
      },
    }),
  )
  await assert.rejects(
    offline.auth.login({ username: 'ana', password: 'secret' }),
    { code: 'NETWORK' },
  )
  assert.equal(attempts, 1)
  const slow = createApiServices(
    createHttpClient({
      timeoutMs: 10,
      fetch: (_url, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    }),
  )
  await assert.rejects(slow.users.list(), { code: 'NETWORK' })
})

test('401 on protected API calls notifies session expiry; login failure does not', async () => {
  const { services } = transport((url) =>
    url.endsWith('/csrf') ? json({ csrfToken: nonce }) : json({}, 401),
  )
  const adapter = createSessionServices(services)
  let expired = 0
  const unsubscribe = adapter.subscribe(() => expired++)
  await assert.rejects(
    adapter.services.auth.login({ username: 'ana', password: 'wrong' }),
    { code: 'UNAUTHENTICATED' },
  )
  assert.equal(expired, 0)
  await assert.rejects(adapter.services.dashboard.indicators(), {
    code: 'UNAUTHENTICATED',
  })
  assert.equal(expired, 1)
  unsubscribe()
  await assert.rejects(adapter.services.requests.list(), {
    code: 'UNAUTHENTICATED',
  })
  assert.equal(expired, 1)
})
