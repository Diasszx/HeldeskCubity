# Observabilidade da API

O SDK oficial `@nestjs/observe` 0.3.6 integra o hook `instrument` de NestJS 12.1.2 à árvore de módulos. A coleta permanece **desativada por padrão**: sem módulo, hook, worker ou envio quando `OBSERVE_ENABLED=false`. Esta integração não cria conta, projeto, alertas nem dashboard no serviço externo.

## Pontos avaliados e cobertura

| Ponto                                                             | Sinal ao habilitar                                                                       | Uso operacional                                                                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Login, usuário atual, logout e CSRF                               | Rota, método, status, duração, spans de controller/service/guard/pipe                    | Identificar aumento de 401/403 e latência de autenticação; distinguir controle de acesso e falha interna           |
| Cadastro, consulta, filtros, edição, exclusão e mudança de status | Lifecycle Nest, spans dos services e erros/resultado HTTP                                | Encontrar regressões, operações lentas e conflitos 409                                                             |
| Catálogos e dashboard                                             | Duração total e por método                                                               | Separar custo dos catálogos e agregações                                                                           |
| Prisma com adapter `pg` e sessões PostgreSQL                      | Instrumentação automática do driver, quando executado dentro de uma requisição rastreada | Correlacionar espera de persistência e queries repetidas; SDK normaliza SQL removendo literais e não lê parâmetros |
| Processo Node                                                     | Memória, CPU, GC e event loop a cada 60 segundos                                         | Investigar pressão de recursos e acompanhar heartbeat                                                              |
| Logs locais Nest                                                  | Trace ID gerado pelo SDK                                                                 | Correlacionar diagnóstico local com execução do dashboard                                                          |

Health e Swagger são excluídos para reduzir ruído. HTTP de saída é desativado: o projeto não precisa de integrações remotas de negócio e não deve propagar identificadores a serviços externos. Não há filas, WebSockets ou microserviços neste escopo.

O hook acompanha o lifecycle de **requisições** e chamadas instrumentadas; não equivale a um registro completo de bootstrap, migrations ou encerramento. Falhas antes do SDK iniciar continuam no tratamento de bootstrap existente. A disponibilidade do banco deve continuar sendo verificada pelos mecanismos de infraestrutura; o endpoint health atual não consulta PostgreSQL. Operações de sessão executadas fora do contexto rastreado podem não produzir spans correlacionados.

## Privacidade e limites diagnósticos

- `http.capture=false`: não enviar headers nem body, incluindo cookies, senha e sessão. Não cadastrar `getUserId` nem atributos derivados do usuário.
- Mascarar toda query string, inclusive títulos/filtros; conservar o caminho HTTP e o template da rota. IDs opacos em caminhos de solicitações podem aparecer no URL original; nomes e dados pessoais não devem ser inseridos nesses caminhos.
- Gerar trace IDs internamente com UUID v7, sem aceitar `x-request-id` do cliente. A integração não retorna esse ID ao navegador nem configura tracing distribuído.
- `sourceContext=false` e `forwardLogs=false`: não enviar código-fonte nem conteúdo dos logs.
- A redaction adicional remove integralmente texto livre de mensagens e stacks de erro, pois erros Prisma podem incluir entrada multilinha e até conteúdo parecido com frames. Classe, spans, resultado e duração permanecem disponíveis. **Mensagem detalhada e stack não estarão disponíveis no dashboard**; diagnóstico desses detalhes depende de investigação local segura. Redaction padrão de segredos também permanece habilitada.
- SQL é sanitizado pelo SDK; nomes de tabelas/colunas e métodos são metadados técnicos enviados. Nunca acrescentar argumentos, resultados, IDs de usuário ou conteúdo de solicitações a tags/spans.

Telemetria é diagnóstico técnico, não trilha de auditoria de ações de usuários. Amostragem, buffers e indisponibilidade do collector podem descartar eventos. Não há garantia de entrega nem política de retenção configurada por esta aplicação. Avaliar contrato, retenção, limites/custos do Observe e autorização para exportação antes de habilitar em um ambiente com dados reais.

