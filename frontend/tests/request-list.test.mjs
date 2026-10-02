import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emptyFilters,
  filtersSchema,
  toRequestFilters,
} from '../src/features/requests/filters.ts'
import {
  loadRequestList,
  statusLabels,
} from '../src/features/requests/request-list.ts'
import { createMockServices } from '../src/services/mocks/create-mock-services.ts'

test('filter form accepts combined filters and maps blank fields to no filter', () => {
  const values = filtersSchema.parse({
    ...emptyFilters,
    title: ' ACESSO ',
    categoryId: 'ti',
    status: 'OPEN',
    startDate: '2026-09-28',
    endDate: '2026-09-28',
  })
  assert.deepEqual(toRequestFilters(values), {
    title: 'ACESSO',
    categoryId: 'ti',
    status: 'OPEN',
    startDate: '2026-09-28',
    endDate: '2026-09-28',
  })
  assert.ok(
    Object.values(toRequestFilters(emptyFilters)).every(
      (value) => value === undefined,
    ),
  )
})

test('filter form attaches inverted period errors to final date and rejects impossible dates', () => {
  const inverted = filtersSchema.safeParse({
    ...emptyFilters,
    startDate: '2026-10-02',
    endDate: '2026-09-28',
  })
  assert.equal(inverted.success, false)
  assert.deepEqual(inverted.error.issues[0].path, ['endDate'])
  for (const date of ['2026-02-30', '2026-13-01', 'invalid'])
    assert.equal(
      filtersSchema.safeParse({ ...emptyFilters, startDate: date }).success,
      false,
    )
  assert.equal(
    filtersSchema.safeParse({ ...emptyFilters, startDate: '2024-02-29' })
      .success,
    true,
  )
})

test('list joins category and requester names, formats UTC dates, and applies combined filters', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  const data = await loadRequestList(services, {
    title: ' ACESSO ',
    categoryId: 'ti',
    status: 'OPEN',
    startDate: '2026-09-28',
    endDate: '2026-09-28',
  })
  assert.equal(data.rows.length, 1)
  assert.equal(data.rows[0].categoryName, 'TI')
  assert.equal(data.rows[0].requesterName, 'Ana Silva')
  assert.equal(data.rows[0].openedDate, '28/09/2026')
  const all = await loadRequestList(services, {})
  assert.equal(all.rows[2].openedDate, '30/09/2026')
  assert.deepEqual(
    all.rows.map((row) => statusLabels[row.request.status]),
    ['Aberto', 'Em Atendimento', 'Concluído'],
  )
})

test('no matches produce an empty list and missing references have explicit fallbacks', async () => {
  const { services } = createMockServices({ latencyMs: 0 })
  assert.deepEqual(
    (await loadRequestList(services, { title: 'nothing-matches' })).rows,
    [],
  )
  const missingReferences = {
    ...services,
    categories: { list: async () => [] },
    users: { ...services.users, list: async () => [] },
  }
  const row = (await loadRequestList(missingReferences, {})).rows[0]
  assert.equal(row.categoryName, 'Categoria indisponível')
  assert.equal(row.requesterName, 'Solicitante indisponível')
})

test('request or lookup failure is surfaced, and retry preserves the applied filters', async () => {
  const { services, controls } = createMockServices({ latencyMs: 0 })
  const filters = { status: 'COMPLETED' }
  controls.failNext()
  await assert.rejects(loadRequestList(services, filters), { code: 'NETWORK' })
  assert.equal(
    (await loadRequestList(services, filters)).rows[0].request.status,
    'COMPLETED',
  )
  await assert.rejects(
    loadRequestList(
      {
        ...services,
        categories: {
          list: async () => {
            throw new Error('lookup failed')
          },
        },
      },
      {},
    ),
    /lookup failed/,
  )
})
