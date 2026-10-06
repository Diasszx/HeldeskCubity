# Banco e persistência

A API usa Prisma 7 em ESM com PostgreSQL 17. A migration versionada cria tabelas, enum, índices, FKs, checks, sequência e função de geração de códigos. Não usar db push como preparo de entrega.

## Modelo adotado

O modelo implementado sustenta os endpoints de negócio e a autenticação reais. UUIDs mantêm IDs como strings no contrato do frontend. O [dicionário completo](../docs/dicionario-de-dados.md) registra tipos, defaults, relações e índices.

| Tabela/campo                     | Tipo e regra                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| User.id                          | UUID gerado pelo banco; PK                                                                                |
| User.name                        | varchar(120), obrigatório                                                                                 |
| User.username                    | varchar(64), único, letras minúsculas ASCII, números, ponto, hífen ou underscore; começa com letra/número |
| User.passwordHash                | varchar(60), hash bcrypt; nunca incluir em respostas HTTP                                                 |
| Category.id / name               | UUID PK; varchar(80) obrigatório e único                                                                  |
| Request.id / code                | UUID PK; varchar(32) único gerado pelo banco                                                              |
| Request.title / description      | varchar(60) / varchar(1000), obrigatórios e não compostos apenas por espaços                              |
| Request.categoryId / requesterId | UUIDs obrigatórios com FK; exclusão de registros referenciados é bloqueada                                |
| Request.createdAt                | timestamptz(3), instante gerado pelo banco                                                                |
| Request.status                   | enum OPEN, IN_PROGRESS, COMPLETED; padrão OPEN                                                            |
| session.sid / sess / expire      | varchar PK, json obrigatório e timestamp(6) obrigatório, compatíveis com connect-pg-simple                |

Índices: Request(createdAt,id), (categoryId,createdAt), (status,createdAt), requesterId e session(expire). Os filtros por dia são inclusivos em UTC, conforme [QUERIES.md](QUERIES.md); timestamptz preserva os instantes.

next_request_code() consome uma sequência BIGINT atômica: SOL-0001, SOL-9999, SOL-10000. Não calcula count()+1, não trunca valores e não reutiliza números. Exclusões, rollbacks e erros podem deixar lacunas. A migration mantém a função e a sequência, que não são representadas como modelos Prisma. Checks e objetos SQL customizados devem ser preservados nas futuras migrations. Campos automáticos e regras de proprietário/transição são protegidos pelos services, inclusive nas escritas condicionadas.

## Desenvolvimento com Docker

Na raiz, com Docker Desktop Linux ativo:

```powershell
# Copie apenas se o arquivo local ainda não existir.
Copy-Item .docker/database.env.example .docker/database.env
# Ajuste as credenciais locais se necessário.
docker compose config --quiet
docker compose up -d db
docker compose ps
docker compose exec db psql -U cubity -d cubity_support -c 'SELECT version();'
```

A configuração de desenvolvimento contém credenciais públicas de demonstração. .docker/database.env é ignorado. O banco cubity_support publica 127.0.0.1:5432 e mantém dados no volume postgres_data. POSTGRES_PORT altera a porta do host. Variáveis POSTGRES_* inicializam somente volumes vazios: trocar senha no arquivo não altera uma conta existente. Não remova volume para corrigir credenciais.

Dentro de backend:

```powershell
npm ci
# Copie apenas se .env ainda não existir.
Copy-Item .env.example .env
# Ajuste DATABASE_URL conforme database.env e defina SESSION_SECRET próprio.
npm run db:deploy
$env:SEED_DEMO='true'
npm run db:seed
Remove-Item Env:SEED_DEMO
npm run dev
```

DATABASE_URL no host usa postgresql://cubity:SENHA@127.0.0.1:5432/cubity_support; no serviço API do Compose completo, usa db:5432. Codifique caracteres especiais da senha na URL. Nunca publique .env. npm run db:migrate cria migrations durante desenvolvimento; npm run db:deploy aplica somente as migrations versionadas e pode ser repetido. Não executa seed automaticamente.

O seed cria ana.demo (Ana Silva), bruno.demo (Bruno Costa), ambos com senha pública demo123, e categorias TI, RH, Compras, Financeiro e Infraestrutura. IDs são UUIDs e não os identificadores dos mocks. bcrypt 6 usa custo 12 neste seed; a política de autenticação está documentada em [AUTHENTICATION.md](AUTHENTICATION.md). SEED_DEMO=true é obrigatório e NODE_ENV=production é recusado. Registros existentes não têm senha, nome ou ID redefinidos. O seed não cria solicitações e não deve recuperar credenciais de contas existentes. Fora do Compose, é explícito; no Compose completo, o job de preparo o executa somente com SEED_DEMO=true.

```powershell
docker compose stop db
docker compose down
```

Esses comandos preservam o volume. Não utilizar down -v na rotina. Recriar o container com up -d --force-recreate db preserva o volume. O [Compose completo](../DOCKER.md) mantém esse serviço de banco e adiciona migrations, API e frontend, com instruções de backup e configuração HTTPS.

## Testes isolados

Na raiz:

```powershell
docker compose --profile test up -d db-test
```

Dentro de backend:

```powershell
$env:TEST_DATABASE_URL='postgresql://cubity_test:cubity-test-demo@127.0.0.1:5433/cubity_support_test'
npm run test:db
Remove-Item Env:TEST_DATABASE_URL
npm run check
```

O runner exige o nome cubity_support_test, usuário cubity_test e host local ou db-test; recusa NODE_ENV=production. Aplica migrations somente nesse banco antes dos testes. Limpa apenas registros identificados pela fixture, não tabelas inteiras. Os testes de seed e sessões usam rollback. A sequência do banco de testes é independente da de desenvolvimento.

O serviço db-test usa tmpfs e não monta postgres_data. Não é iniciado pelo comando normal do Compose. POSTGRES_TEST_PORT altera a porta publicada; ajuste a URL. Dados do banco de testes são temporários e não devem guardar trabalho. Para encerrar apenas testes: docker compose --profile test stop db-test. npm run check executa os testes sem banco; npm run test:db verifica persistência real separadamente e falha se a URL dedicada estiver ausente.

Referências: [migrations Prisma](https://www.prisma.io/docs/cli/v7/migrate), [schema de sessões](https://github.com/voxpelli/node-connect-pg-simple/blob/main/table.sql).

## Evidências verificadas

PostgreSQL 17.11 ficou saudável no Docker. A migration preparou o banco de desenvolvimento e o banco dedicado de testes; reaplicar deploy não encontrou migrations pendentes. migrate diff não encontrou diferenças entre banco e schema. O seed CLI foi executado duas vezes: dois usuários, cinco categorias, nenhuma solicitação; IDs e hashes existentes permaneceram iguais. A execução do seed com NODE_ENV=production foi recusada.

npm run check passou com tipos, lint, formatação, 15 testes e build ESM. npm run test:db passou com 10 testes de persistência: concorrência, código além de quatro dígitos, unicidade, FKs, limites de texto, formato/índice de sessão e seed idempotente preservando contas alteradas. O container de desenvolvimento foi recriado com --force-recreate --wait, mantendo o mesmo volume; IDs e dados dos usuários/categorias permaneceram iguais. Compose foi validado com config --quiet. Nenhum volume do usuário foi removido.
