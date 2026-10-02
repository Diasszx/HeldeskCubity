import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import type { RequestDetails } from './request-details'
import { RequestStatusBadge } from './RequestStatusBadge'

export function RequestDetailsCard({ data }: { data: RequestDetails }) {
  return (
    <Card asChild>
      <section aria-labelledby="details-title">
        <CardHeader>
          <CardTitle asChild>
            <h2 id="details-title" className="break-words">
              {data.request.title}
            </h2>
          </CardTitle>
          <CardDescription>Solicitação {data.request.code}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Categoria</dt>
              <dd className="mt-1 break-words">{data.categoryName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Solicitante</dt>
              <dd className="mt-1 break-words">{data.requesterName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Abertura (UTC)</dt>
              <dd className="mt-1">
                <time dateTime={data.request.createdAt}>{data.openedAt}</time>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <RequestStatusBadge status={data.request.status} />
              </dd>
            </div>
          </dl>
          <div>
            <h3 className="mb-2 font-semibold">Descrição</h3>
            <p className="whitespace-pre-wrap break-words leading-7">
              {data.request.description}
            </p>
          </div>
        </CardContent>
      </section>
    </Card>
  )
}
