import type {
  PortalServices,
  Request,
  RequestStatus,
  User,
} from '../../contracts/portal.ts'
import { ServiceError } from '../../services/service-error.ts'

export interface RequestDetails {
  request: Request
  categoryName: string
  requesterName: string
  openedAt: string
  currentUser: User
}

export function availableRequestActions(request: Request, user: User | null) {
  const editable =
    !!user && user.id === request.requesterId && request.status === 'OPEN'
  const nextStatus: RequestStatus | null = !user
    ? null
    : request.status === 'OPEN'
      ? 'IN_PROGRESS'
      : request.status === 'IN_PROGRESS'
        ? 'COMPLETED'
        : null
  return { editable, removable: editable, nextStatus }
}

export async function loadRequestDetails(
  services: PortalServices,
  id: string,
): Promise<RequestDetails> {
  const [request, categories, users, currentUser] = await Promise.all([
    services.requests.get(id),
    services.categories.list(),
    services.users.list(),
    services.users.current(),
  ])
  if (!currentUser)
    throw new ServiceError(
      'UNAUTHENTICATED',
      'Sua sessão não está ativa. Entre novamente.',
    )
  return {
    request,
    currentUser,
    categoryName:
      categories.find((category) => category.id === request.categoryId)?.name ??
      'Categoria indisponível',
    requesterName:
      users.find((user) => user.id === request.requesterId)?.name ??
      'Solicitante indisponível',
    openedAt: new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(request.createdAt)),
  }
}

export function requestError(error: unknown) {
  return {
    code: error instanceof ServiceError ? error.code : ('NETWORK' as const),
    message:
      error instanceof Error
        ? error.message
        : 'Não foi possível realizar a operação. Tente novamente.',
  }
}
