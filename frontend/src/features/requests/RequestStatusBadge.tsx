import { tv } from 'tailwind-variants'
import type { RequestStatus } from '@/contracts/portal'
import { Badge } from '@/components/ui/badge'
import { statusLabels } from './request-list'

const statusVariants = tv({
  base: 'border-transparent',
  variants: {
    status: {
      OPEN: 'bg-status-open text-status-open-foreground',
      IN_PROGRESS: 'bg-status-progress text-status-progress-foreground',
      COMPLETED: 'bg-status-completed text-status-completed-foreground',
    },
  },
  defaultVariants: { status: 'OPEN' },
})

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant="outline" className={statusVariants({ status })}>
      {statusLabels[status]}
    </Badge>
  )
}
