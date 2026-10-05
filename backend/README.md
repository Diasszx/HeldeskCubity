# Backend

API NestJS 12 em ESM com TypeScript, Express, Zod e Prisma 7. PostgreSQL executa em Docker Compose com volume persistente; os testes usam um serviço separado.

- [Execução e configuração da API](BASE_API.md)
- [Modelo, migrations, seed e testes de banco](DATABASE.md)
- [Login, sessão, CSRF e configuração de cookies](AUTHENTICATION.md)
- [Cadastro de solicitações e catálogos autenticados](REQUESTS.md)
- [Consultas, filtros UTC e dashboard global](QUERIES.md)
- [Edição, exclusão, atendimento e concorrência](ACTIONS.md)
- [Testes reproduzíveis e CI com PostgreSQL separado](TESTING.md)
- [Observabilidade NestJS Observe: cobertura, privacidade e ativação](OBSERVABILITY.md)

Na raiz: preparar .docker/database.env a partir do exemplo e executar docker compose up -d db. Dentro de backend: npm ci, configurar .env, npm run db:deploy e npm run dev. Seed é explícito, conforme DATABASE.md. Não versionar arquivos de ambiente locais.

Health, Swagger, autenticação por sessão PostgreSQL, catálogos, cadastro, consultas, indicadores, edição, exclusão e atendimento estão implementados. O frontend consome esses endpoints; veja a [execução integrada](../frontend/README.md). O Compose contém banco de desenvolvimento e serviço opcional de testes; ainda não inicia API e frontend.
