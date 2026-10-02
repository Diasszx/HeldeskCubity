# Design system do Cubity Support

A base desta implementação é o commit `14f1f52`, na branch `feature/design-system-shadcn`.

## Componentes e origem

Button e Card foram incorporados com `npx shadcn@latest add button card --yes`, usando a configuração new-york do projeto. São código local do registro oficial shadcn/ui, adaptado para os padrões deste portal; não representam apenas uma instalação ou configuração do CLI.

- `src/components/ui/button.tsx`: Button com Radix Slot (`asChild`), preservando links como links e encaminhando ref e atributos.
- `src/components/ui/button-variants.ts`: variantes default, destructive, outline, secondary, ghost e link; tamanhos default, sm, lg e icon. Receita `tv` com tipos inferidos.
- `src/components/ui/card.tsx`: Card, Header, Title, Description, Content e Footer. Densidade default ou compact com `tv`; composição com `asChild` permite section, h1, h2 e p sem perder semântica.
- `src/components/layout`: Brand, Sidebar, Navigation, MenuToggle, PageHeader, SectionHeader e AppLayout. Navigation coordena slots e estados open/active com `tv`.
- SPEC-004: Input, Label, NativeSelect, Table e Badge incorporados com `npx shadcn@latest add input label native-select table badge --yes`. Imports usam o `cn` local; Badge adapta cva para tv; NativeSelect coordena tamanhos com slots de tv. Table oferece região focável para rolagem horizontal por teclado. Input e NativeSelect têm tamanho padrão de 44 px.
- Status das solicitações usam RequestStatusBadge com `tv` e tokens status-open, status-progress e status-completed, incluindo seus foregrounds. O texto identifica cada status independentemente da cor.

Referências: https://ui.shadcn.com/docs/components/radix/button e https://ui.shadcn.com/docs/components/radix/card. Variantes: https://www.tailwind-variants.org/docs/introduction.

## Tema e uso

`src/index.css` centraliza cores em tokens semânticos no bloco `:root` e mapeia esses tokens para Tailwind com `@theme inline`. Componentes consomem bg-background, bg-card, text-foreground, text-muted-foreground, bg-primary, bg-accent, border-border e ring-ring. Não criar uma paleta própria nas páginas.

A varredura de classes usa `source(none)` e `@source './'`, limitada a frontend/src. Evita incorporar classes do checkout separado, documentos ou harnesses temporários e mantém a geração de CSS independente da configuração local de ignore. Referência: https://tailwindcss.com/docs/detecting-classes-in-source-files.

Usar Button para ações e links de ação (`asChild` + Link). Usar Card para painéis. Criar novos componentes a partir do registro oficial shadcn/ui e adaptar variantes de cva para tv antes de concluir. Não substituir os componentes por seletores CSS próprios. Compor className com os utilitários/receitas existentes, mantendo o foco visível.

## Dependências

- `tailwind-variants`: variantes tipadas e composição de classes com Tailwind 4.
- `radix-ui`: Slot usado nos componentes incorporados do shadcn/ui.
- `class-variance-authority` e `cn` adicionados pelo CLI foram removidos: variantes usam tv e o projeto já tem `src/lib/utils.ts`.

## Verificação e limites

`npm run check` inclui `design-system:check`, tipos, lint, formatação, testes e build. O guard analisa os arquivos de src com o parser TypeScript: detecta literais de cores, classes de paleta fixa, imports de cva, variantes diretas por ternário/template/concatenação em className, botões HTML fora de components/ui e receitas tv sem variants/defaultVariants. CSS permite cores literais apenas nas declarações de tokens de :root. Testes verificam aceitação e rejeição dessas regras.

O workflow `frontend-ci.yml` também executa o guard em pull requests para main. A execução remota não foi disparada nesta etapa.

O guard é uma proteção contra regressões comuns, não uma prova completa de acessibilidade ou de origem shadcn/ui. Revisar o diff e validar teclado, foco e responsividade no navegador continuam obrigatórios. Links de marca e navegação conservam semântica própria; não são botões.

As telas continuam provisórias, sem autenticação, dados ou formulários reais. Este trabalho não implementa regras do backend. O README excluído no working tree foi preservado como exclusão do usuário; este documento concentra a justificativa da mudança.

## Validação realizada

- `npm run check` passou: guard do design system, TypeScript, ESLint, Prettier, sete testes e build.
- Navegador: desktop de 1280 px e mobile de 390 px; navegação dashboard → solicitações → nova solicitação, login → dashboard, foco visível por Tab e link de salto para main.
- Menu mobile: abertura com Enter, fechamento com Escape devolvendo foco ao botão e fechamento ao navegar. Ausência de overflow horizontal nos estados inspecionados; aparência de dashboard, solicitações e login conferida visualmente.
- Revisão feita pelo próprio implementador. Sem revisão independente, auditoria completa de acessibilidade ou teste de funcionalidades futuras.
- O `AGENTS.md` local exige shadcn/ui, mas está ignorado pela alteração existente do usuário em `.gitignore`. As regras compartilhadas e o guard estão neste documento e no código rastreável do frontend.
