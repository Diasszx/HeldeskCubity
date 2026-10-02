import { tv, type VariantProps } from 'tailwind-variants'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const indicatorVariants = tv({
  slots: {
    label: 'text-sm font-medium',
    value: 'text-4xl font-bold tabular-nums',
  },
  variants: {
    tone: {
      total: { label: 'text-muted-foreground', value: 'text-foreground' },
      open: {
        label: 'text-status-open-foreground',
        value: 'text-status-open-foreground',
      },
      progress: {
        label: 'text-status-progress-foreground',
        value: 'text-status-progress-foreground',
      },
      completed: {
        label: 'text-status-completed-foreground',
        value: 'text-status-completed-foreground',
      },
    },
  },
  defaultVariants: { tone: 'total' },
})

export function IndicatorCard({
  label,
  value,
  tone,
}: { label: string; value: number } & VariantProps<typeof indicatorVariants>) {
  const styles = indicatorVariants({ tone })
  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h3 className={styles.label()}>{label}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={styles.value()}>{value}</p>
      </CardContent>
    </Card>
  )
}
