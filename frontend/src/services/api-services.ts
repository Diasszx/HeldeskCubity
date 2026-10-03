import type { PortalServices, RequestInput, User } from '../contracts/portal.ts'
import { createHttpClient, type HttpClient } from './http-client.ts'
import { ServiceError } from './service-error.ts'

function editableFields(input: RequestInput): RequestInput {
  return {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
  }
}

export function createApiServices(
  client: HttpClient = createHttpClient(),
): PortalServices {
  const requestPath = (id: string) => `/requests/${encodeURIComponent(id)}`
  return {
    auth: {
      async login({ username, password }) {
        try {
          return await client.mutate<User>('/auth/login', 'POST', {
            username,
            password,
          })
        } catch (error) {
          if (error instanceof ServiceError && error.code === 'UNAUTHENTICATED')
            throw new ServiceError(
              'UNAUTHENTICATED',
              'Usuário ou senha inválidos.',
            )
          throw error
        }
      },
      logout: () => client.mutate('/auth/logout', 'POST'),
    },
    users: {
      list: () => client.get('/users'),
      async current() {
        try {
          return await client.get<User>('/auth/me')
        } catch (error) {
          if (error instanceof ServiceError && error.code === 'UNAUTHENTICATED')
            return null
          throw error
        }
      },
    },
    categories: { list: () => client.get('/categories') },
    dashboard: { indicators: () => client.get('/dashboard') },
    requests: {
      list(filters = {}) {
        const query = new URLSearchParams()
        for (const key of [
          'title',
          'categoryId',
          'status',
          'startDate',
          'endDate',
        ] as const) {
          const value = filters[key]
          if (value) query.set(key, value)
        }
        const suffix = query.size ? `?${query}` : ''
        return client.get(`/requests${suffix}`)
      },
      get: (id) => client.get(requestPath(id)),
      create: (input) =>
        client.mutate('/requests', 'POST', editableFields(input)),
      update: (id, input) =>
        client.mutate(requestPath(id), 'PATCH', editableFields(input)),
      remove: (id) => client.mutate(requestPath(id), 'DELETE'),
      changeStatus: (id, status) =>
        client.mutate(`${requestPath(id)}/status`, 'PATCH', { status }),
    },
  }
}
