import { z } from 'zod'
import type {
  Category,
  PortalServices,
  Request,
  RequestInput,
} from '../../contracts/portal.ts'
import { requestLimits } from '../../contracts/request-limits.ts'
import { ServiceError } from '../../services/service-error.ts'

export const emptyRequest: RequestInput = {
  title: '',
  description: '',
  categoryId: '',
}

export function requestSchema(categories: readonly Category[]) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Informe o título.')
      .max(requestLimits.title, 'Use até 60 caracteres.'),
    description: z
      .string()
      .trim()
      .min(1, 'Informe a descrição.')
      .max(requestLimits.description, 'Use até 1.000 caracteres.'),
    categoryId: z
      .string()
      .refine(
        (id) => categories.some((category) => category.id === id),
        'Selecione uma categoria válida.',
      ),
  })
}

export async function loadRequestForm(services: PortalServices, id?: string) {
  const [categories, user, request] = await Promise.all([
    services.categories.list(),
    services.users.current(),
    id ? services.requests.get(id) : Promise.resolve(undefined),
  ])
  if (!user)
    throw new ServiceError(
      'UNAUTHENTICATED',
      'Sua sessão não está ativa. Entre novamente.',
    )
  if (request && request.requesterId !== user.id)
    throw new ServiceError(
      'FORBIDDEN',
      'Somente o solicitante pode editar esta solicitação.',
    )
  if (request && request.status !== 'OPEN')
    throw new ServiceError(
      'CONFLICT',
      'Somente solicitações abertas podem ser editadas.',
    )
  return { categories, request }
}

export function editableFields(request: Request): RequestInput {
  return {
    title: request.title,
    description: request.description,
    categoryId: request.categoryId,
  }
}
