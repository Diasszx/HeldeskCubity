# Publicação gratuita e CD — Render + Neon

## Estado da entrega

A configuração de CD está versionada em [render.yaml](../render.yaml). A aplicação recebe o React compilado e a API no mesmo serviço, com `/api` e cookie de sessão sob uma origem HTTPS. O Compose local continua disponível e independente.

**Aplicação publicada:** [Cubity Support](https://cubity-support-demo.onrender.com/login).

O painel fornecido pelo responsável confirma serviço Free, branch `main`, commit `90b1e19` (merge do PR #22), status Live e primeiro deploy por Blueprint. O Neon está no plano Free, branch `production`, região AWS US East 2 (Ohio). O provisionamento real foi concluído pelo agente e o responsável confirmou acesso. Conexões e segredo de sessão permanecem privados.

## Acesso público para avaliação

[Abra o Cubity Support](https://cubity-support-demo.onrender.com/login). Credenciais fornecidas pelo responsável, com publicação expressamente autorizada:

| Nome  | Usuário      | Senha            |
| ----- | ------------ | ---------------- |
| Ana   | `ana.demo`   | `anademo12345`   |
| Bruno | `bruno.demo` | `brunodemo12345` |

Use apenas dados fictícios neste ambiente compartilhado. Essas credenciais não incluem acesso ao banco nem o segredo de sessão. Publicar esta tabela não altera senhas existentes. A senha informada para Ana tem 11 caracteres: ela não atende ao mínimo de 12 para criar uma nova conta pelo provisionador. Para reproduzir em banco novo, escolha uma senha válida e atualize a documentação após configurá-la.

## 1. Criar o PostgreSQL no Neon

1. Crie uma conta em [Neon](https://neon.com/) e um projeto no plano **Free**, com PostgreSQL 17. Escolha região próxima de **US East / Virginia**, usada pelo Render neste Blueprint.
2. Use um banco exclusivo desta demonstração, separado de desenvolvimento e testes. No painel **Connect**, copie a URL PostgreSQL com TLS. Não envie a URL por chat, não grave no README e não versione arquivos com credenciais.
3. Separe duas URLs para o mesmo banco e usuário: a URL **pooled** (host com `-pooler`) para `DATABASE_URL` e a URL **direct**, sem pooler, para `DATABASE_MIGRATION_URL`. Ambas devem conter `sslmode=require` ou `sslmode=verify-full`; preserve os demais parâmetros fornecidos pelo Neon.
4. Guarde as URLs em um gerenciador de segredos. O projeto usa `pg`/`@prisma/adapter-pg`, sem trocar para o driver HTTP do Neon; negócio e sessões continuam em PostgreSQL.

Migrations usarão a URL direta, evitando a conexão de pooling para locks de migração. Não execute `test:db` neste banco: os testes recusam bancos cloud e exigem usuário/banco local exclusivo.

O comando de início adapta `sslmode=verify-full` para o `require` suportado pelo Prisma Migrate e fixa `sslaccept=strict`, preservando a verificação de certificado. A URL do runtime continua intacta.

## 2. Preparar GitHub e CI

Após revisar a branch `feature/cd-render`, publique-a e abra o PR para `main`. Aguarde **Frontend CI** e **Backend CI** aprovados antes do merge. Push/merge dependem de autorização do responsável pelo repositório.

Em **Settings → Rules → Rulesets** do GitHub, configure a proteção da `main` com PR obrigatório e os checks **Frontend quality** e **Backend quality and PostgreSQL integration** como obrigatórios, conforme disponibilidade do plano do repositório. Não marque esses jobs como opcionais nem adicione `continue-on-error`.

O Render usa `autoDeployTrigger: checksPass`. Não configure `On Commit`. Para GitHub, o Render também aceita conclusões `neutral` e `skipped`; nossos jobs de qualidade devem realmente executar. A proteção da branch complementa a espera do Render, não a substitui.

## 3. Criar o serviço no Render

1. Crie a conta em [Render](https://render.com/) e conecte **GitHub**, autorizando acesso ao repositório `Diasszx/HeldeskCubity`. Use a integração autenticada, não a opção **Public Git Repository**, que não oferece auto-deploy.
2. Após o merge autorizado, escolha **New → Blueprint**, selecione o repositório e a branch `main`. O Render encontrará `render.yaml` na raiz.
3. Confira **Web Service**, runtime **Node**, plano **Free** e região **Virginia**. Não aceite upgrade para plano pago ou criação de banco Render.
4. Quando solicitado, preencha `DATABASE_URL` (pooled) e `DATABASE_MIGRATION_URL` (direct) com as URLs do Neon. `SESSION_SECRET` será gerado pelo Blueprint; mantenha-o estável para preservar cookies após deploys. Observe fica desativado.
5. Confira os comandos: build `node backend/scripts/render-build.mjs`, início `node backend/scripts/render-start.mjs`, healthcheck `/api/health`, auto-deploy **After CI Checks Pass**. O build instala os lockfiles com dependências de desenvolvimento, compila as duas partes e não acessa o banco.
6. A criação/aplicação do Blueprint pode iniciar o **primeiro deploy imediatamente**. Só faça esta etapa quando a publicação externa estiver autorizada e o commit da `main` tiver CI aprovado. A espera dos checks controla os deploys automáticos seguintes.
7. Aguarde o status **Live**. Copie a URL real `https://<nome-atribuído>.onrender.com`. `APP_ORIGIN` é derivada de `RENDER_EXTERNAL_URL`; não invente um hostname nem preencha manualmente `RENDER_*` no painel. Domínios próprios não estão configurados nesta versão.

O início valida ambiente/build, aplica migrations versionadas pela URL direta e só então carrega o NestJS. Falhas impedem a abertura da porta. Como o plano Free não tem pre-deploy separado, as migrations rodam também em reinícios; são idempotentes pelo histórico do Prisma. Use migrations compatíveis com a versão anterior enquanto ela ainda estiver atendendo.

## 4. Provisionar usuários da demonstração

O plano gratuito não oferece shell ou jobs avulsos. Execute este comando **na sua máquina**, em `backend`, após `npm ci` e `npm run build`, usando as credenciais privadas da conexão direta do banco. Não crie endpoint público para provisionar contas.

```powershell
# Carregue DATABASE_URL e DEMO_USERS_JSON pelo seu gerenciador de segredos.
# DATABASE_URL: conexão direta Neon com TLS.
# DEMO_USERS_JSON: array JSON com 2 a 10 objetos { username, name, password }.
$env:CONFIRM_DEMO_PROVISION='cubity-demo'
node scripts/provision-demo.mjs
Remove-Item Env:CONFIRM_DEMO_PROVISION
Remove-Item Env:DEMO_USERS_JSON
Remove-Item Env:DATABASE_URL
```

Cada login é normalizado para minúsculas, tem até 64 caracteres e usa letras, números, ponto, hífen ou underscore, começando por letra/número. Nome tem até 120 caracteres. Senha exige pelo menos 12 caracteres e no máximo 72 bytes UTF-8; espaços são preservados. Não digite senhas literais em comandos que fiquem no histórico.

O comando exige confirmação explícita, TLS e migrations já aplicadas. Cria usuários e as categorias TI, RH, Compras, Financeiro e Infraestrutura em uma transação. Pode ser repetido: não redefine nomes, IDs ou senhas existentes e não cria solicitações. As contas de avaliação desta publicação foram autorizadas para divulgação pública; as conexões PostgreSQL e o segredo de sessão permanecem privados. `demo123` e o seed local não são usados na nuvem.

O build do Render fixa `VITE_SHOW_DEMO_CREDENTIALS=false`, retirando a dica de credenciais locais do login. Essa variável é pública e controla somente o texto; nunca coloque senhas ou URLs do banco em variáveis `VITE_*`.

### Procedimento realizado e solução do erro de login

1. Criaram-se as contas Render e Neon. O erro `render.yaml not found on main branch` foi resolvido disponibilizando o arquivo na `main` pelo PR #22. Criou-se o serviço por **New → Blueprint**, que ficou Live.
2. O login inicialmente falhou: `SEED_DEMO=false` impede a criação automática das contas e da senha local `demo123` na publicação.
3. Criou-se `backend/.env`, ignorado pelo Git, para receber a conexão direta do mesmo Neon e `DEMO_USERS_JSON`. O agente validou formato, TLS e senhas sem exibi-las. A primeira validação recusou senha fora do limite; após ajuste do responsável, os dois usuários passaram na validação.
4. Executou-se `node scripts/provision-demo.mjs` com `CONFIRM_DEMO_PROVISION=cubity-demo`. A restrição de rede local inicialmente retornou `EACCES`. A execução autorizada com acesso à rede concluiu: **Provisionamento concluído. Identidades e senhas existentes foram preservadas.**
5. Usuários e categorias foram criados ou preservados em transação. O responsável confirmou acesso; não foi necessário outro deploy.

Para repetir, execute `npm ci` e `npm run build` no backend, preencha o arquivo local `.env` com conexão direta e JSON de 2 a 10 usuários, e execute a confirmação e comando da seção anterior. As senhas precisam ter pelo menos 12 caracteres e no máximo 72 bytes UTF-8. O provisionador não redefine senhas existentes. Nunca versione `.env` nem execute testes de limpeza no banco publicado.

## 5. Como o CD funciona

```text
PR → CI aprovado → merge autorizado na main
  → CI do commit da main aprovado
  → Render: build dos lockfiles → migrations → início → healthcheck
  → versão disponível em HTTPS
```

O CD é nativo do Render; não há segundo workflow com token de deploy no GitHub. Builds do PR não publicam. Uma falha no build ou migrations bloqueia a nova versão. Confira o commit em **Deploys**, os logs sanitizados e `/api/health`. Esse endpoint prova que o processo responde; login e consultas comprovam o banco e o store de sessões.

## 6. Aceitação após a publicação

- Abra `/login` e `/requests` diretamente e recarregue. Confira login, criação, edição de solicitação aberta e atendimento sequencial até conclusão.
- No navegador, confira cookie `cubity.sid` com `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/api`; logout deve invalidar a sessão anterior. Origem/CSRF incorretos devem ser recusados.
- Em **Manual Deploy → Restart service**, reinicie sem trocar segredo/banco. Confirme que registros e sessão válida sobrevivem.
- Para comprovar o bloqueio, registre um PR com check falhando: a proteção deve impedir o merge. Para testar especificamente a espera do Render no commit da `main`, use um repositório/serviço de ensaio; não enfraqueça a proteção da `main` desta entrega. Registre o evento e o SHA no painel.
- Após um PR válido, registre CI aprovado e deploy automático do mesmo SHA. Capture telas da aplicação e do painel ocultando credenciais; atualize [evidências de CD](screenshots/CD.md), URL pública deste guia e README com os resultados reais.

## 7. Retorno à versão anterior e persistência

Se uma publicação causar regressão, desligue temporariamente auto-deploy, selecione uma das versões anteriores disponíveis em **Deploys** e use **Rollback**. Verifique o healthcheck e um fluxo autenticado; depois publique uma correção revisada e reative **After CI Checks Pass**. O plano Free limita as versões anteriores disponíveis.

Rollback de código **não desfaz migrations nem restaura dados**. Use alterações de schema compatíveis (adicionar antes de remover) e faça backup/exportação do banco antes de mudanças destrutivas. Nunca use `prisma migrate reset`, limpeza de testes ou `down -v` no banco da demonstração. Consulte a retenção do Neon e mantenha exportação própria quando necessário.

## 8. HTTPS, custos e limites

O Render termina TLS, redireciona HTTP público para HTTPS e encaminha HTTP para uma porta inacessível diretamente pela internet. Só com `HOSTING_PLATFORM=render`, `NODE_ENV=production` e variáveis oficiais coerentes, a aplicação assume esse contrato de TLS. Ela normaliza o protocolo e descarta `X-Forwarded-Host`/`X-Forwarded-For` recebidos, confiando somente no primeiro salto para o protocolo normalizado. Não use esse modo em VPS, porta pública ou com proxies/rotas privadas adicionais. Standalone/Compose continuam confiando apenas nos IPs explícitos de `TRUSTED_PROXY_IPS`.

Render Free tem 512 MB de RAM, 750 horas mensais por workspace e pausa após 15 minutos de inatividade; a retomada pode levar aproximadamente um minuto. Arquivos locais são efêmeros. Neon também possui cotas de compute, armazenamento e transferência e pode suspender compute ocioso. Esta entrega é demonstração, sem garantia de disponibilidade contínua ou teste de carga. Não habilite recursos pagos; confira cotas e política de cobrança nas contas.

## Validação local executada em 05/10/2026

| Verificação                                                        | Resultado                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check` no frontend com `VITE_SHOW_DEMO_CREDENTIALS=false` | Passou: guard do design system, tipos, lint, formatação, 49 testes e build. Aviso preexistente de bundle acima de 500 kB.                                                                                                                                                                                                       |
| `npm run check` no backend                                         | Passou: geração Prisma, tipos, lint, formatação, 73 testes em 8 suites e build.                                                                                                                                                                                                                                                 |
| `npm run test:db` no backend                                       | 112 testes em 5 suites passaram em PostgreSQL 17 exclusivo, porta 5437.                                                                                                                                                                                                                                                         |
| `npm run test:integration` no frontend                             | Cenário real frontend → NestJS → PostgreSQL passou.                                                                                                                                                                                                                                                                             |
| `node --test scripts/test-render-release.mjs`                      | 3 testes passaram: configuração inválida, build ausente e falha de migrations bloqueiam início sem expor URL/senha.                                                                                                                                                                                                             |
| Blueprint                                                          | `render.yaml` validado contra o JSON Schema oficial do Render; Blueprint aplicado: painel Live, commit `90b1e19`, confirmado pelo responsável.                                                                                                                                                                                  |
| Comando real de início e provisionamento                           | Emulação local do Render com PostgreSQL TLS: migrations, início, cookie Secure, login privado e origem falsificada conferidos. Provisionamento executado duas vezes sem duplicação. Sessão e solicitação preservadas após reinício do processo. Certificado exclusivo de teste, com CA explícita e sem desabilitar verificação. |
| Navegador                                                          | Login, rotas diretas, cadastro, transições, recarga e logout conferidos. Desktop 1280 px e mobile 390 px; foco por Tab visível e sem overflow horizontal no login mobile. [Capturas locais](screenshots/CD.md).                                                                                                                 |

A configuração de finais de linha em `.gitattributes` mantém LF no checkout, evitando falhas locais de Prettier por conversão automática para CRLF. Checks executados pelo implementador; não houve revisão independente. Publicação e provisionamento real estão confirmados. A espera dos checks em deploy posterior, o bloqueio remoto por CI e a persistência após reinício cloud ainda exigem evidências específicas; o primeiro deploy por Blueprint não comprova esses cenários.

## Referências verificadas em 05/10/2026

- [Render: Blueprint e checksPass](https://render.com/docs/blueprint-spec)
- [Render: deploys, pre-deploy e CI](https://render.com/docs/deploys)
- [Render: porta, TLS e GitHub](https://render.com/docs/web-services)
- [Render: variáveis oficiais](https://render.com/docs/environment-variables)
- [Render: limites gratuitos](https://render.com/docs/free)
- [Neon: plano gratuito](https://neon.com/blog/neon-free-plan-1-gb-per-project)
- [Express: limites da confiança em proxies](https://expressjs.com/en/guide/behind-proxies/)
- [Prisma: parâmetros TLS da conexão](https://docs.prisma.io/docs/orm/core-concepts/supported-databases/postgresql)

## Evidência posterior do CD e da observabilidade

Captura fornecida pelo responsável em 05/10/2026: o commit `44356b3` aparece Live e possui um deploy concluído com origem **Auto-Deploy**. O merge do PR #24, commit `8193636`, aparece em **Building**, também por Auto-Deploy. A imagem comprova acionamento automático e uma publicação anterior concluída; não comprova conclusão do deploy `8193636` nem bloqueio por falha de CI. O Service ID foi ocultado na imagem fornecida.

Captura fornecida pelo responsável em 05/10/2026: o NestJS Observe apresenta 2 requisições na janela de 1 hora, duração média de 4,26 ms, P95 de 5,80 ms e nenhum erro registrado nessa amostra. Isso evidencia ingestão de telemetria no painel; não comprova cobertura completa, alertas ou desempenho sob carga. A versão exibida é `0.1.0`, portanto esta captura não valida a identificação automática pelo commit.

Veja as [duas capturas e suas legendas](screenshots/CD.md#atualização--deploy-automático-e-ingestão-observe). A ausência de erros nessa amostra não substitui testes de falhas ou a comprovação do gate de CI.
