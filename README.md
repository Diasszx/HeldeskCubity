# HeldeskCubity

Portal de Solicitações Internas.

## Estrutura

- `frontend/`: aplicação web em React, Vite e TypeScript.
- `backend/`: API NestJS em ESM, Prisma, migrations e seed PostgreSQL.

## Fase backend e Docker

A API usa NestJS em ESM, Prisma e PostgreSQL. O Compose inicia frontend, API e banco com um único comando após preparar as variáveis: `docker compose up --build -d --wait`. Acesse `http://127.0.0.1:8080`. O [guia Docker](DOCKER.md) explica ambiente, migrations, seed, HTTPS, persistência e backups. Instruções de agentes e specs são arquivos locais, não versionados.

## Executar frontend e backend

Requer Node.js 24, npm e PostgreSQL em Docker. Prepare o banco e a API conforme o [backend](backend/README.md), configure `PORT=3001` e `APP_ORIGIN=http://127.0.0.1:5176`, e inicie a API. Em outro terminal, na pasta `frontend`:

```bash
npm ci
npm run dev
```

Abra `http://127.0.0.1:5176`. Consulte o [guia de integração](frontend/README.md) para proxy, seed demo, sessão/CSRF, testes reais e distribuição.

## Verificações

Na pasta `frontend`, execute `npm run check` para design system, tipos, lint, formatação, testes e build.

## Integração contínua

O workflow `.github/workflows/frontend-ci.yml` executa em pushes e pull requests para `main`, além de execução manual. Usa Node 24, cache npm e instalação reproduzível com `npm ci`. Executa lint, tipos, formatação, testes e build; uma falha interrompe o job.

Os testes do frontend usam o executor nativo do Node e cobrem design system, formulários, regras de UI e transporte HTTP. O workflow do backend também executa os services reais do frontend contra NestJS e PostgreSQL exclusivo de testes, incluindo CSRF e cookie invalidado após logout.

## Integração com a API

Autenticação, catálogos, listagem, filtros, cadastro, edição, exclusão, atendimento e dashboard consomem a API. As solicitações e sessões persistem no PostgreSQL; recarregar o frontend recupera a sessão e os dados. Mocks são utilizados somente nos testes.

A listagem em `/requests` combina título, categoria, status e período inclusivo em UTC. O dashboard apresenta indicadores globais. Edição e exclusão exigem solicitação própria e aberta; atendimento permite apenas Aberto → Em Atendimento → Concluído, com validação também no backend.
