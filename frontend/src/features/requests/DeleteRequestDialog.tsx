import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

export function DeleteRequestDialog({
  code,
  pending,
  disabled,
  error,
  onConfirm,
}: {
  code: string
  pending: boolean
  disabled: boolean
  error?: string
  onConfirm: () => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) setOpen(value)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={disabled || pending}>
          Excluir solicitação
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {code}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove a solicitação. Você pode cancelar antes de
            confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {pending && (
          <p role="status" className="text-sm text-muted-foreground">
            Excluindo solicitação…
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || disabled}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm().then((removed) => {
                if (removed) setOpen(false)
              })
            }}
          >
            {pending ? 'Excluindo…' : 'Confirmar exclusão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
