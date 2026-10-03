# Cadastro de solicitações e catálogos

Os endpoints abaixo exigem cookie de sessão válido, conforme [AUTHENTICATION.md](AUTHENTICATION.md). O frontend permanece com mocks até a etapa de integração. Não há cadastro público nem edição de usuários ou categorias.

| Método e rota       | Resposta                                                      |
| ------------------- | ------------------------------------------------------------- |
| GET /api/users      | 200, array de {id,name,username}; sem passwordHash ou sessões |
| GET /api/categories | 200, array de {id,name}                                       |
| POST /api/requests  | 201, solicitação persistida                                   |

Os catálogos ordenam por nome e ID, sem paginação. O seed explícito disponibiliza TI, RH, Compras, Financeiro e Infraestrutura; o endpoint consulta o banco e não injeta dados simulados. Sem sessão, as três rotas retornam 401. Cadastro também exige X-CSRF-Token da sessão autenticada e origem válida, retornando 403 em caso de falha dessa proteção.

## Entrada e resposta

POST aceita somente title, description e categoryId. Título e descrição recebem trim antes de validar: obrigatórios, no máximo 60 e 1.000 caracteres, respectivamente, usando o mesmo critério de comprimento de strings JavaScript do frontend. Categoria deve ser um UUID existente. Campos ausentes, tipos incorretos, valores vazios, excesso e propriedades adicionais retornam 400 VALIDATION. Categoria removida entre a consulta e a inserção também é recusada; a chave estrangeira mantém a integridade.

```json
{
  "title": "Acesso ao sistema",
  "description": "Preciso de acesso ao sistema interno.",
  "categoryId": "UUID obtido em GET /api/categories"
}
```

Resposta segue Request do frontend: id, code, title, description, categoryId, requesterId, createdAt e status. Não há envelope adicional nem objetos relacionais. requesterId vem exclusivamente da identidade verificada pelo Guard. Enviar requesterId, status, code, createdAt ou id no body causa rejeição, sem gravar a solicitação.

O banco gera UUID, código com sequência atômica (SOL-0001, SOL-10000), data e status OPEN. A API serializa createdAt em ISO 8601 UTC. A interpretação do filtro de período será definida na etapa de consultas. Códigos são únicos em cadastros concorrentes; lacunas da sequência são esperadas, conforme [DATABASE.md](DATABASE.md). Nenhuma migration ou dependência nova foi necessária nesta etapa.

Schemas de entrada, resposta, cookie e header CSRF estão publicados em /api/docs e /api/docs-json. Erros mantêm {code,message}, sem detalhes internos de persistência.

## Verificação

npm run check valida geração ESM, tipos, lint, formatação, 19 testes unitários/HTTP e build. npm run test:db verifica 48 testes de integração no PostgreSQL dedicado, incluindo 26 de cadastro e catálogos. Para executar, iniciar docker compose --profile test up -d db-test na raiz e definir TEST_DATABASE_URL conforme [DATABASE.md](DATABASE.md).

Os testes de cadastro usam uma porta HTTP local temporária, cookies reais e fixtures isoladas. Verificam sessão, CSRF, catálogo sem hashes, trim, limites exatos, campos automáticos, categoria inexistente, persistência da resposta, 12 cadastros simultâneos e contrato OpenAPI. A limpeza remove somente fixtures e sessões criadas pelos testes. A condição de categoria removida entre consulta e escrita é verificada no service com falha Prisma P2003 simulada.

Referências: [controllers e respostas NestJS](https://docs.nestjs.com/controllers), [erros Prisma](https://docs.prisma.io/docs/orm/reference/error-reference).
