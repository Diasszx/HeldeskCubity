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

Na pasta `frontend`, execute `npm run check` para design system, tipos, lint, formatação, testes e build.
## Integração contínua

O workflow `.github/workflows/frontend-ci.yml` executa em pushes e pull requests para `main`, além de execução manual. Usa Node 24, cache npm e instalação reproduzível com `npm ci`. Executa lint, tipos, formatação, testes e build; uma falha interrompe o job.

Os testes usam o executor nativo do Node e cobrem o utilitário `cn`, regras do design system e operações/regras dos services simulados.

## Services de demonstração

A SPEC-003 define contratos e services assíncronos com dados em memória. Não há API, persistência real ou autenticação implementada. Recarregar a página restaura as fixtures. As telas ainda são placeholders; a listagem e os filtros visuais serão tratados na SPEC-004. Consulte [a entrega da SPEC-003](frontend/SPEC-003.md) para uso, validação e limitações.
