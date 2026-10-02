import type { PortalServices } from '../contracts/portal.ts'
import { ServiceError } from './service-error.ts'
export function createSessionServices(base: PortalServices) {
  const listeners = new Set<() => void>()
  async function observe<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (error instanceof ServiceError && error.code === 'UNAUTHENTICATED')
        listeners.forEach((listener) => listener())
      throw error
    }
  }
  const services: PortalServices = {
    auth: base.auth,
    users: {
      current: () => observe(() => base.users.current()),
      list: () => observe(() => base.users.list()),
    },
    categories: { list: () => observe(() => base.categories.list()) },
    requests: {
      list: (filters) => observe(() => base.requests.list(filters)),
      get: (id) => observe(() => base.requests.get(id)),
      create: (input) => observe(() => base.requests.create(input)),
      update: (id, input) => observe(() => base.requests.update(id, input)),
      remove: (id) => observe(() => base.requests.remove(id)),
      changeStatus: (id, status) =>
        observe(() => base.requests.changeStatus(id, status)),
    },
  }
  return {
    services,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
export type SessionAdapter = ReturnType<typeof createSessionServices>
