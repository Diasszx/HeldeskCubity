# Edição, exclusão e atendimento

Todas as ações exigem sessão válida, origem aceita e X-CSRF-Token da sessão autenticada, conforme [AUTHENTICATION.md](AUTHENTICATION.md). O ID da rota deve ser UUID. As respostas de edição e atendimento mantêm o contrato Request do frontend, sem envelope adicional.

| Método e rota                  | Entrada e resposta                                         |
| ------------------------------ | ---------------------------------------------------------- |
| PATCH /api/requests/:id        | {title,description,categoryId}; 200 com Request atualizado |
| DELETE /api/requests/:id       | Sem body necessário; 204 após excluir                      |
| PATCH /api/requests/:id/status | {status}; 200 com Request atualizado                       |

## Permissões e validação

Somente o solicitante pode editar ou excluir uma solicitação OPEN. A identidade vem da sessão, nunca do body. Edição substitui os três campos editáveis; todos são obrigatórios, com o mesmo trim, limites 60/1.000 e categoria existente do [cadastro](REQUESTS.md). Campos adicionais, inclusive código, ID, data, dono e status, são recusados. Código, createdAt e requesterId permanecem iguais.

Qualquer usuário autenticado pode atender solicitações, inclusive de outro solicitante. O body de atendimento aceita somente status. São permitidas apenas OPEN → IN_PROGRESS e IN_PROGRESS → COMPLETED. Saltar, retornar, reabrir ou repetir o estado retorna 409. Um status fora do enum retorna 400. Nenhuma ação altera parcialmente outros campos quando falha.

Erros seguem {code,message}: 400 VALIDATION para entrada inválida; 401 UNAUTHENTICATED sem sessão; 403 FORBIDDEN para dono incorreto ou falha de CSRF/origem; 404 NOT_FOUND quando a solicitação não existe; 409 CONFLICT quando o estado não permite a ação. Falhas de infraestrutura continuam sanitizadas com 500, sem detalhes internos.

## Concorrência

Leitura inicial oferece a classificação de permissão e estado. A escrita confirma novamente as condições no PostgreSQL: edição/exclusão usam id, requesterId e status=OPEN; atendimento usa id e o estado predecessor esperado. A alteração ou exclusão ocorre em uma única operação condicional. A categoria continua protegida por chave estrangeira.

Se o estado muda entre leitura e escrita, Prisma P2025 é classificado após consultar o estado atual: ausência retorna 404; dono incompatível retorna 403 para edição/exclusão; conflito de estado retorna 409. Não há retry que avance automaticamente o atendimento. Duas chamadas para OPEN → IN_PROGRESS não completam a solicitação nem repetem o avanço: apenas uma escrita vence. Solicitações continuam visíveis a todos os autenticados, conforme [QUERIES.md](QUERIES.md).

Não foram adicionados pacotes ou migrations. O frontend consome estes contratos pela API real. O CI está descrito em [TESTING.md](TESTING.md); a execução integrada por Compose está em [DOCKER.md](../DOCKER.md).

## Verificação

npm run check passou: tipos, lint, formatação, 19 testes unitários/HTTP e build ESM. npm run test:db passou com 110 testes em cinco suites, incluindo 33 de ações e concorrência. Banco dedicado db-test e porta HTTP temporária usam fixtures isoladas; a limpeza remove somente seus dados e sessões.

Os testes verificam sessão/CSRF nas três ações, dono incorreto, estados fechados, campos automáticos preservados, payloads inválidos, limites, exclusão/ausência, atendimento por outro usuário e todas as transições proibidas. As corridas controladas pausam leituras reais do service e executam outras chamadas HTTP; todas as escritas continuam reais no PostgreSQL. Cobrem edição/exclusão após atendimento concorrente, dois avanços com leitura inicial OPEN e exclusão entre leitura e avanço. Verificam respostas e estado final, sem alegar revisão independente.

Referência: [Prisma Client 7 — filtros na escrita e controle de concorrência](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference#optimistic-concurrency-control).
