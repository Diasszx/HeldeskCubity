# Contratos HTTP

Prefixo `/api`; JSON; autenticação por cookie `cubity.sid`. Swagger em `/api/docs` e OpenAPI em `/api/docs-json`. O navegador usa a mesma origem para frontend e API.

| Método | Rota                     | Acesso/comportamento                                    |
| ------ | ------------------------ | ------------------------------------------------------- |
| GET    | /api/health              | Público; saúde HTTP/processo, sem consultar banco       |
| GET    | /api/auth/csrf           | Público; cria/persiste sessão e retorna csrfToken       |
| POST   | /api/auth/login          | CSRF; username e password; regenera sessão              |
| GET    | /api/auth/me             | Sessão; usuário atual sem passwordHash                  |
| POST   | /api/auth/logout         | Sessão + CSRF; destrói sessão; 204                      |
| GET    | /api/users               | Sessão; catálogo de colaboradores sem hashes            |
| GET    | /api/categories          | Sessão; catálogo de categorias                          |
| GET    | /api/requests            | Sessão; listagem com filtros combináveis                |
| GET    | /api/requests/:id        | Sessão; detalhes                                        |
| POST   | /api/requests            | Sessão + CSRF; cria; 201                                |
| PATCH  | /api/requests/:id        | Sessão + CSRF; dono de OPEN; substitui campos editáveis |
| DELETE | /api/requests/:id        | Sessão + CSRF; dono de OPEN; 204                        |
| PATCH  | /api/requests/:id/status | Sessão + CSRF; transição sequencial                     |
| GET    | /api/dashboard           | Sessão; totais globais                                  |

Cadastro/edição recebem apenas `{title, description, categoryId}`. Campos extras são rejeitados. Status recebe `{status: "IN_PROGRESS"}` ou `{status: "COMPLETED"}` conforme estado atual. IDs são UUIDs.

Filtros: `title`, `categoryId`, `status`, `startDate` e `endDate`. Datas no formato YYYY-MM-DD; período por dia inclusivo em UTC (fim implementado como limite exclusivo do dia seguinte). Texto é parcial literal, sem distinguir caixa: `%` e `_` não são curingas fornecidos pelo usuário. Ordem: criação decrescente, ID crescente para desempate. Não há paginação.

Antes de POST/PATCH/DELETE, obter CSRF e enviar `X-CSRF-Token` com o cookie da sessão. Obter token novamente após login. Origin deve corresponder a APP_ORIGIN quando enviado; requisições cross-site são recusadas.

Erros: 400 para entrada inválida, 401 sem sessão/credencial válida, 403 para dono/CSRF/origem incorretos, 404 para solicitação ausente, 409 para estado/transição conflitante e 500 sanitizado para falhas internas. Detalhes: [autenticação](../backend/AUTHENTICATION.md), [cadastro](../backend/REQUESTS.md), [consultas](../backend/QUERIES.md) e [ações](../backend/ACTIONS.md).
