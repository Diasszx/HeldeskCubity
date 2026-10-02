import assert from 'node:assert/strict'
import test from 'node:test'
import { createMockServices } from '../src/services/mocks/create-mock-services.ts'
import { ServiceError } from '../src/services/service-error.ts'

const input = {
  title: ' Nova demanda ',
  description: ' Descrição da demanda ',
  categoryId: 'rh',
}
const setup = () =>
  createMockServices({
    latencyMs: 0,
    now: () => new Date('2026-10-02T10:30:00.000Z'),
  })
const error = (code) => (value) =>
  value instanceof ServiceError && value.code === code

test('fixtures include two users, five categories and all three statuses', async () => {
  const { services } = setup()
  assert.equal((await services.users.list()).length, 2)
  assert.deepEqual(
    (await services.categories.list()).map((category) => category.name),
    ['TI', 'RH', 'Compras', 'Financeiro', 'Infraestrutura'],
  )
  assert.deepEqual(
    new Set((await services.requests.list()).map((request) => request.status)),
    new Set(['OPEN', 'IN_PROGRESS', 'COMPLETED']),
  )
})

test('create, update and remove retain changes and protect automatic fields', async () => {
  const { services } = setup()
  const created = await services.requests.create({
    ...input,
    requesterId: 'user-2',
    status: 'COMPLETED',
    code: 'forged',
    createdAt: 'forged',
  })
  assert.equal(created.title, 'Nova demanda')
  assert.equal(created.description, 'Descrição da demanda')
  assert.equal(created.requesterId, 'user-1')
  assert.equal(created.status, 'OPEN')
  assert.equal(created.createdAt, '2026-10-02T10:30:00.000Z')
  assert.equal(created.code, 'SOL-0004')
  const updated = await services.requests.update(created.id, {
    ...input,
    title: 'Alterada',
    status: 'COMPLETED',
    requesterId: 'user-2',
  })
  assert.deepEqual({ ...updated, title: created.title }, created)
  assert.equal((await services.requests.get(created.id)).title, 'Alterada')
  await services.requests.remove(created.id)
  await assert.rejects(services.requests.get(created.id), error('NOT_FOUND'))
  const next = await services.requests.create(input)
  assert.notEqual(next.id, created.id)
  assert.notEqual(next.code, created.code)
})

test('only the owner of an OPEN request may update or remove it', async () => {
  const { services, controls } = setup()
  controls.setCurrentUser('user-2')
  await assert.rejects(
    services.requests.update('request-1', input),
    error('FORBIDDEN'),
  )
  await assert.rejects(
    services.requests.remove('request-1'),
    error('FORBIDDEN'),
  )
  await assert.rejects(
    services.requests.update('request-2', input),
    error('CONFLICT'),
  )
  await assert.rejects(services.requests.remove('request-2'), error('CONFLICT'))
  controls.setCurrentUser('user-1')
  await assert.rejects(
    services.requests.update('request-3', input),
    error('CONFLICT'),
  )
  await assert.rejects(services.requests.remove('request-3'), error('CONFLICT'))
  assert.equal((await services.requests.list()).length, 3)
})

test('any demo user can attend requests, but only sequential transitions are allowed', async () => {
  const { services, controls } = setup()
  controls.setCurrentUser('user-2')
  await assert.rejects(
    services.requests.changeStatus('request-1', 'COMPLETED'),
    error('CONFLICT'),
  )
  assert.equal(
    (await services.requests.changeStatus('request-1', 'IN_PROGRESS')).status,
    'IN_PROGRESS',
  )
  await assert.rejects(
    services.requests.changeStatus('request-1', 'OPEN'),
    error('CONFLICT'),
  )
  assert.equal(
    (await services.requests.changeStatus('request-1', 'COMPLETED')).status,
    'COMPLETED',
  )
  for (const status of ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'UNKNOWN'])
    await assert.rejects(
      services.requests.changeStatus('request-1', status),
      error('CONFLICT'),
    )
})

