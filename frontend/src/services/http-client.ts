import { ServiceError, type ServiceErrorCode } from './service-error.ts'

export interface HttpClientOptions {
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}

const failures: Record<number, [ServiceErrorCode, string]> = {
  400: ['VALIDATION', 'Verifique os dados informados.'],
  401: ['UNAUTHENTICATED', 'Sua sessão não está ativa. Entre novamente.'],
  403: ['FORBIDDEN', 'Esta operação não foi autorizada.'],
  404: ['NOT_FOUND', 'O registro não foi encontrado.'],
  409: [
    'CONFLICT',
    'O registro foi alterado. Atualize os dados antes de continuar.',
  ],
}

export function createHttpClient(options: HttpClientOptions = {}) {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
  const timeoutMs = options.timeoutMs ?? 15_000
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new RangeError('timeoutMs deve ser um número positivo.')

  async function send<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetcher(`/api${path}`, {
        ...init,
        credentials: 'include',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...init.headers },
      })
      if (!response.ok) {
        const [code, message] = failures[response.status] ?? [
          'INTERNAL_ERROR',
          'Não foi possível concluir a operação. Tente novamente.',
        ]
        throw new ServiceError(code, message)
      }
      if (response.status === 204) return undefined as T
      try {
        return (await response.json()) as T
      } catch {
        if (controller.signal.aborted)
          throw new ServiceError(
            'NETWORK',
            'A conexão demorou demais. Tente novamente.',
          )
        throw new ServiceError(
          'INTERNAL_ERROR',
          'O servidor retornou uma resposta inválida.',
        )
      }
    } catch (error) {
      if (error instanceof ServiceError) throw error
      throw new ServiceError(
        'NETWORK',
        'Não foi possível conectar ao servidor. Tente novamente.',
      )
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    get<T>(path: string) {
      return send<T>(path)
    },
    async mutate<T>(
      path: string,
      method: 'POST' | 'PATCH' | 'DELETE',
      body?: unknown,
    ) {
      // Obtain the nonce for the current cookie, including after login rotates it.
      // Never retry a write automatically or persist credentials in web storage.
      const csrf = await send<unknown>('/auth/csrf')
      const csrfToken =
        csrf && typeof csrf === 'object' && 'csrfToken' in csrf
          ? csrf.csrfToken
          : undefined
      if (typeof csrfToken !== 'string' || !/^[a-f0-9]{64}$/.test(csrfToken))
        throw new ServiceError(
          'INTERNAL_ERROR',
          'O servidor retornou uma resposta inválida.',
        )
      return send<T>(path, {
        method,
        headers: {
          'X-CSRF-Token': csrfToken,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    },
  }
}

export type HttpClient = ReturnType<typeof createHttpClient>
