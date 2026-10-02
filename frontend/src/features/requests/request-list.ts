import type {
  Category,
  PortalServices,
  Request,
  RequestFilters,
  RequestStatus,
} from '../../contracts/portal.ts'

export const statusLabels: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Atendimento',
  COMPLETED: 'Concluído',
}

export interface RequestListRow {
  request: Request
  categoryName: string
  requesterName: string
  openedDate: string
}

export interface RequestListData {
  rows: RequestListRow[]
  categories: Category[]
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export async function loadRequestList(
  services: PortalServices,
  filters: RequestFilters,
): Promise<RequestListData> {
  const [requests, categories, users] = await Promise.all([
    services.requests.list(filters),
    services.categories.list(),
    services.users.list(),
  ])
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  )
  const userNames = new Map(users.map((user) => [user.id, user.name]))
  return {
    categories,
    rows: requests.map((request) => ({
      request,
      categoryName:
        categoryNames.get(request.categoryId) ?? 'Categoria indisponível',
      requesterName:
        userNames.get(request.requesterId) ?? 'Solicitante indisponível',
      openedDate: dateFormatter.format(new Date(request.createdAt)),
    })),
  }
}
