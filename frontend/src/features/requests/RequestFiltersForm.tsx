import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, RotateCcw } from 'lucide-react'
import type { Category, RequestFilters } from '@/contracts/portal'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  emptyFilters,
  filtersSchema,
  toRequestFilters,
  type FilterValues,
} from './filters'
import { statusLabels } from './request-list'

export function RequestFiltersForm({
  categories,
  loading,
  onApply,
}: {
  categories: Category[]
  loading: boolean
  onApply: (filters: RequestFilters) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterValues>({
    resolver: zodResolver(filtersSchema),
    defaultValues: emptyFilters,
  })
  const submit = handleSubmit((values) => onApply(toRequestFilters(values)))

  function clear() {
    reset(emptyFilters)
    onApply({})
  }

  return (
    <Card asChild density="compact">
      <section aria-labelledby="filters-title">
        <CardHeader>
          <CardTitle asChild>
            <h2 id="filters-title">Filtrar solicitações</h2>
          </CardTitle>
          <CardDescription>
            Combine os filtros para encontrar uma demanda. O período inclui as
            duas datas, em UTC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              void submit(event)
            }}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="grid content-start gap-2">
                <Label htmlFor="filter-title">Título</Label>
                <Input
                  id="filter-title"
                  placeholder="Pesquisar por título"
                  {...register('title')}
                />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="filter-category">Categoria</Label>
                <NativeSelect id="filter-category" {...register('categoryId')}>
                  <NativeSelectOption value="">
                    Todas as categorias
                  </NativeSelectOption>
                  {categories.map((category) => (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="filter-status">Status</Label>
                <NativeSelect id="filter-status" {...register('status')}>
                  <NativeSelectOption value="">
                    Todos os status
                  </NativeSelectOption>
                  <NativeSelectOption value="OPEN">
                    {statusLabels.OPEN}
                  </NativeSelectOption>
                  <NativeSelectOption value="IN_PROGRESS">
                    {statusLabels.IN_PROGRESS}
                  </NativeSelectOption>
                  <NativeSelectOption value="COMPLETED">
                    {statusLabels.COMPLETED}
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="filter-start">Data inicial</Label>
                <Input
                  id="filter-start"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  aria-describedby={
                    errors.startDate ? 'filter-start-error' : undefined
                  }
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p
                    id="filter-start-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="filter-end">Data final</Label>
                <Input
                  id="filter-end"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  aria-describedby={
                    errors.endDate ? 'filter-end-error' : undefined
                  }
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p
                    id="filter-end-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="submit" disabled={loading}>
                <Search aria-hidden="true" />
                Aplicar filtros
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={clear}
              >
                <RotateCcw aria-hidden="true" />
                Limpar filtros
              </Button>
            </div>
          </form>
        </CardContent>
      </section>
    </Card>
  )
}
