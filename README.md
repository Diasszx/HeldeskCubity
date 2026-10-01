# HeldeskCubity

Portal de Solicitações Internas.

## Estrutura

- `frontend/`: aplicação web em React, Vite e TypeScript.
- `backend/`: diretório reservado para a API; implementação pendente.

## Executar o frontend

Requer Node.js 24 e npm. Na pasta `frontend`:

```bash
npm ci
npm run dev
```

## Verificações

Na pasta `frontend`, execute `npm run check` para tipos, lint, formatação e build.
## Integração contínua

O workflow `.github/workflows/frontend-ci.yml` executa em pushes e pull requests para `main`, além de execução manual. Usa Node 24, cache npm e instalação reproduzível com `npm ci`. Executa lint, tipos, formatação, testes e build; uma falha interrompe o job.

Os testes usam o executor nativo do Node e cobrem composição condicional, resolução de conflitos Tailwind e variantes responsivas no utilitário `cn`.
