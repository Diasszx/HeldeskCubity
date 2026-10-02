import assert from 'node:assert/strict'
import test from 'node:test'
import {
  availableRequestActions,
  loadRequestDetails,
  requestError,
} from '../src/features/requests/request-details.ts'
import { createMockServices } from '../src/services/mocks/create-mock-services.ts'

test('details resolve names, full text, code, date and current identity', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  const details = await loadRequestDetails(services, 'request-1')
  assert.equal(details.categoryName, 'TI')
  assert.equal(details.requesterName, 'Ana Silva')
  assert.equal(details.currentUser.id, 'user-1')
  assert.equal(details.request.code, 'SOL-0001')
  assert.match(details.openedAt, /28\/09\/2026/)
  assert.ok(details.request.description.length)
  const missingNames = await loadRequestDetails(
    {
      ...services,
      categories: { list: async () => [] },
      users: { ...services.users, list: async () => [] },
    },
    'request-1',
  )
  assert.equal(missingNames.categoryName, 'Categoria indisponível')
  assert.equal(missingNames.requesterName, 'Solicitante indisponível')
})

test('actions permit only sequential status changes and owner OPEN edit or delete', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  const request = await services.requests.get('request-1')
  const [owner, other] = await services.users.list()
  for (const user of [owner, other, null]) {
    for (const [status, nextStatus] of [
      ['OPEN', 'IN_PROGRESS'],
      ['IN_PROGRESS', 'COMPLETED'],
      ['COMPLETED', null],
    ]) {
      const actions = availableRequestActions({ ...request, status }, user)
      assert.equal(actions.nextStatus, user ? nextStatus : null)
      assert.equal(actions.editable, user === owner && status === 'OPEN')
      assert.equal(actions.removable, actions.editable)
    }
  }
})

test('other authenticated user can attend but cannot delete; completion prevents reopen', async () => {
  const { services, controls } = createMockServices({ latencyMs: 0 })
  controls.setCurrentUser('user-2')
  await assert.rejects(services.requests.remove('request-1'), {
    code: 'FORBIDDEN',
  })
  await assert.rejects(
    services.requests.changeStatus('request-1', 'COMPLETED'),
    { code: 'CONFLICT' },
  )
  assert.equal(
    (await services.requests.changeStatus('request-1', 'IN_PROGRESS')).status,
    'IN_PROGRESS',
  )
  assert.equal(
    (await services.requests.changeStatus('request-1', 'COMPLETED')).status,
    'COMPLETED',
  )
  await assert.rejects(services.requests.changeStatus('request-1', 'OPEN'), {
    code: 'CONFLICT',
  })
  controls.setCurrentUser('user-1')
  await assert.rejects(services.requests.remove('request-1'), {
    code: 'CONFLICT',
  })
})

test('missing requests and inactive identity surface errors; transient failures permit retry', async () => {
  const { services, controls } = createMockServices({ latencyMs: 0 })
  await assert.rejects(loadRequestDetails(services, 'missing'), {
    code: 'NOT_FOUND',
  })
  controls.failNext('NETWORK')
  await assert.rejects(loadRequestDetails(services, 'request-1'), {
    code: 'NETWORK',
  })
  assert.equal(
    (await loadRequestDetails(services, 'request-1')).request.status,
    'OPEN',
  )
  controls.setCurrentUser(null)
  await assert.rejects(loadRequestDetails(services, 'request-1'), {
    code: 'UNAUTHENTICATED',
  })
  assert.deepEqual(requestError(new Error('Unexpected')), {
    code: 'NETWORK',
    message: 'Unexpected',
  })
})

test('failed delete preserves record and confirmed service delete removes it from listing', async () => {
  const { services, controls } = createMockServices({ latencyMs: 0 })
  const before = await services.requests.get('request-1')
  controls.failNext('NETWORK')
  await assert.rejects(services.requests.remove(before.id), { code: 'NETWORK' })
  assert.deepEqual(await services.requests.get(before.id), before)
  await services.requests.remove(before.id)
  assert.equal(
    (await services.requests.list()).some(
      (request) => request.id === before.id,
    ),
    false,
  )
  await assert.rejects(loadRequestDetails(services, before.id), {
    code: 'NOT_FOUND',
  })
})
