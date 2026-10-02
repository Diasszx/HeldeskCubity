import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-context'
export function SessionControls() {
  const { state, pending, logout } = useAuth(),
    [error, setError] = useState('')
  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">
          {state.user?.name}
        </span>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            setError('')
            void logout().catch((failure: unknown) =>
              setError(
                failure instanceof Error
                  ? failure.message
                  : 'Não foi possível sair. Tente novamente.',
              ),
            )
          }}
        >
          {pending ? 'Saindo…' : 'Sair'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
