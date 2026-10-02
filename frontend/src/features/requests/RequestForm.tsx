import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import type { Category, RequestInput } from '@/contracts/portal'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { requestSchema } from './request-form'

export function RequestForm({
  categories,
  initialValues,
  editing,
  onSave,
}: {
  categories: Category[]
  initialValues: RequestInput
  editing: boolean
  onSave: (values: RequestInput) => Promise<void>
}) {
  const locked = useRef(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequestInput>({
    resolver: zodResolver(requestSchema(categories)),
    defaultValues: initialValues,
  })
  const submit = handleSubmit(async (values) => {
    if (locked.current) return
    locked.current = true
    try {
      await onSave(values)
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar. Tente novamente.',
      })
    } finally {
      locked.current = false
    }
  })
  return (
    <Card asChild>
      <section aria-labelledby="request-form-title">
        <CardHeader>
          <CardTitle asChild>
            <h2 id="request-form-title">
              {editing ? 'Editar solicitação' : 'Registrar solicitação'}
            </h2>
          </CardTitle>
          <CardDescription>
            Título, descrição e categoria são obrigatórios. Código, data,
            solicitante e status são definidos pelo serviço.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            aria-busy={isSubmitting}
            onSubmit={(event) => {
              void submit(event)
            }}
            className="grid gap-5"
          >
            <fieldset disabled={isSubmitting} className="grid min-w-0 gap-5">
              <div className="grid gap-2">
                <Label htmlFor="request-title">Título</Label>
                <Input
                  id="request-title"
                  required
                  aria-invalid={!!errors.title}
                  aria-describedby="request-title-help request-title-error"
                  {...register('title')}
                />
                <p
                  id="request-title-help"
                  className="text-sm text-muted-foreground"
                >
                  Até 60 caracteres.
                </p>
                <p
                  id="request-title-error"
                  role={errors.title ? 'alert' : undefined}
                  className="text-sm text-destructive"
                >
                  {errors.title?.message}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="request-description">Descrição</Label>
                <Textarea
                  id="request-description"
                  required
                  className="min-h-40"
                  aria-invalid={!!errors.description}
                  aria-describedby="request-description-help request-description-error"
                  {...register('description')}
                />
                <p
                  id="request-description-help"
                  className="text-sm text-muted-foreground"
                >
                  Até 1.000 caracteres.
                </p>
                <p
                  id="request-description-error"
                  role={errors.description ? 'alert' : undefined}
                  className="text-sm text-destructive"
                >
                  {errors.description?.message}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="request-category">Categoria</Label>
                <NativeSelect
                  id="request-category"
                  required
                  aria-invalid={!!errors.categoryId}
                  aria-describedby="request-category-error"
                  {...register('categoryId')}
                >
                  <NativeSelectOption value="">
                    Selecione uma categoria
                  </NativeSelectOption>
                  {categories.map((category) => (
                    <NativeSelectOption key={category.id} value={category.id}>
                      {category.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <p
                  id="request-category-error"
                  role={errors.categoryId ? 'alert' : undefined}
                  className="text-sm text-destructive"
                >
                  {errors.categoryId?.message}
                </p>
              </div>
            </fieldset>
            {errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Salvando…'
                  : editing
                    ? 'Salvar alterações'
                    : 'Criar solicitação'}
              </Button>
              {!isSubmitting && (
                <Button variant="outline" asChild>
                  <Link to="/requests">Cancelar</Link>
                </Button>
              )}
            </div>
            {isSubmitting && (
              <p role="status" className="text-sm text-muted-foreground">
                Aguarde o envio da solicitação.
              </p>
            )}
          </form>
        </CardContent>
      </section>
    </Card>
  )
}
