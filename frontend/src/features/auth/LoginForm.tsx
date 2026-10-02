import { useForm } from 'react-hook-form'
import { useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginInput } from './login-schema'
export function LoginForm({
  onLogin,
}: {
  onLogin: (input: LoginInput) => Promise<void>
}) {
  const locked = useRef(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  async function login(input: LoginInput) {
    try {
      await onLogin(input)
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível entrar. Tente novamente.',
      })
    }
  }
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (locked.current) return
        locked.current = true
        void handleSubmit(login)(event).finally(() => {
          locked.current = false
        })
      }}
      aria-busy={isSubmitting}
    >
      <fieldset disabled={isSubmitting} className="grid min-w-0 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="login-username">Usuário</Label>
          <Input
            id="login-username"
            autoComplete="username"
            required
            aria-invalid={!!errors.username}
            aria-describedby="username-error"
            {...register('username')}
          />
          <p
            id="username-error"
            role={errors.username ? 'alert' : undefined}
            className="text-sm text-destructive"
          >
            {errors.username?.message}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!errors.password}
            aria-describedby="password-error"
            {...register('password')}
          />
          <p
            id="password-error"
            role={errors.password ? 'alert' : undefined}
            className="text-sm text-destructive"
          >
            {errors.password?.message}
          </p>
        </div>
      </fieldset>
      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
