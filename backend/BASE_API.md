# Base da API

Base ESM com type: module e TypeScript NodeNext. Node.js 24, NestJS 12, Express, TypeScript 5.9, Zod 4, Prisma 7 e PostgreSQL. O package-lock.json registra as versões instaladas. Sessões PostgreSQL, autenticação, catálogos e cadastro estão implementados; consultas e demais ações seguem nas próximas etapas.

## Executar

Dentro de backend:

```powershell
npm ci
Copy-Item .env.example .env
# Ajuste DATABASE_URL e gere um SESSION_SECRET próprio de pelo menos 32 caracteres.
npm run dev
```

Copie o exemplo somente se .env ainda não existir. Não publique esse arquivo. PORT é 3000 e HOST é 127.0.0.1 por padrão. NODE_ENV aceita development, test ou production. DATABASE_URL deve usar postgres:// ou postgresql://; SESSION_SECRET é obrigatório para assinar o cookie de sessão. O valor do exemplo é público e deve ser substituído.

- GET /api/health retorna {"status":"ok"}: verifica o processo, sem verificar conectividade do banco.
- /api/docs apresenta Swagger; /api/docs-json apresenta OpenAPI.
- Health e Swagger são públicos. Login, identidade, logout e CSRF estão documentados em [AUTHENTICATION.md](AUTHENTICATION.md); demais controllers exigem sessão por padrão. Nenhuma rota de negócio foi simulada.
- GET /api/users, GET /api/categories e POST /api/requests estão documentados em [REQUESTS.md](REQUESTS.md).

PrismaService usa o adapter PostgreSQL, abre conexões sob demanda e desconecta no encerramento. O schema e as migrations de persistência estão documentados em [DATABASE.md](DATABASE.md). npm ci gera o cliente ESM local ignorado pelo Git, sem consultar o banco.

## Verificação e produção

```powershell
npm run check
npm run build
npm start
```

check executa geração, tipos, ESLint, Prettier, Jest/Supertest e build. start usa dist/main.js. Configuração inválida informa os nomes das variáveis, sem imprimir seus valores. Falhas internas HTTP não devolvem detalhes ou segredos.

Erros HTTP usam {"code":"NOT_FOUND","message":"Recurso não encontrado."}. Códigos: 400 VALIDATION, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 NOT_FOUND, 409 CONFLICT e demais falhas INTERNAL_ERROR. Detalhes de validação por campo serão definidos junto aos endpoints. Não registre credenciais ou conexões completas nos logs.

## Limites

Docker Compose do banco está disponível na raiz, com serviço separado para testes. Esta base executa no host; imagens da API e do frontend e startup integrado ficam para a etapa de infraestrutura completa. Migrations e seed são explícitos, conforme DATABASE.md. Ainda não há consultas de solicitações, indicadores, edição/exclusão/atendimento ou integração com o frontend.

Versões instaladas: Node 24.14.1, NestJS 12.1.2, @nestjs/config 12.0.1, Swagger 12.0.2, Prisma e adapter-pg 7.10.0, pg 8.23.1 e Zod 4.6.5. O CLI Prisma exige overrides transitivos para deepmerge-ts 8.0.2 e mysql2 3.24.5; geração e instalação são verificadas com essa configuração. Remover os overrides quando o upstream incorporar as correções. npm audit reportou zero vulnerabilidades após esses ajustes. As migrations são verificadas na etapa de persistência.

Referências: [NestJS Swagger](https://docs.nestjs.com/openapi/security), [geração do Prisma Client](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/generating-prisma-client).

## Evidências da entrega

npm ci passou com geração automática do Prisma ESM. npm run check passou: tipos, lint, formatação, 19 testes em quatro suites e build. Na validação da base, npm run dev e npm start iniciaram a aplicação; health respondeu por HTTP e Swagger foi verificado no navegador. O startup com configuração inválida retornou código 1, informando nomes de variáveis sem expor os valores de teste. As verificações de conexão, migrations e seed estão registradas em DATABASE.md; os 48 testes PostgreSQL de persistência, autenticação e cadastro estão descritos também em AUTHENTICATION.md e REQUESTS.md.

Desenvolvimento compila TypeScript com metadata de decorators e executa o JavaScript ESM no Node em watch. Jest utiliza --experimental-vm-modules somente nos testes. Código da aplicação e Prisma gerado permanecem ESM também no build de produção.
