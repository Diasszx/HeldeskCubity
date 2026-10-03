import { z } from 'zod';

const dateSchema = z.iso.date().refine((value) => !value.startsWith('0000-'));
const optionalFilter = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.optional(),
  );

export const requestFiltersSchema = z
  .strictObject({
    title: z.string().trim().optional(),
    categoryId: optionalFilter(z.uuid()),
    status: optionalFilter(z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED'])),
    startDate: optionalFilter(dateSchema),
    endDate: optionalFilter(dateSchema),
  })
  .refine(
    (filters) =>
      !filters.startDate ||
      !filters.endDate ||
      filters.startDate <= filters.endDate,
    {
      message: 'Período invertido.',
      path: ['endDate'],
    },
  );

export type RequestFilters = z.infer<typeof requestFiltersSchema>;
export const requestIdSchema = z.uuid();

// Datas representam dias UTC. O limite superior exclusivo inclui todo o último dia.
export function utcPeriod(
  filters: Pick<RequestFilters, 'startDate' | 'endDate'>,
) {
  return {
    ...(filters.startDate
      ? { gte: new Date(`${filters.startDate}T00:00:00.000Z`) }
      : {}),
    ...(filters.endDate
      ? {
          lt: new Date(
            new Date(`${filters.endDate}T00:00:00.000Z`).getTime() + 86400000,
          ),
        }
      : {}),
  };
}

export const escapeSearch = (value: string) =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`);
