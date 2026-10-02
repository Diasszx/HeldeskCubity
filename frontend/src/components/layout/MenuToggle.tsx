import type { Ref } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MenuToggle({
  open,
  onToggle,
  ref,
}: {
  open: boolean
  onToggle: () => void
  ref?: Ref<HTMLButtonElement>
}) {
  const Icon = open ? X : Menu
  return (
    <Button
      ref={ref}
      variant="outline"
      size="icon"
      className="md:hidden"
      type="button"
      aria-expanded={open}
      aria-controls="main-navigation"
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      onClick={onToggle}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}
