import type { PortalServices, Request, User } from '../../contracts/portal.ts'
import { ServiceError, type ServiceErrorCode } from '../service-error.ts'
import { demoCategories, demoRequests, demoUsers } from './fixtures.ts'
import { validateFilters, validateInput } from './validation.ts'

export interface MockOptions {
  latencyMs?: number
  currentUserId?: User['id'] | null
  now?: () => Date
}

export interface MockControls {
  /** Demo identity only. This is not a real session or authorization boundary. */
  setCurrentUser(id: User['id'] | null): void
  /** Reject the next service call without mutating data. */
  failNext(code?: ServiceErrorCode): void
}

export interface MockPortal {
  services: PortalServices
  controls: MockControls
}

export function createMockServices(options: MockOptions = {}): MockPortal {
  const users = structuredClone([...demoUsers])
  const categories = structuredClone([...demoCategories])
  let requests = structuredClone([...demoRequests])
  let sequence = requests.length
  let currentUserId =
    options.currentUserId === undefined ? users[0].id : options.currentUserId
  let nextError: ServiceErrorCode | undefined
  const now = options.now ?? (() => new Date())
  const latencyMs = options.latencyMs ?? 150
  if (!Number.isFinite(latencyMs) || latencyMs < 0)
    throw new RangeError('latencyMs deve ser um número não negativo.')

  function requireUser(): User {
    const user = users.find((entry) => entry.id === currentUserId)
    if (!user)
      throw new ServiceError(
        'UNAUTHENTICATED',
        'A sessão simulada não está ativa.',
      )
    return user
  }

  async function execute<T>(operation: () => T): Promise<T> {
    if (latencyMs)
      await new Promise((resolve) => setTimeout(resolve, latencyMs))
    if (nextError) {
      const code = nextError
      nextError = undefined
      throw new ServiceError(code, 'Falha simulada. Tente novamente.')
    }
    return structuredClone(operation())
  }

  function findRequest(id: string): Request {
    const request = requests.find((entry) => entry.id === id)
    if (!request)
      throw new ServiceError('NOT_FOUND', 'Solicitação não encontrada.')
    return request
  }

  function requireEditable(request: Request, user: User) {
    if (request.requesterId !== user.id)
      throw new ServiceError(
        'FORBIDDEN',
        'Somente o solicitante pode editar ou excluir.',
      )
    if (request.status !== 'OPEN')
      throw new ServiceError(
        'CONFLICT',
        'Somente solicitações abertas podem ser editadas ou excluídas.',
      )
  }

  const services: PortalServices = {
    auth: {
      login: (input) =>
        execute(() => {
          const user = users.find(
            (entry) => entry.username === input.username.trim(),
          )
          if (!user || input.password !== 'demo123')
            throw new ServiceError(
              'UNAUTHENTICATED',
              'Usuário ou senha inválidos.',
            )
          currentUserId = user.id
          return user
        }),
      logout: () =>
        execute(() => {
          currentUserId = null
        }),
    },
    users: {
      list: () =>
        execute(() => {
          requireUser()
          return users
        }),
      current: () =>
        execute(
          () => users.find((entry) => entry.id === currentUserId) ?? null,
        ),
    },
    categories: {
      list: () =>
        execute(() => {
          requireUser()
          return categories
        }),
    },
    requests: {
      list: (filters = {}) =>
        execute(() => {
          requireUser()
          validateFilters(filters, categories)
          const title = filters.title?.trim().toLocaleLowerCase('pt-BR') ?? ''
          return requests.filter((request) => {
            const day = request.createdAt.slice(0, 10)
            return (
              request.title.toLocaleLowerCase('pt-BR').includes(title) &&
              (!filters.categoryId ||
                request.categoryId === filters.categoryId) &&
              (!filters.status || request.status === filters.status) &&
              (!filters.startDate || day >= filters.startDate) &&
              (!filters.endDate || day <= filters.endDate)
            )
          })
        }),
      get: (id) =>
        execute(() => {
          requireUser()
          return findRequest(id)
        }),
      create: (input) =>
        execute(() => {
          const user = requireUser()
          const fields = validateInput(input, categories)
          const createdAt = now().toISOString()
          sequence += 1
          const request: Request = {
            ...fields,
            id: `request-${sequence}`,
            code: `SOL-${String(sequence).padStart(4, '0')}`,
            requesterId: user.id,
            createdAt,
            status: 'OPEN',
          }
          requests.push(request)
          return request
        }),
      update: (id, input) =>
        execute(() => {
          const user = requireUser()
          const request = findRequest(id)
          requireEditable(request, user)
          Object.assign(request, validateInput(input, categories))
          return request
        }),
      remove: (id) =>
        execute(() => {
          const user = requireUser()
          const request = findRequest(id)
          requireEditable(request, user)
          requests = requests.filter((entry) => entry.id !== id)
        }),
      changeStatus: (id, status) =>
        execute(() => {
          requireUser()
          const request = findRequest(id)
          const valid =
            (request.status === 'OPEN' && status === 'IN_PROGRESS') ||
            (request.status === 'IN_PROGRESS' && status === 'COMPLETED')
          if (!valid)
            throw new ServiceError(
              'CONFLICT',
              'Transição de status não permitida.',
            )
          request.status = status
          return request
        }),
    },
  }

  return {
    services,
    controls: {
      setCurrentUser(id) {
        if (id !== null && !users.some((user) => user.id === id))
          throw new ServiceError(
            'NOT_FOUND',
            'Usuário de demonstração não encontrado.',
          )
        currentUserId = id
      },
      failNext(code = 'NETWORK') {
        nextError = code
      },
    },
  }
}