## Ativação

1. Instalar as dependências com `npm ci` dentro de `backend`.
2. Preparar o `.env` com as variáveis do exemplo. Definir `OBSERVE_ENABLED=true`, `OBSERVE_APP_KEY` e `OBSERVE_APP_SECRET` do projeto Observe autorizado. Manter credenciais em secret manager ou ambiente local ignorado pelo Git.
3. Definir `OBSERVE_SERVICE_ID` por instância (até 100 caracteres). No Render (`RENDER=true`), a versão usa automaticamente `RENDER_GIT_COMMIT` a cada deploy; não cadastre `OBSERVE_SERVICE_VERSION` no painel para usar esse comportamento. Uma versão explícita em `OBSERVE_SERVICE_VERSION` tem prioridade, quando necessária. Fora do Render ou sem commit disponível, o padrão é `0.1.0`. Versão tem até 50 caracteres; ID e versão aceitam somente letras, números, ponto, hífen e underscore.
4. Definir `OBSERVE_ENDPOINT` do collector. HTTPS é obrigatório fora de localhost; somente HTTP loopback é aceito para testes. URL não pode conter credenciais, query, fragmento ou caminho adicional. O padrão aponta ao serviço oficial NestJS Observe.
5. Definir `OBSERVE_SAMPLE_RATE` entre maior que zero e 1 (padrão 1). Zero é rejeitado, pois o SDK interpreta zero como taxa padrão; para desligar usar `OBSERVE_ENABLED=false`.
6. Reiniciar a API. Gerar tráfego de teste e verificar rotas, classes, duração, status e queries normalizadas no dashboard autorizado. Flush em 5 segundos, com até 1.000 traces por batch; métricas de runtime em 60 segundos.

Configuração inválida informa somente nomes de variáveis, sem revelar valores. Uma chave inválida ou falha de rede não deve ser interpretada como observabilidade funcional: conferir ingestão no dashboard e diagnósticos do SDK. Não habilitar debug/log forwarding para contornar essa integração sem revisar privacidade.

## Validação

`test/observability.spec.ts` usa NestFactory com o hook real e um collector HTTP efêmero em `127.0.0.1`, com credenciais fictícias. Verifica spans de controller/service, erro HTTP, opt-in estrito e ausência dos sentinelas de body, cookie, query, trace ID externo e mensagem/stack multilinha no payload exportado. Nenhum teste precisa de conta Observe nem exporta para a nuvem.

O teste local não demonstra ingestão no dashboard oficial, métricas ao longo de 60 segundos, sanitização de todas as possíveis queries PostgreSQL ou alertas. A cobertura de banco requer validação com PostgreSQL e tráfego real no ambiente autorizado. Configurar alertas de 5xx, latência, heartbeat e saturação no dashboard após medir a linha de base; o SDK não cria essas regras automaticamente.

Referência: [SDK oficial NestJS Observe](https://docs.nestjs.com/observability/sdk).

### Ativação no Render

Em **cubity-support-demo → Environment**, configure `OBSERVE_APP_KEY` e `OBSERVE_APP_SECRET` como segredos e altere `OBSERVE_ENABLED` para `true`. Mantenha `OBSERVE_SERVICE_ID=cubity-support-api`, `OBSERVE_ENDPOINT=https://observe-api.nestjs.com` e `OBSERVE_SAMPLE_RATE=1`. Remova uma versão manual antiga para acompanhar cada commit automaticamente após publicar esta mudança. O Blueprint atual ainda declara `OBSERVE_ENABLED=false`; uma sincronização pode restaurá-lo. Esta mudança automatiza somente a versão e não ativa coleta sem as credenciais.

Após deploy, gere tráfego autenticado de consulta e confira a versão no painel Observe. Traces são enviados em intervalos de 5 segundos; métricas de runtime em 60 segundos. Health está excluído. Testes locais não comprovam ingestão no serviço oficial.

Referência: [variáveis automáticas do Render](https://render.com/docs/environment-variables).
