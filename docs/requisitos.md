# Requisitos e regras de negócio

O portal permite que colaboradores autenticados registrem e acompanhem solicitações internas. O escopo de entrega inclui frontend, backend, banco SQL, execução documentada, dicionário, memorial e evidências. As regras RN01–RN15 consolidam as decisões do memorial de referência e a implementação atual.

| Regra | Comportamento                                                        | Implementação de referência                          |
| ----- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| RN01  | Recursos de negócio exigem sessão válida                             | `backend/src/auth/session.guard.ts`                  |
| RN02  | Solicitante é derivado da sessão, nunca escolhido no formulário      | `requests.controller.ts`, `requests.service.ts`      |
| RN03  | Logout destrói a sessão; sessão expirada não dá acesso               | `auth.controller.ts`, `session/session.runtime.ts`   |
| RN04  | Título e descrição obrigatórios após trim; até 60 e 1.000 caracteres | `requests/request-input.ts`, checks SQL              |
| RN05  | Categorias iniciais: TI, RH, Compras, Financeiro e Infraestrutura    | `prisma/seed-demo.ts`                                |
| RN06  | Código único, instante de criação, dono e OPEN definidos no servidor | migration SQL e `requests.service.ts`                |
| RN07  | Autenticados consultam todas as solicitações                         | `requests.controller.ts`, `requests.service.ts`      |
| RN08  | Apenas dono de OPEN edita título, descrição e categoria              | escrita condicionada em `requests.service.ts`        |
| RN09  | Apenas dono de OPEN exclui                                           | exclusão condicionada em `requests.service.ts`       |
| RN10  | Qualquer autenticado atende, inclusive demandas de outros            | guards globais e alteração de status                 |
| RN11  | Somente OPEN → IN_PROGRESS → COMPLETED; sem retorno ou reabertura    | `requests/request-status.ts`, escrita condicionada   |
| RN12  | Filtros combináveis; título parcial literal e sem distinguir caixa   | `requests/request-filters.ts`, `requests.service.ts` |
| RN13  | Período inclusivo por dia UTC; início não pode exceder fim           | `utcPeriod` e schema dos filtros                     |
| RN14  | Dashboard global, independente dos filtros; total é soma dos status  | `dashboard/dashboard.service.ts`                     |
| RN15  | Backend valida campos, permissões e transições; UI reflete as regras | ZodPipe, guards e services                           |

Os nomes de arquivos sem prefixo nas linhas de solicitações se referem a `backend/src/requests`. A interface apresenta OPEN como **Aberto**, IN_PROGRESS como **Em Atendimento** e COMPLETED como **Concluído**.

## Limites da versão

Não há perfis Admin/Técnico, cadastro público, recuperação de senha, gerenciamento de categorias, anexos, comentários, SLA, inventário, notificações ou trilha de auditoria. Esses recursos existem em outros sistemas de helpdesk, mas não compõem este escopo. A listagem não tem paginação no servidor.

As permissões uniformes de consulta/atendimento, edição/exclusão restritas ao dono e evolução sequencial são decisões adotadas para este portal. O filtro por dia usa UTC; a apresentação de instantes no navegador pode refletir o fuso do usuário.
