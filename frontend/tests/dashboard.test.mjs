import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countRequests,
  loadIndicators,
} from '../src/features/dashboard/indicators.ts'
import { createMockServices } from '../src/services/mocks/create-mock-services.ts'

test('empty dataset yields four zero counts and fixtures sum to total', async () => {
  assert.deepEqual(countRequests([]), {
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
  })
  const { services } = createMockServices({ latencyMs: 0 })
  assert.deepEqual(await loadIndicators(services), {
    total: 3,
    open: 1,
    inProgress: 1,
    completed: 1,
  })
})

test('dashboard uses global indicators independently of filtered lists', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  assert.equal(
    (await services.requests.list({ status: 'OPEN', title: 'acesso' })).length,
    1,
  )
  const observed = {
    ...services,
    requests: {
      ...services.requests,
      list: async () => {
        assert.fail('Dashboard must not download the requests list')
      },
    },
  }
  assert.equal((await loadIndicators(observed)).total, 3)
})

test('reloading indicators reflects create, transitions and delete without changing total invariant', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  const created = await services.requests.create({
    title: 'Nova demanda',
    description: 'Descrição',
    categoryId: 'ti',
  })
  assert.deepEqual(await loadIndicators(services), {
    total: 4,
    open: 2,
    inProgress: 1,
    completed: 1,
  })
  await services.requests.changeStatus(created.id, 'IN_PROGRESS')
  assert.deepEqual(await loadIndicators(services), {
    total: 4,
    open: 1,
    inProgress: 2,
    completed: 1,
  })
  await services.requests.changeStatus(created.id, 'COMPLETED')
  assert.deepEqual(await loadIndicators(services), {
    total: 4,
    open: 1,
    inProgress: 1,
    completed: 2,
  })
  await services.requests.remove('request-1')
  assert.deepEqual(await loadIndicators(services), {
    total: 3,
    open: 0,
    inProgress: 1,
    completed: 2,
  })
})

test('service failure surfaces and retry recovers; expired identity does not return zero totals', async () => {
  const { services, controls } = createMockServices({ latencyMs: 0 })
  controls.failNext('NETWORK')
  await assert.rejects(loadIndicators(services), { code: 'NETWORK' })
  assert.equal((await loadIndicators(services)).total, 3)
  controls.setCurrentUser(null)
  await assert.rejects(loadIndicators(services), { code: 'UNAUTHENTICATED' })
})
