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

## Publicação gratuita e entrega contínua

O [guia Render + Neon](docs/CD.md) explica a criação das contas, segredos, provisionamento privado de usuários, publicação e rollback. [render.yaml](render.yaml) configura um serviço Free, React e API na mesma origem HTTPS e deploy automático apenas depois dos checks da `main`. O Compose local permanece independente. **Aplicação publicada:** [Cubity Support](https://cubity-support-demo.onrender.com/login).

## Acesso público para avaliação

[Abra o Cubity Support](https://cubity-support-demo.onrender.com/login). Credenciais fornecidas pelo responsável, com publicação expressamente autorizada:

| Nome  | Usuário      | Senha            |
| ----- | ------------ | ---------------- |
| Ana   | `ana.demo`   | `anademo12345`   |
| Bruno | `bruno.demo` | `brunodemo12345` |

Use apenas dados fictícios neste ambiente compartilhado. Essas credenciais não incluem acesso ao banco nem o segredo de sessão. Publicar esta tabela não altera senhas existentes. A senha informada para Ana tem 11 caracteres: ela não atende ao mínimo de 12 para criar uma nova conta pelo provisionador. Para reproduzir em banco novo, escolha uma senha válida e atualize a documentação após configurá-la.

As decisões estão no [complemento do memorial técnico](docs/MEMORIAL_CD.md); o [roteiro de screenshots do CD](docs/screenshots/CD.md) distingue evidências pendentes de capturas reais.

## Integração contínua

O workflow `.github/workflows/frontend-ci.yml` executa em pushes e pull requests para `main`, além de execução manual. Usa Node 24, cache npm e instalação reproduzível com `npm ci`. Executa lint, tipos, formatação, testes e build; uma falha interrompe o job.

Os testes do frontend usam o executor nativo do Node e cobrem design system, formulários, regras de UI e transporte HTTP. O workflow do backend também executa os services reais do frontend contra NestJS e PostgreSQL exclusivo de testes, incluindo CSRF e cookie invalidado após logout.

## Integração com a API

Autenticação, catálogos, listagem, filtros, cadastro, edição, exclusão, atendimento e dashboard consomem a API. As solicitações e sessões persistem no PostgreSQL; recarregar o frontend recupera a sessão e os dados. Mocks são utilizados somente nos testes.

A listagem em `/requests` combina título, categoria, status e período inclusivo em UTC. O dashboard apresenta indicadores globais. Edição e exclusão exigem solicitação própria e aberta; atendimento permite apenas Aberto → Em Atendimento → Concluído, com validação também no backend.
