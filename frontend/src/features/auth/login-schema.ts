import { z } from 'zod'
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.'),
  password: z.string().min(1, 'Informe a senha.'),
})
export type LoginInput = z.infer<typeof loginSchema>
export function loginDestination(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^\/(dashboard|requests)(\/|\?|#|$)/.test(value) ||
    value.includes('\\')
  )
    return '/dashboard'
  const normalized = new URL(value, 'http://portal.local')
  if (!/^\/(dashboard|requests)(\/|$)/.test(normalized.pathname))
    return '/dashboard'
  return normalized.pathname + normalized.search + normalized.hash
}
