# SPEC-006 — Detalhes e ações

Branch: feature/detalhes-acoes, criada da main após merge da SPEC-005.

## Comportamento

A página de detalhes compõe RequestDetailsCard e RequestActions. Mostra título, descrição com quebras de linha, código, categoria, solicitante, data/hora em UTC e status com texto. O hook concentra carregamento, chamadas aos serviços, proteção síncrona contra envio duplicado e tratamento de erro. A troca de registro remonta o estado e respostas após desmontagem são descartadas.

RN09–RN11: somente o dono de registro OPEN pode editar ou excluir. Qualquer identidade autenticada pode atender, inclusive registro de outro dono; as únicas opções são OPEN → IN_PROGRESS e IN_PROGRESS → COMPLETED. Não há salto, retorno ou reabertura. Os serviços simulados validam essas regras novamente.

Excluir abre AlertDialog oficial shadcn/ui. Cancelar ou Escape não chama remove. Confirmar mantém o diálogo aberto durante a operação e em falha; controles ficam desabilitados durante o envio. Sucesso retorna à lista, com confirmação e sem o registro. Falhas de rede preservam dados e permitem retry. Conflito, permissão e sessão inválida bloqueiam ações até atualizar os detalhes; inexistência mostra mensagem própria. Erros são visíveis e alterações de status confirmadas com role=status.

## Validação

- npm run check: design-system:check, TypeScript, ESLint, Prettier, 32 testes e build. Cinco novos testes verificam dados completos, nomes e fallbacks, matriz de permissões, atendimento por outro usuário, saltos/reabertura rejeitados, inexistência, sessão inativa e falha de exclusão sem mutação com retry.
- Navegador: consulta completa; Aberto → Em Atendimento → Concluído, com remoção das ações indisponíveis; exclusão cancelada preserva registro, confirmada retorna à lista sem ele. Clique duplo gera uma chamada e controles ficam bloqueados durante o envio.
- Cenário temporário com serviços injetados: erros NETWORK em atendimento e exclusão, retry bem-sucedido, conflito causado por atualização externa com ações bloqueadas e recuperação após atualizar detalhes, sessão expirada, troca de dono e inexistência. Outro usuário atende, mas edição/exclusão não aparecem após atualizar a identidade. Harness removido após uso.
- Teclado: Enter executa atendimento e abre diálogo; foco inicial em Cancelar; Tab fica confinado; Escape devolve foco ao gatilho. Após atendimento, foco segue para a próxima ação ou para o título das ações quando concluído.
- Desktop de 1280 x 900 e mobile de 390 x 844 conferidos visualmente, sem overflow horizontal. Diálogo cabe no mobile. Console do navegador sem erros/avisos no cenário final.

## Limitações

Dados e identidade seguem simulados em memória, restaurados ao recarregar a página. Autenticação real e integração com backend permanecem nas etapas previstas; UI não constitui autorização. API futura deve revalidar permissões e transições. Nenhuma dependência nova mantida; origem e adaptações do AlertDialog registradas em DESIGN_SYSTEM.md. Build mantém aviso preexistente de chunk acima de 500 kB. CI remoto não executado; revisão feita pelo implementador, sem revisão independente.
