# Aplicação completa com Docker Compose

## Execução local

Requer Docker com Compose 2.24.4 ou superior (o override HTTPS usa `!override`) e acesso aos registries para o primeiro build. Node/npm no host não são necessários para iniciar a aplicação: as imagens instalam os lockfiles e fazem os builds. Na raiz, prepare os arquivos locais, sem sobrescrever configurações existentes:

```powershell
Copy-Item .docker/database.env.example .docker/database.env
Copy-Item .docker/application.env.example .docker/application.env
```

Substitua `SESSION_SECRET` por um valor aleatório de pelo menos 32 caracteres. Para gerá-lo usando apenas Docker:

```powershell
docker run --rm node:24.21.0-bookworm-slim node --input-type=module -e "import {randomBytes} from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
```

Coloque o resultado em `application.env` e mantenha o mesmo segredo entre reinícios para preservar sessões. Não versionar ou compartilhar os arquivos locais. O `DATABASE_URL` precisa corresponder ao usuário, senha e banco de `database.env`, usando o host interno `db` e porta `5432`. Caracteres especiais da senha precisam de codificação na URL.

Depois de preparar as variáveis, um comando inicia toda a aplicação:

```powershell
docker compose up --build -d --wait --wait-timeout 180
```

Abra **http://127.0.0.1:8080**. `docker compose up --build` também funciona em primeiro plano. A API não publica uma porta própria: `/api` passa pelo Nginx na mesma origem do frontend. As rotas da SPA, como `/requests`, também funcionam ao abrir diretamente ou recarregar.

O banco aguarda `pg_isready`. O job `migrate` aplica migrations versionadas e só então libera a API; erro no job impede seu startup. Com `SEED_DEMO=true`, o job cria `ana.demo` e `bruno.demo` (senha `demo123`) e cinco categorias. O seed preserva IDs, senhas e registros existentes e não cria solicitações. `SEED_DEMO=false` desativa essa carga. O seed demo é recusado em produção.

`api` e `web` têm healthchecks de processo/HTTP; o health da API não é uma consulta ao PostgreSQL. A verificação separada do banco e os testes de fluxo complementam esses checks. Use `docker compose ps` e `docker compose logs migrate api web` para conferir o estado. O job encerrado com código 0 é esperado.

O HTTP local usa `NODE_ENV=development`, cookie HttpOnly/SameSite=Lax e CSRF. Esse modo é exclusivo do desenvolvimento local. Para outra porta, defina `APP_PORT` antes do Compose e ajuste `APP_ORIGIN` para a URL exata, por exemplo porta `8082` e `http://127.0.0.1:8082`. `POSTGRES_PORT` muda apenas a publicação local do banco; a API continua usando `db:5432`. A configuração mantém a porta PostgreSQL existente em 5432 para os fluxos de desenvolvimento sem containers de aplicação.

## Imagens e proxy

Os Dockerfiles usam Node 24.21.0 Bookworm Slim e Nginx 1.30.4 Alpine, com versões explícitas. Os estágios separam build, ferramenta de migrations e runtime; a API usa dependências de produção e executa ESM como usuário `node`. O Nginx executa como `nginx` em portas sem privilégios. Arquivos `.env`, dependências do host, builds locais, checkout separado, agentes e specs são excluídos dos contextos Docker.

Nginx serve os arquivos compilados e encaminha `/api/` com caminho/query intactos, cookies e origem do navegador. Usa o resolvedor interno do Docker para reencontrar a API após recriação. Define os próprios cabeçalhos de encaminhamento, sem copiar `X-Forwarded-Proto` enviado pelo cliente. O build atual do frontend ainda emite aviso de bundle acima de 500 kB.

## Persistência e migrations

`postgres_data` mantém solicitações, usuários, categorias, sequência de códigos e sessões no servidor. O nome do projeto permanece `cubity-support`; trocar o nome com `-p` cria outro volume. Reiniciar/recriar containers ou executar `docker compose down` preserva o volume. Não usar `down -v` na rotina.

```powershell
docker compose restart
docker compose up -d --force-recreate --wait
docker compose down
docker compose up -d --wait
```

O job de migrations é a única etapa de preparo; a API não executa migrations em cada processo. `migrate deploy` não gera migrations novas. Alterações de schema devem ser versionadas e revisadas antes do build. Depois de uma atualização, use `up --build` para reconstruir as imagens; para reaplicar o job explicitamente, `docker compose run --rm migrate`. Não rodar jobs concorrentes de migração/seed.

Sessões permanecem válidas enquanto cookie, TTL, usuário, banco e `SESSION_SECRET` forem válidos. Trocar o segredo invalida cookies anteriores. As variáveis `POSTGRES_*` inicializam apenas volumes vazios: editar o arquivo de ambiente não altera automaticamente contas/senhas de um banco já criado.

## HTTPS e configuração de produção

O override `compose.production.yaml` ativa TLS no Nginx, retira a porta publicada do banco, força `NODE_ENV=production`, desativa o seed demo e configura a API para confiar exclusivamente no IP fixo do proxy `172.30.0.10`. Não usar `trust proxy=true` indiscriminadamente.

