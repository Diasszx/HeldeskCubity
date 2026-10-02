# SPEC-008 — Login e sessão

Branch feature/login-sessao, criada da main sincronizada com o merge da SPEC-007.

## Implementação

Serviços oferecem login, usuário atual e logout. A instância da aplicação inicia sem identidade; createMockServices mantém seu padrão de usuário para os testes existentes. Credenciais públicas de demonstração: ana.demo ou bruno.demo, senha demo123. Login valida usuário/senha, logout remove a identidade e operações posteriores são recusadas pelos serviços simulados. Não há tokens, cookies ou identidade persistida no localStorage/sessionStorage.

AuthProvider representa loading, autenticado, não autenticado e erro de verificação com retry. Consulta users.current ao carregar. Gerações ignoram consultas antigas e desmontagem impede atualização tardia. Um adaptador observa UNAUTHENTICATED nos recursos, limpa o contexto e informa expiração; credencial inválida não dispara evento global. Falha NETWORK no logout preserva o contexto e permite retry.

RequireSession protege as rotas privadas. LoginForm usa React Hook Form, Zod, resolver e componentes shadcn existentes; usuário trata espaços e senha conserva seu conteúdo. Campos obrigatórios, erros visíveis, entradas preservadas em falha e bloqueio síncrono de duplo envio. Retorno após login aceita apenas destinos internos normalizados de dashboard/requests; URLs externas, barras invertidas e caminhos que escapam dessas áreas voltam ao dashboard. Cabeçalho mostra identidade e Sair.

## Validação

- npm run check passou: guard do design system, tipos, lint, formatação, 40 testes e build. Quatro testes novos cobrem schema/destinos, credenciais/identidade/logout, falhas com retry e evento de expiração com unsubscribe.
- Navegador: acesso direto aos detalhes redireciona ao login; campos vazios e senha inválida mostram erros; login por Enter retorna aos detalhes originais. Logout volta ao login. Login como Bruno conserva consulta/atendimento e remove edição da solicitação de Ana. Recarregar a página restaura estado não autenticado da demonstração.
- Harness com serviços injetados: loading da verificação inicial; falha de consulta com retry; identidade existente recuperada sem novo login; falha NETWORK no logout mantém sessão e retry encerra; falha de login preserva entradas e clique duplo produz uma chamada; retry entra. Expirar identidade e consultar recurso remove a tela privada e mostra login com mensagem de sessão expirada. Arquivos temporários removidos.
- Login e cabeçalho autenticado em mobile 390 x 844 sem overflow horizontal; foco visível por Tab no campo Senha e login por Enter. Evidência de desktop 1280 x 900 salva. Revisão do próprio implementador, sem revisão independente.

## Limitações

Autenticação explicitamente simulada, sem segurança ou cookie de sessão real. API/backend deverão validar credenciais, regenerar e invalidar sessão, definir TTL/cookie/CSRF e mapear HTTP 401 para UNAUTHENTICATED na integração. Recarregar reinicia identidade e dados; abas não compartilham sessão. Expiração é observada ao consultar/alterar recurso; não há polling. Nenhuma dependência nova mantida. Build conserva aviso preexistente de chunk acima de 500 kB; CI remoto não executado.
