import assert from 'node:assert/strict'
import test from 'node:test'
import {
  requestSchema,
  loadRequestForm,
  editableFields,
} from '../src/features/requests/request-form.ts'
import { createMockServices } from '../src/services/mocks/create-mock-services.ts'

test('form validates trimmed required fields, exact limits and catalog membership', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  const schema = requestSchema(await services.categories.list())
  const input = {
    title: ' Título ',
    description: ' Descrição ',
    categoryId: 'ti',
  }
  assert.deepEqual(schema.parse(input), {
    ...input,
    title: 'Título',
    description: 'Descrição',
  })
  for (const field of ['title', 'description', 'categoryId']) {
    assert.equal(schema.safeParse({ ...input, [field]: '   ' }).success, false)
  }
  for (const [field, limit] of [
    ['title', 60],
    ['description', 1000],
  ]) {
    assert.equal(
      schema.safeParse({ ...input, [field]: 'x'.repeat(limit) }).success,
      true,
    )
    assert.equal(
      schema.safeParse({ ...input, [field]: 'x'.repeat(limit + 1) }).success,
      false,
    )
  }
  assert.equal(
    schema.safeParse({ ...input, categoryId: 'invalid' }).success,
    false,
  )
})

test('service enforces limits independently, creates OPEN and edits only mutable fields', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  const input = {
    title: ' Título ',
    description: ' Descrição ',
    categoryId: 'ti',
  }
  for (const [field, limit] of [
    ['title', 60],
    ['description', 1000],
  ])
    await assert.rejects(
      services.requests.create({ ...input, [field]: 'x'.repeat(limit + 1) }),
      { code: 'VALIDATION' },
    )
  const created = await services.requests.create(input)
  assert.equal(created.status, 'OPEN')
  assert.equal(created.requesterId, 'user-1')
  assert.equal(created.title, 'Título')
  const updated = await services.requests.update(created.id, {
    ...input,
    title: 'Alterado',
  })
  for (const field of ['id', 'code', 'createdAt', 'requesterId', 'status'])
    assert.equal(updated[field], created[field])
  assert.deepEqual(Object.keys(editableFields(created)).sort(), [
    'categoryId',
    'description',
    'title',
  ])
})

test('edit loading rejects missing, other owner, closed and inactive identity', async () => {
  const { services, controls } = createMockServices({ latencyMs: 0 })
  const loaded = await loadRequestForm(services, 'request-1')
  assert.equal(loaded.request.id, 'request-1')
  await assert.rejects(loadRequestForm(services, 'missing'), {
    code: 'NOT_FOUND',
  })
  controls.setCurrentUser('user-2')
  await assert.rejects(loadRequestForm(services, 'request-1'), {
    code: 'FORBIDDEN',
  })
  controls.setCurrentUser('user-1')
  await services.requests.changeStatus('request-1', 'IN_PROGRESS')
  await assert.rejects(loadRequestForm(services, 'request-1'), {
    code: 'CONFLICT',
  })
  await assert.rejects(
    services.requests.update('request-1', editableFields(loaded.request)),
    { code: 'CONFLICT' },
  )
  controls.setCurrentUser(null)
  await assert.rejects(loadRequestForm(services), { code: 'UNAUTHENTICATED' })
})

test('failed save leaves record intact and permits retry with the same input', async () => {
  const { services, controls } = createMockServices({ latencyMs: 0 })
  const before = await services.requests.get('request-1')
  const input = { ...editableFields(before), title: 'Correção' }
  controls.failNext('NETWORK')
  await assert.rejects(services.requests.update(before.id, input), {
    code: 'NETWORK',
  })
  assert.deepEqual(await services.requests.get(before.id), before)
  assert.equal(
    (await services.requests.update(before.id, input)).title,
    input.title,
  )
})
