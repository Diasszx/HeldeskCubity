# SPEC-005 — Cadastro e edição

Limites definidos pelo usuário antes da implementação: título obrigatório com até 60 caracteres; descrição obrigatória com até 1.000 caracteres. Ambos removem espaços nas extremidades antes da validação. A categoria deve existir no catálogo. Contagem usa unidades UTF-16, como string.length e os controles HTML.

Os serviços simulados devem aplicar os mesmos limites; a futura API deverá validá-los novamente. Cadastro atribui dono, código, data e OPEN no serviço. Edição permite apenas título, descrição e categoria de registro próprio OPEN.

## Implementação

RequestForm compartilha React Hook Form e resolver Zod entre cadastro e edição. Hook separado carrega catálogo, identidade simulada e registro; descarta respostas após desmontagem. Cada rota remonta seu estado ao mudar o registro. Erros de carregamento oferecem retry, erros de envio preservam os campos e a proteção contra envio duplicado combina bloqueio síncrono e controles desabilitados durante a operação. Sucesso retorna à lista com confirmação e dados atualizados.

A tela provisória de detalhes oferece acesso à edição somente ao dono de registro OPEN. Detalhes completos, exclusão e atendimento permanecem na SPEC-006. A restrição visual não constitui autorização: os mocks revalidam regras no envio; a API real ainda não existe. Sessão real e redirecionamento automático ao login permanecem na etapa de autenticação; erros de sessão são apresentados. Alterações ficam em memória até recarregar a página. Nenhuma dependência nova foi mantida.

## Validação

- npm run check: guard de tokens/tv/shadcn Button, tipos, lint, Prettier, 27 testes e build. Quatro novos testes cobrem limites exatos e excedidos, espaços, catálogo, campos automáticos, permissões, sessão inativa, registro ausente e retry sem mutação após falha.
- Navegador: cadastro vazio e campos acima dos limites rejeitados; cadastro válido aparece OPEN na lista com confirmação. Edição por Enter atualiza título e preserva código/data/dono/status. Outro dono e registro concluído recusam acesso direto ao formulário.
- Cenário temporário com serviços injetados: falha NETWORK mantém título/descrição/categoria; clique duplo gera uma chamada; controles ficam desabilitados durante envio; retry salva e gera a segunda chamada. Arquivos temporários removidos após validação.
- Layout mobile de 390 x 844 sem overflow horizontal; foco visível no Textarea e navegação por Tab. Desktop conferido no navegador. Revisão do próprio implementador, sem revisão independente.
- Build mantém aviso preexistente de bundle acima de 500 kB. Validação remota de CI não executada.
