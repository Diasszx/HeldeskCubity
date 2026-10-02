# SPEC-003 — Contratos e services simulados

Status: concluída. Base: `207e97b` (main após merge do PR #4).
Branch: `feature/spec-003-contratos-mocks`.

## Entrega

- Contratos independentes de Prisma para User, Category, Request, RequestStatus e interfaces dos services. Datas de criação são strings ISO; filtros usam datas YYYY-MM-DD.
- Dois usuários de demonstração, cinco categorias (TI, RH, Compras, Financeiro e Infraestrutura) e solicitações OPEN, IN_PROGRESS e COMPLETED. Fixtures ficam em services/mocks, fora das páginas.
- Services assíncronos para consulta de usuários/categorias, usuário atual e CRUD/status de solicitações. Promises com latência simulada de 150 ms por padrão.
- Criação gera ID, código, data, solicitante a partir da identidade simulada e status OPEN. Edição só aceita título, descrição e categoria; campos automáticos são preservados.
- Consulta e atendimento por qualquer usuário de demonstração ativo; edição/exclusão somente pelo dono de uma solicitação OPEN. Transições OPEN → IN_PROGRESS → COMPLETED, sem retorno ou reabertura.
- Filtros combinados de título (parcial, sem distinguir maiúsculas), categoria, status e período inclusivo. Campos obrigatórios com trim, categoria inválida, datas inexistentes e período invertido são recusados.
- Erros tipados: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VALIDATION, CONFLICT e NETWORK. `failNext` permite simular uma falha na próxima chamada, sem mutar os dados.

## Consumo nas próximas specs

```ts
import { portalServices } from '@/services/portal-services'

const requests = await portalServices.requests.list({ status: 'OPEN' })
const categories = await portalServices.categories.list()
```

`portalServices` é uma instância compartilhada por módulo. Alterações duram enquanto a página está carregada; recarregar reinicializa as fixtures. `createMockServices` permite instâncias isoladas para testes. As respostas são cópias, evitando mutação acidental do estado interno.

`mockControls.setCurrentUser('user-2')` e `mockControls.setCurrentUser(null)` são controles de demonstração. Não autenticam pessoas nem implementam sessão segura. Não existe token ou armazenamento em localStorage. Na SPEC-009, substituir o adapter mantendo as interfaces; os contratos finais devem ser confirmados com a API.

## Validação

- `npm run check`: passou guard do design system, TypeScript, ESLint, Prettier, 18 testes (11 novos) e build.
- Testes novos cobrem fixtures, CRUD persistido em memória, campos automáticos, códigos únicos após exclusão, propriedade/estado, transições, filtros, datas inválidas, sessão simulada inativa, inexistência, isolamento das respostas e recuperação após falha.
- Navegador com Vite: harness temporário confirmou consumidores compartilhando dados, criação/edição/exclusão, status, filtros combinados, erro NETWORK e recuperação, identidade simulada inativa/trocada. Recarregar o harness confirmou retorno às três fixtures iniciais. Resultado: SPEC-003: PASS. Harness removido após a validação.
- Não houve alteração de telas nem validação visual nova; telas ainda são placeholders. Responsividade e teclado das próximas telas precisam ser validados nas respectivas specs.
- Revisão do próprio implementador, sem revisão independente. Sem dependências novas ou chamadas de API.

## Limites e pendências

- Persistência apenas em memória, por contexto de página. Reinicia ao recarregar ou encerrar; não sincroniza abas nem grava no banco.
- UTC é uma convenção provisória do mock para filtros de datas. Fuso definitivo da API, limites de texto, paginação e contratos finais permanecem pendentes. Nenhum limite arbitrário de título/descrição foi introduzido.
- As verificações de permissão no mock representam cenários de demonstração. O backend deverá aplicar autenticação, propriedade e transições novamente.
- Sem login real, formulários, listagem visual, dashboard de dados, cadastro público, anexos, comentários ou gestão de categorias. Próxima etapa: SPEC-004, listagem e filtros.
- `.gitignore` local e `AGENTS.md` do usuário foram preservados e não incluídos nos commits. A main foi atualizada por fast-forward antes de criar a branch. Somente arquivos explicitamente listados desta spec foram adicionados, pois a configuração local ignora frontend/.

## Commits de implementação e testes

- `90711e0` — feat(frontend): define portal contracts and demo fixtures
- `0f26b34` — feat(frontend): implement in-memory portal services
- `78cf0e3` — test(frontend): cover mock request rules and failure recovery

A documentação é registrada em um commit separado, informado no fechamento da spec. Sem push, merge da feature ou deploy nesta entrega.
