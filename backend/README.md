# Backend

API NestJS 12 em ESM com TypeScript, Express, Zod e Prisma 7. PostgreSQL executa em Docker Compose com volume persistente; os testes usam um serviço separado.

- [Execução e configuração da API](BASE_API.md)
- [Modelo, migrations, seed e testes de banco](DATABASE.md)
- [Login, sessão, CSRF e configuração de cookies](AUTHENTICATION.md)

Na raiz: preparar .docker/database.env a partir do exemplo e executar docker compose up -d db. Dentro de backend: npm ci, configurar .env, npm run db:deploy e npm run dev. Seed é explícito, conforme DATABASE.md. Não versionar arquivos de ambiente locais.

Health, Swagger e autenticação por sessão PostgreSQL estão implementados. Regras e endpoints de negócio serão adicionados nas próximas etapas. O Compose contém banco de desenvolvimento e serviço opcional de testes; ainda não inicia API e frontend.
