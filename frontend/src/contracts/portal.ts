export type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'

export interface User {
  id: string
  name: string
  username: string
}

export interface Category {
  id: string
  name: string
}

export interface Request {
  id: string
  code: string
  title: string
  description: string
  categoryId: Category['id']
  requesterId: User['id']
  createdAt: string
  status: RequestStatus
}

export interface RequestInput {
  title: string
  description: string
  categoryId: Category['id']
}

export interface RequestFilters {
  title?: string
  categoryId?: Category['id']
  status?: RequestStatus
  /** Inclusive YYYY-MM-DD, covering the entire day in UTC. */
  startDate?: string
  endDate?: string
}

export interface RequestsService {
  list(filters?: RequestFilters): Promise<Request[]>
  get(id: Request['id']): Promise<Request>
  create(input: RequestInput): Promise<Request>
  update(id: Request['id'], input: RequestInput): Promise<Request>
  remove(id: Request['id']): Promise<void>
  changeStatus(id: Request['id'], status: RequestStatus): Promise<Request>
}

export interface UsersService {
  list(): Promise<User[]>
  current(): Promise<User | null>
}

export interface CategoriesService {
  list(): Promise<Category[]>
}

export interface PortalServices {
  auth: {
    login(input: { username: string; password: string }): Promise<User>
    logout(): Promise<void>
  }
  users: UsersService
  categories: CategoriesService
  dashboard: {
    indicators(): Promise<DashboardIndicators>
  }
  requests: RequestsService
}

export interface DashboardIndicators {
  total: number
  open: number
  inProgress: number
  completed: number
}