test('required fields and invalid categories reject without changing data', async () => {
  const { services } = setup()
  for (const invalid of [
    { ...input, title: ' ' },
    { ...input, description: ' ' },
    { ...input, categoryId: 'missing' },
  ]) {
    await assert.rejects(services.requests.create(invalid), error('VALIDATION'))
    await assert.rejects(
      services.requests.update('request-1', invalid),
      error('VALIDATION'),
    )
  }
  assert.equal((await services.requests.list()).length, 3)
  assert.equal(
    (await services.requests.get('request-1')).title,
    'Configurar acesso à rede',
  )
  assert.equal((await services.requests.create(input)).code, 'SOL-0004')
})

test('filters combine title, category, status and inclusive UTC dates', async () => {
  const { services } = setup()
  assert.equal(
    (
      await services.requests.list({
        title: '  ACESSO ',
        categoryId: 'ti',
        status: 'OPEN',
        startDate: '2026-09-28',
        endDate: '2026-09-28',
      })
    )[0].id,
    'request-1',
  )
  assert.equal(
    (
      await services.requests.list({
        startDate: '2026-09-30',
        endDate: '2026-09-30',
      })
    )[0].id,
    'request-3',
  )
  assert.equal(
    (await services.requests.list({ startDate: '2026-09-29' })).length,
    2,
  )
  assert.equal(
    (await services.requests.list({ endDate: '2026-09-28' })).length,
    1,
  )
  assert.deepEqual(
    await services.requests.list({ title: 'acesso', categoryId: 'rh' }),
    [],
  )
})

test('invalid dates, inverted periods and invalid filter values are rejected', async () => {
  const { services } = setup()
  for (const filters of [
    { startDate: '2026-02-30' },
    { endDate: 'not-a-date' },
    { startDate: '2026-10-02', endDate: '2026-09-28' },
    { status: 'UNKNOWN' },
    { categoryId: 'missing' },
  ])
    await assert.rejects(services.requests.list(filters), error('VALIDATION'))
})

test('inactive demo session rejects all protected operations', async () => {
  const { services, controls } = setup()
  controls.setCurrentUser(null)
  assert.equal(await services.users.current(), null)
  for (const operation of [
    () => services.users.list(),
    () => services.categories.list(),
    () => services.requests.list(),
    () => services.requests.get('request-1'),
    () => services.requests.create(input),
    () => services.requests.update('request-1', input),
    () => services.requests.remove('request-1'),
    () => services.requests.changeStatus('request-1', 'IN_PROGRESS'),
  ])
    await assert.rejects(operation(), error('UNAUTHENTICATED'))
  controls.setCurrentUser('user-2')
  assert.equal((await services.requests.create(input)).requesterId, 'user-2')
})

test('missing requests produce NOT_FOUND for every operation', async () => {
  const { services } = setup()
  for (const operation of [
    () => services.requests.get('missing'),
    () => services.requests.update('missing', input),
    () => services.requests.remove('missing'),
    () => services.requests.changeStatus('missing', 'IN_PROGRESS'),
  ])
    await assert.rejects(operation(), error('NOT_FOUND'))
})

test('returned objects cannot mutate shared data and independent demos are isolated', async () => {
  const { services } = setup()
  const request = await services.requests.get('request-1')
  request.title = 'Mutated'
  const list = await services.requests.list()
  list[0].status = 'COMPLETED'
  const categories = await services.categories.list()
  categories[0].id = 'mutated'
  const user = await services.users.current()
  user.id = 'mutated'
  assert.equal(
    (await services.requests.get('request-1')).title,
    'Configurar acesso à rede',
  )
  assert.equal((await services.requests.get('request-1')).status, 'OPEN')
  assert.equal((await services.categories.list())[0].id, 'ti')
  assert.equal((await services.users.current()).id, 'user-1')
  await services.requests.create(input)
  assert.equal((await setup().services.requests.list()).length, 3)
})

test('injected failures reject once without mutation, and calls remain asynchronous', async () => {
  const { services, controls } = createMockServices({ latencyMs: 1 })
  controls.failNext()
  await assert.rejects(services.requests.create(input), error('NETWORK'))
  assert.equal((await services.requests.list()).length, 3)
  controls.failNext('FORBIDDEN')
  await assert.rejects(services.categories.list(), error('FORBIDDEN'))
  assert.equal((await services.categories.list()).length, 5)
  const response = services.requests.list()
  assert.ok(response instanceof Promise)
  await response
})
