# SPEC-007 — Dashboard

Branch feature/indicadores-dashboard, criada da main após merge da SPEC-006.

## Implementação

RN14: o dashboard consulta requests.list sem filtros e agrega o conjunto completo. Total corresponde à soma de abertas, em atendimento e concluídas. O hook consulta novamente ao montar a página, permitindo refletir mudanças dos mocks ao revisitar; ignora respostas após desmontagem. Não usa os filtros ou o estado da listagem.

DashboardPage compõe DashboardIndicators e IndicatorCard. Card e Button reutilizam shadcn/ui existente; tons dos indicadores usam slots de tv com variants/defaultVariants e tokens semânticos do tema. Títulos e números identificam indicadores independentemente da cor. Estados loading, erro com retry e conjunto vazio com os quatro valores zerados são distintos.

## Validação

- npm run check: design system, tipos, lint, formatação, 36 testes e build. Quatro testes novos cobrem zero e soma, ausência de filtros na chamada, atualização após cadastro/transições/exclusão e falhas/sessão inativa com recuperação.
- Navegador: fixtures mostram total 3 e um registro por status; filtro OPEN na lista não altera os totais globais. Ao revisitar após cadastro, total 4 com duas abertas; após atendimento, total 4 com duas em atendimento; após excluir a aberta original, total 3 com zero abertas.
- Harness temporário com serviços injetados: loading visível, erro NETWORK, retry por Enter recupera os valores; conjunto vazio mostra mensagem própria e quatro zeros. Arquivos temporários removidos após uso.
- Desktop 1280 x 900 com quatro colunas e mobile 390 x 844 com uma coluna, sem overflow horizontal. Navegação por Tab com foco visível em Ver solicitações. Revisão do próprio implementador, sem revisão independente.

## Limitações

Sem dependências novas. Dados e identidade seguem simulados em memória e restauram as fixtures ao recarregar a página; API e autenticação real permanecem nas specs previstas. Atualização ocorre ao revisitar, sem polling. Build mantém aviso preexistente de chunk acima de 500 kB. CI remoto não executado.
