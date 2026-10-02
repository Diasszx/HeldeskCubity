import assert from 'node:assert/strict'
import test from 'node:test'
import { createMockServices } from '../src/services/mocks/create-mock-services.ts'
import { createSessionServices } from '../src/services/session-services.ts'
import {
  loginSchema,
  loginDestination,
} from '../src/features/auth/login-schema.ts'

test('login requires fields, trims username but preserves password, and limits return destinations', () => {
  assert.deepEqual(
    loginSchema.parse({ username: ' ana.demo ', password: ' demo123 ' }),
    { username: 'ana.demo', password: ' demo123 ' },
  )
  assert.equal(
    loginSchema.safeParse({ username: '  ', password: '' }).success,
    false,
  )
  assert.equal(
    loginDestination('/requests/request-1/edit?tab=info#title'),
    '/requests/request-1/edit?tab=info#title',
  )
  for (const value of [
    'https://example.com',
    '//example.com',
    '/login',
    '/requests/../../login',
    '/requests\\example.com',
    null,
  ])
    assert.equal(loginDestination(value), '/dashboard')
})

test('invalid credentials do not establish identity; valid login selects the user and logout revokes access', async () => {
  const { services } = createMockServices({ latencyMs: 0, currentUserId: null })
  assert.equal(await services.users.current(), null)
  await assert.rejects(
    services.auth.login({ username: 'ana.demo', password: 'wrong' }),
    { code: 'UNAUTHENTICATED' },
  )
  assert.equal(await services.users.current(), null)
  assert.equal(
    (await services.auth.login({ username: ' ana.demo ', password: 'demo123' }))
      .id,
    'user-1',
  )
  assert.equal((await services.users.current()).id, 'user-1')
  await services.auth.logout()
  assert.equal(await services.users.current(), null)
  await assert.rejects(services.requests.list(), { code: 'UNAUTHENTICATED' })
  assert.equal(
    (await services.auth.login({ username: 'bruno.demo', password: 'demo123' }))
      .id,
    'user-2',
  )
})

test('network failures preserve session during logout and allow login retry', async () => {
  const { services, controls } = createMockServices({
    latencyMs: 0,
    currentUserId: null,
  })
  controls.failNext('NETWORK')
  await assert.rejects(
    services.auth.login({ username: 'ana.demo', password: 'demo123' }),
    { code: 'NETWORK' },
  )
  assert.equal(await services.users.current(), null)
  await services.auth.login({ username: 'ana.demo', password: 'demo123' })
  controls.failNext('NETWORK')
  await assert.rejects(services.auth.logout(), { code: 'NETWORK' })
  assert.equal((await services.users.current()).id, 'user-1')
  await services.auth.logout()
  assert.equal(await services.users.current(), null)
})

test('resource 401 notifies session subscribers; network and invalid login do not, and unsubscribe works', async () => {
  const mock = createMockServices({ latencyMs: 0, currentUserId: null })
  const adapter = createSessionServices(mock.services)
  let events = 0
  const unsubscribe = adapter.subscribe(() => events++)
  await assert.rejects(
    adapter.services.auth.login({ username: 'missing', password: 'wrong' }),
  )
  assert.equal(events, 0)
  mock.controls.failNext('NETWORK')
  await assert.rejects(adapter.services.requests.list())
  assert.equal(events, 0)
  await assert.rejects(adapter.services.requests.list(), {
    code: 'UNAUTHENTICATED',
  })
  assert.equal(events, 1)
  unsubscribe()
  await assert.rejects(adapter.services.categories.list())
  assert.equal(events, 1)
})
