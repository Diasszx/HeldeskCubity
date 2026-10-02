import { z } from 'zod'
import type { RequestFilters } from '../../contracts/portal.ts'

function validDate(value: string) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

const optionalDate = z.string().refine(validDate, 'Informe uma data válida.')
export const filtersSchema = z
  .object({
    title: z.string().trim(),
    categoryId: z.string(),
    status: z.enum(['', 'OPEN', 'IN_PROGRESS', 'COMPLETED']),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine(
    (filters) =>
      !filters.startDate ||
      !filters.endDate ||
      filters.startDate <= filters.endDate,
    {
      message: 'A data inicial não pode ser posterior à final.',
      path: ['endDate'],
    },
  )

export type FilterValues = z.infer<typeof filtersSchema>
export const emptyFilters: FilterValues = {
  title: '',
  categoryId: '',
  status: '',
  startDate: '',
  endDate: '',
}

export function toRequestFilters(values: FilterValues): RequestFilters {
  return {
    title: values.title.trim() || undefined,
    categoryId: values.categoryId || undefined,
    status: values.status || undefined,
    startDate: values.startDate || undefined,
    endDate: values.endDate || undefined,
  }
}
