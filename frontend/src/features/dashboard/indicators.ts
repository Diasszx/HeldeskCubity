import type { PortalServices, Request } from '../../contracts/portal.ts'

export function countRequests(requests: readonly Request[]) {
  const counts = { total: 0, open: 0, inProgress: 0, completed: 0 }
  for (const request of requests) {
    if (request.status === 'OPEN') counts.open++
    else if (request.status === 'IN_PROGRESS') counts.inProgress++
    else if (request.status === 'COMPLETED') counts.completed++
  }
  counts.total = counts.open + counts.inProgress + counts.completed
  return counts
}

export type RequestIndicators = ReturnType<typeof countRequests>

export async function loadIndicators(
  services: PortalServices,
): Promise<RequestIndicators> {
  return countRequests(await services.requests.list())
}
