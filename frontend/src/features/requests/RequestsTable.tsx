import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table'
import type { RequestListRow } from './request-list'
import { RequestStatusBadge } from './RequestStatusBadge'

export function RequestsTable({ rows }: { rows: RequestListRow[] }) {
  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground md:hidden">
        Deslize a tabela para consultar todas as colunas.
      </p>
      <Table
        containerLabel="Solicitações: tabela com rolagem horizontal"
        className="min-w-[760px]"
      >
        <TableCaption className="sr-only">
          Solicitações filtradas. Datas de abertura em UTC.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Código</TableHead>
            <TableHead scope="col">Título</TableHead>
            <TableHead scope="col">Categoria</TableHead>
            <TableHead scope="col">Solicitante</TableHead>
            <TableHead scope="col">Abertura</TableHead>
            <TableHead scope="col">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ request, categoryName, requesterName, openedDate }) => (
            <TableRow key={request.id}>
              <TableCell>
                <Button variant="link" asChild className="px-0">
                  <Link
                    to={`/requests/${request.id}`}
                    aria-label={`Ver solicitação ${request.code}`}
                  >
                    {request.code}
                  </Link>
                </Button>
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal wrap-anywhere font-medium">
                {request.title}
              </TableCell>
              <TableCell>{categoryName}</TableCell>
              <TableCell>{requesterName}</TableCell>
              <TableCell>
                <time dateTime={request.createdAt}>{openedDate}</time>
              </TableCell>
              <TableCell>
                <RequestStatusBadge status={request.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
