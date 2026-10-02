import type { Category, Request, User } from '../../contracts/portal.ts'

export const demoUsers: readonly User[] = [
  { id: 'user-1', name: 'Ana Silva', username: 'ana.demo' },
  { id: 'user-2', name: 'Bruno Costa', username: 'bruno.demo' },
]

export const demoCategories: readonly Category[] = [
  { id: 'ti', name: 'TI' },
  { id: 'rh', name: 'RH' },
  { id: 'compras', name: 'Compras' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'infraestrutura', name: 'Infraestrutura' },
]

export const demoRequests: readonly Request[] = [
  {
    id: 'request-1',
    code: 'SOL-0001',
    title: 'Configurar acesso à rede',
    description: 'Preciso acessar a rede interna no computador da equipe.',
    categoryId: 'ti',
    requesterId: 'user-1',
    createdAt: '2026-09-28T09:00:00.000Z',
    status: 'OPEN',
  },
  {
    id: 'request-2',
    code: 'SOL-0002',
    title: 'Comprar material de escritório',
    description: 'Reposição de materiais para o setor.',
    categoryId: 'compras',
    requesterId: 'user-2',
    createdAt: '2026-09-29T14:00:00.000Z',
    status: 'IN_PROGRESS',
  },
  {
    id: 'request-3',
    code: 'SOL-0003',
    title: 'Reparar iluminação da sala',
    description: 'Verificar a iluminação da sala de reuniões.',
    categoryId: 'infraestrutura',
    requesterId: 'user-1',
    createdAt: '2026-09-30T23:59:59.000Z',
    status: 'COMPLETED',
  },
]
