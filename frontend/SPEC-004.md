# SPEC-004 — Listagem e filtros

Status: concluída. Base: `6b33d1c`, main após merge dos mocks.
Branch: `feature/listagem-filtros`.

## Entrega

- `/requests` mostra código, título, categoria, solicitante, data de abertura e status. Categorias e solicitantes são resolvidos pelos services, sem fixtures nas páginas.
- Filtros combinados de título parcial sem distinguir maiúsculas, categoria, status e datas inclusivas. React Hook Form e Zod validam o formulário; início posterior ao fim gera mensagem associada à data final e mantém os resultados anteriores.
- Aplicar filtros carrega os resultados. Limpar restaura todos os campos e a listagem sem filtros. Erros mostram mensagem e nova tentativa com os filtros já aplicados, preservando as entradas.
- Loading anunciado com role=status e aria-busy; resultado vazio explícito; erros com role=alert. Os três status têm rótulos textuais além das cores.
- Input, Label, NativeSelect, Table e Badge vêm do registro oficial shadcn/ui. Variantes de Badge, NativeSelect e RequestStatusBadge usam tv e defaultVariants; cores de status definidas nos tokens de index.css.
- Tabela semântica com cabeçalhos de coluna, legenda e região de rolagem focável. Em mobile, somente a tabela rola horizontalmente; os filtros se reorganizam e a página não transborda.
- Páginas apenas compõem o formulário e os resultados. useRequestsList coordena carregamento, retry e descarte de respostas antigas após mudança da consulta/desmontagem. A leitura dos dados e formatação ficam em request-list.ts.
- Os códigos levam às rotas existentes de detalhes, que ainda são placeholders. Cadastro, edição e atendimento não foram antecipados.

## Datas e dados simulados

As datas exibidas e o período usam UTC, consistente com o adapter da SPEC-003. A tela informa essa convenção e inclui as duas datas. Antes de integrar com a API, confirmar e documentar o fuso definitivo com o backend; UTC aqui não representa uma decisão definitiva da API.

Dados continuam em memória, por contexto de página, reiniciando ao recarregar. A identidade é de demonstração. Nenhuma autorização real ou sessão de servidor foi implementada.

## Validação

- `npm run check` passou: design-system:check, TypeScript, ESLint, Prettier, 23 testes (cinco novos) e build.
- Testes novos: normalização/limpeza de filtros, período invertido e datas inexistentes, combinações, nomes de categoria/solicitante, data UTC, vazio, referências ausentes e propagação de erros/retry.
- Navegador na porta 5174: três solicitações iniciais e os seis campos; título ACESSO + TI + OPEN + 28/09/2026 a 28/09/2026 retornaram SOL-0001; datas invertidas mostraram erro e aria-invalid; limpar retornou três registros; texto inexistente mostrou vazio. Enter no código abriu a rota correta de detalhes e retorno funcionou.
- Viewports desktop e 390x844: inspeção visual. Corrigido overflow causado pela largura mínima da tabela. Na versão final, scrollWidth do documento não excedeu a largura do viewport; tabela de 760 px ficou dentro de região de 294 px. Tab mostrou foco no select; ArrowRight rolou a tabela em 40 px. Enter/Escape do menu mobile funcionaram.
- Harness temporário usando o mesmo RequestsPage com services injetados: loading e botões desabilitados durante a consulta, falha NETWORK, retry preservando título/categoria, identidade simulada inativa/restaurada e resposta antiga lenta descartada em favor da nova. Console do harness sem erros/warnings capturados. Harness removido após os testes.
- Revisão feita pelo implementador, sem revisão independente ou auditoria completa de acessibilidade. Não houve dependências novas permanentes.

## Ajustes e limitações

A varredura Tailwind foi limitada explicitamente a src para evitar influência do checkout separado e dos ignores locais. O CSS gerado caiu de aproximadamente 63 kB para 24 kB e o build passou de aproximadamente 36 s para 1,3 s na execução observada. Essas medidas não garantem os mesmos tempos em outros ambientes.

O Vite avisou sobre o chunk JavaScript de aproximadamente 530 kB, após incorporar o formulário com Zod/React Hook Form. O build passou; divisão por rotas permanece uma otimização pendente. Paginação e persistência de filtros na URL não fazem parte desta spec. Os filtros reiniciam ao sair da página. Não foram adicionados anexos, comentários, gestão de categorias, cadastro público ou perfis.

O servidor antigo em 5173 estava com configuração desatualizada; a validação usou uma instância nova em 5174. A .gitignore local e o AGENTS.md do usuário foram preservados. Somente arquivos específicos da entrega foram adicionados ao Git, pois frontend/ está ignorado localmente. Sem push, merge da feature ou deploy.

## Commits de implementação

- `3c47549` — feat(ui): add shadcn controls and status tokens
- `590130e` — fix(frontend): restrict tailwind scanning to app source
- `69a00d0` — feat(requests): add validated filters and list loading hook
- `e4efa04` — feat(requests): add accessible combined filters form
- `58bd33f` — feat(requests): render list with status badges and result states

Testes e documentação são registrados em commits separados, informados no fechamento. Próxima etapa: SPEC-005 — Cadastro e edição.