Prepare certificados válidos para seu domínio em `.docker/tls/fullchain.pem` e `.docker/tls/privkey.pem`, credenciais privadas do banco, um segredo de sessão forte e `APP_ORIGIN=https://seu-dominio:8443` em `application.env` (ou a origem real após encaminhamento externo). Os certificados são montados como secrets; nunca entram nas imagens. Confira disponibilidade da sub-rede `172.30.0.0/24`; caso precise mudá-la, ajuste também o IP do web e `TRUSTED_PROXY_IPS` do override.

A chave precisa ser legível pelo usuário/grupo `nginx` (UID/GID 101), mantendo acesso restrito. Em um host Linux, uma opção é proprietário root, grupo 101 e permissão 640; o certificado público pode usar 644. Compose monta secrets de arquivo como bind mounts e ignora `uid/gid/mode` nessa modalidade: ajuste as permissões do arquivo no host, conforme a [documentação do Compose](https://docs.docker.com/reference/compose-file/services/#secrets). Não resolver falhas de leitura executando o Nginx como root ou liberando a chave para todos.

```powershell
docker compose -f compose.yaml -f compose.production.yaml config --quiet
docker compose -f compose.yaml -f compose.production.yaml up --build -d --wait
```

A porta TLS padrão é 8443, publicada somente em loopback. Uma implantação externa precisa definir domínio, encaminhamento seguro, certificados e política de acesso conforme sua infraestrutura. Se a porta mudar com `HTTPS_PORT`, ajuste também a origem. O cookie passa a ser Secure; a API recusa acesso de sessão por HTTP sem um proxy confiável informando HTTPS. O endpoint HTTP interno do Nginx serve apenas o healthcheck. Não colocar um terminador TLS adicional na frente sem revisar o encaminhamento de protocolo.

Este repositório não provisiona contas privadas de produção nem automatiza emissão/renovação de certificados. O modo demo não é um mecanismo de provisionamento produtivo. A validação HTTPS local usou certificado exclusivo de teste, verificado por um cliente Node com essa CA explícita; isso não é um deploy nem comprova certificados de um domínio real.

## Backups

Backups contêm dados e sessões; mantenha-os privados, fora do Git, com proteção e retenção adequadas. Exemplo de backup lógico sem redirecionar binários pelo PowerShell:

```powershell
New-Item -ItemType Directory -Force .docker/backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /tmp/cubity-backup.sql'
docker compose cp db:/tmp/cubity-backup.sql .docker/backups/cubity-backup.sql
```

Copie o backup para armazenamento seguro separado do host/volume. Teste a restauração em um banco vazio e isolado antes de depender do arquivo. Para restaurar, copie o SQL ao container e use `psql -v ON_ERROR_STOP=1 -f`; pare os escritores e confirme o destino antes de qualquer restauração. Não restaurar automaticamente sobre dados existentes nem remover o volume como procedimento de backup.

## Validação reproduzível

`docker compose config --quiet` valida configuração sem imprimir segredos. O smoke `backend/scripts/compose-smoke.mjs` exige `COMPOSE_SMOKE=validation` e atua somente no projeto `cubity-compose-check`, na porta 8081. Esse projeto deve ter seu próprio volume, `POSTGRES_PORT=5434`, `APP_PORT=8081` e um override local `.docker/validation.compose.yaml` que acrescente `.docker/validation.env` aos `env_file` de `api` e `migrate`. Esse arquivo replica `application.env`, mudando a origem para `http://127.0.0.1:8081`. Não usar o projeto de desenvolvimento como substituto.

```powershell
$validationEnv = (Get-Content .docker/application.env -Raw) -replace '(?m)^APP_ORIGIN=.*$', 'APP_ORIGIN=http://127.0.0.1:8081'
Set-Content .docker/validation.env $validationEnv
@'
services:
  migrate:
    env_file:
      - .docker/validation.env
  api:
    env_file:
      - .docker/validation.env
'@ | Set-Content .docker/validation.compose.yaml
$env:POSTGRES_PORT='5434'
$env:APP_PORT='8081'
docker compose -p cubity-compose-check -f compose.yaml -f .docker/validation.compose.yaml up --build -d --wait
$env:COMPOSE_SMOKE='validation'
node backend/scripts/compose-smoke.mjs
```

O smoke verifica login, cookies/CSRF, cadastro/edição, filtros UTC, dashboard, dono/status, exclusão e logout. Reinicia, recria e executa `down`/`up` exclusivamente nesse projeto; verifica que a sessão e solicitação persistiram e que IDs/hashes de contas não foram alterados pelo seed. Mantém uma solicitação concluída no volume exclusivo como evidência. O smoke HTTPS usa o projeto `cubity-compose-https-check` e certificado de teste separado; verifica Secure/HttpOnly/SameSite, origem e CSRF, sem desativar verificação de certificados. Arquivos locais de validação/certificados são ignorados pelo Git.

Referências das imagens oficiais: [Node](https://github.com/nodejs/docker-node), [Nginx](https://github.com/nginx/docker-nginx). Configuração HTTPS baseada no [módulo SSL do Nginx](https://nginx.org/en/docs/http/ngx_http_ssl_module.html); tags de override conforme [merge do Compose](https://docs.docker.com/reference/compose-file/merge/).
