# Consultas, filtros e indicadores

As três rotas exigem sessão válida e usam o mesmo contrato público da [solicitação](REQUESTS.md). Consultas permitem visualizar solicitações de todos os usuários, sem hashes ou objetos relacionais adicionais. GET não modifica dados de negócio; a sessão continua sendo renovada conforme [AUTHENTICATION.md](AUTHENTICATION.md).

| Método e rota         | Resposta                                                              |
| --------------------- | --------------------------------------------------------------------- |
| GET /api/requests     | 200, array de Request; coleção vazia quando não há correspondência    |
| GET /api/requests/:id | 200, Request; UUID inválido retorna 400, UUID inexistente retorna 404 |
| GET /api/dashboard    | 200, {total,open,inProgress,completed}                                |

Listagem sem paginação, ordenada por createdAt decrescente e id crescente para desempate. Filtros presentes são combinados com AND. Sem sessão, as três rotas retornam 401; GET não exige token CSRF.

## Filtros de listagem

| Query string | Regra                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| title        | Texto parcial, após trim, sem distinguir caixa; %, _ e barra invertida são literais |
| categoryId   | UUID de categoria existente                                                         |
| status       | OPEN, IN_PROGRESS ou COMPLETED                                                      |
| startDate    | YYYY-MM-DD, primeiro dia inclusivo em UTC                                           |
| endDate      | YYYY-MM-DD, último dia inclusivo em UTC                                             |

UTC foi escolhido para preservar o comportamento dos mocks. O limite inicial é 00:00:00.000Z. O limite final é o início do dia seguinte, exclusivo, incluindo portanto todos os registros do último dia. Exemplo: startDate=2026-06-30 e endDate=2026-06-30 incluem 2026-06-30T23:59:59.999Z e excluem 2026-07-01T00:00:00.000Z. Um instante 2026-06-30T23:30:00-03:00 pertence ao dia 01/07 em UTC e fica fora desse intervalo.

Cada data pode ser usada separadamente. São aceitas datas reais entre 0001-01-01 e 9999-12-31, com quatro dígitos no ano. Datas impossíveis, timestamps em lugar de datas, início posterior ao fim, categoria inexistente, status inválido e parâmetros desconhecidos/repetidos retornam 400 VALIDATION. Valores vazios são tratados como filtros ausentes. Não há parâmetros page, limit ou requesterId.

```text
GET /api/requests?title=vpn&status=OPEN&startDate=2026-06-01&endDate=2026-06-30
```

## Indicadores globais

Dashboard não recebe filtros; query strings são recusadas com 400 para evitar resultados ambíguos. A listagem filtrada não interfere nos indicadores. Uma única agregação por status no PostgreSQL produz os três contadores, e total é sua soma. Não há consultas separadas de contagem que possam observar estados diferentes durante uma alteração concorrente. Com banco vazio, todos os quatro valores são zero.

Não foram adicionadas migrations ou dependências. Os endpoints e schemas estão em /api/docs e /api/docs-json. O frontend continua com mocks até a etapa de integração; a leitura do dashboard HTTP será adicionada ao cliente nessa etapa.

## Evidências

npm run check passou com tipos, lint, formatação, 19 testes em quatro suites e build ESM. npm run test:db passou com 77 testes de integração, incluindo 29 de consultas e indicadores. Execução usa o serviço db-test do Compose, TEST_DATABASE_URL dedicado e porta HTTP local temporária. O teste de dashboard exige que esse banco esteja sem solicitações antes das fixtures e não remove dados preexistentes.

Cobertura: sessão, consulta de outros solicitantes, campos públicos, ordenação, filtros individuais/combinados, caracteres literais, dias UTC adjacentes, instantes com offset, ano bissexto, datas extremas/impossíveis, inversão, ID ausente/inválido, respostas vazias, quatro zeros, indicadores independentes e ausência de mutações de negócio em GET. Alterações de status feitas diretamente nas fixtures verificam atualização das contagens; o endpoint de atendimento pertence à próxima etapa.

Referências: [Prisma Client 7](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference), [filtros e escaping de LIKE](https://www.prisma.io/docs/orm/v7/prisma-client/queries/filtering-and-sorting).
