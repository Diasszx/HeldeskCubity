# Banco de dados e scripts de criação

PostgreSQL 17 armazena usuários, categorias, solicitações e sessões. O modelo completo está no [dicionário](dicionario-de-dados.md).

## Artefatos entregues

| Arquivo                                                                            | Papel                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [schema.prisma](../backend/prisma/schema.prisma)                                   | Modelos Prisma e geração do cliente ESM                                      |
| [migration.sql](../backend/prisma/migrations/20261003160000_initial/migration.sql) | Script SQL completo: tabelas, enum, índices, FKs, checks, função e sequência |
| [migration_lock.toml](../backend/prisma/migrations/migration_lock.toml)            | Provedor das migrations                                                      |
| [seed-demo.ts](../backend/src/prisma/seed-demo.ts)                                 | Carga idempotente de colaboradores e categorias demo                         |
| [prepare-database.mjs](../backend/scripts/prepare-database.mjs)                    | Preparo usado pelo job do Compose                                            |

## Criação recomendada

No Compose completo, o job `migrate` executa `prisma migrate deploy` antes de iniciar a API. Fora dele, após configurar `backend/.env`, execute em `backend`:

```powershell
npm ci
npm run db:deploy
$env:SEED_DEMO='true'
npm run db:seed
Remove-Item Env:SEED_DEMO
```

`db:deploy` aplica somente migrations versionadas e registra o histórico. `db:migrate` é ferramenta de desenvolvimento para produzir novas migrations, não o comando de instalação. Não usar `db push` como entrega.

O SQL também pode ser inspecionado ou aplicado com `psql -v ON_ERROR_STOP=1 -f migration.sql` em um banco PostgreSQL **vazio e isolado**, mas aplicação manual não registra `_prisma_migrations`. Não misturar esse método com deploy sem reconciliar o histórico. A migration inicial não é idempotente para execução manual; use Prisma para instalação/repetição.

## Seed e persistência

Seed explícito e não produtivo: `ana.demo` e `bruno.demo`, senha pública `demo123`; cinco categorias; nenhuma solicitação inicial. `SEED_DEMO=true` é obrigatório, e `NODE_ENV=production` é recusado. Registros existentes preservam nome, ID e senha; repetir seed não recupera credenciais alteradas.

`postgres_data` persiste dados, sequência e sessões. `docker compose down` preserva o volume; `down -v` não faz parte da rotina. Variáveis `POSTGRES_*` só inicializam volumes vazios. Mudar a senha no arquivo não altera o usuário de um banco existente.

## Testes e backup

Banco exclusivo `cubity_support_test`, usuário `cubity_test`, serviço `db-test` com tmpfs e porta padrão 5433. O runner rejeita destinos fora do banco de testes e ambientes de produção. Veja [validação](validacao.md) e [TESTING.md](../backend/TESTING.md).

Backup/restore contém dados privados e sessões. O procedimento e os cuidados de restauração em destino isolado estão em [DOCKER.md](../DOCKER.md#backups). Screenshots devem usar dados demo, nunca hashes, sessões, strings de conexão ou dumps reais.
