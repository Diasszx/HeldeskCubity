import { createContext, useContext } from 'react'
import type { User } from '@/contracts/portal'
export interface SessionState {
  phase: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  user: User | null
  message?: string
}
export interface AuthValue {
  state: SessionState
  pending: boolean
  refresh: () => void
  login: (input: { username: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}
export const AuthContext = createContext<AuthValue | null>(null)
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider é obrigatório.')
  return auth
}
