import { SessionControls } from '@/features/auth/SessionControls'

export function PageHeader({ title }: { title: string }) {
  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b py-4 md:min-h-24">
      <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
      <SessionControls />
    </header>
  )
}
