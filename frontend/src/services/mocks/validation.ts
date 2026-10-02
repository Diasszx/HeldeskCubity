import type {
  Category,
  RequestFilters,
  RequestInput,
} from '../../contracts/portal.ts'
import { ServiceError } from '../service-error.ts'

export function validateInput(
  input: RequestInput,
  categories: readonly Category[],
): RequestInput {
  if (
    typeof input.title !== 'string' ||
    typeof input.description !== 'string' ||
    !input.title.trim() ||
    !input.description.trim()
  ) {
    throw new ServiceError('VALIDATION', 'Informe título e descrição.')
  }
  if (!categories.some((category) => category.id === input.categoryId)) {
    throw new ServiceError('VALIDATION', 'Selecione uma categoria válida.')
  }
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId,
  }
}

function validateDate(value: string | undefined) {
  if (!value) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ServiceError('VALIDATION', 'Use uma data no formato YYYY-MM-DD.')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new ServiceError('VALIDATION', 'Informe uma data válida.')
}

export function validateFilters(
  filters: RequestFilters,
  categories: readonly Category[],
) {
  validateDate(filters.startDate)
  validateDate(filters.endDate)
  if (
    filters.startDate &&
    filters.endDate &&
    filters.startDate > filters.endDate
  )
    throw new ServiceError(
      'VALIDATION',
      'A data inicial não pode ser posterior à final.',
    )
  if (
    filters.categoryId &&
    !categories.some((category) => category.id === filters.categoryId)
  )
    throw new ServiceError('VALIDATION', 'Categoria inválida.')
  if (
    filters.status &&
    !['OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(filters.status)
  )
    throw new ServiceError('VALIDATION', 'Status inválido.')
}
