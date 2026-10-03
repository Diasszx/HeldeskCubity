# Testes e CI do backend

O workflow [.github/workflows/backend-ci.yml](../.github/workflows/backend-ci.yml) executa em pull requests para main, pushes na main e workflow_dispatch. Usa Node 24 conforme .nvmrc, npm ci com lockfile, permissões contents:read, checkout sem persistir credenciais e timeout de 20 minutos. O serviço PostgreSQL 17 aguarda pg_isready e existe somente durante o job, sem volume de desenvolvimento ou credenciais de produção.

As etapas executam npm run check (geração Prisma ESM, tipos, lint, formatação, Jest e build) e npm run test:db duas vezes consecutivas. Falha em qualquer comando impede as etapas seguintes. As migrations usam migrate deploy antes de cada suite de integração; nenhuma alteração destrutiva é feita para preparar o banco.

## Reproduzir localmente

Na raiz, iniciar somente o banco dedicado:

```powershell
docker compose --profile test up -d --wait db-test
```

Dentro de backend, após instalar as dependências com npm ci:

```powershell
npm run check
$env:TEST_DATABASE_URL='postgresql://cubity_test:cubity-test-demo@127.0.0.1:5433/cubity_support_test?schema=public'
npm run test:db
if ($LASTEXITCODE -ne 0) { throw 'Integração falhou.' }
npm run test:db
```

Ao terminar, docker compose --profile test stop db-test na raiz. Não usar down -v. O serviço local usa tmpfs exclusivo; o banco de desenvolvimento mantém seu volume independente. No CI, a porta é 5432 do serviço descartável; localmente é 5433 por padrão.

## Proteção e isolamento

Todas as suítes usam test/support/test-database.ts antes de abrir o cliente Prisma ou aplicar migrations. TEST_DATABASE_URL é obrigatório e não recebe fallback de DATABASE_URL. Nome do banco deve ser cubity_support_test; usuário, cubity_test; host, 127.0.0.1, localhost ou db-test. NODE_ENV=production é recusado, inclusive em caixa diferente. URL malformada, fragmentos e parâmetros que desviem host, banco ou usuário são recusados. O único parâmetro permitido é schema=public. Erros não imprimem a URL nem credenciais.

O preparo verifica o resultado e limita cada comando de migrations a 45 segundos. Jest integra as suítes em sequência com runInBand. Fixtures usam identidades próprias; cleanup exclui somente os registros/sessões criados pela respectiva suíte. O teste de dashboard vazio exige banco dedicado sem solicitações preexistentes e não as remove. Repetir a suíte no mesmo serviço comprova que as fixtures não contaminam a execução seguinte; sequências podem avançar e manter lacunas, conforme DATABASE.md.

## Cobertura e evidências

O check local passou com 33 testes em cinco suites, tipos, lint, formatação e build ESM. Os 110 testes de integração passaram duas vezes consecutivas no mesmo banco, cobrindo login, persistência e expiração de sessão, logout/cookie antigo, CSRF, payloads, dono/status, corridas controladas, filtros UTC e dashboard. Os novos testes verificam recusa de conexões inseguras e ausência de credenciais no erro. Uma execução deliberadamente insegura da suíte de persistência retornou código 1 antes das migrations, sem mostrar a senha de teste.

Compose foi validado e db-test alcançou o estado healthy. npm ci passou pelo lockfile, incluindo a geração automática do Prisma ESM. O YAML do workflow foi validado localmente. A confirmação de execução remota depende do push/PR e do resultado em GitHub Actions; não há resultado remoto desta entrega ainda. Cenários integrados do frontend SPEC-009 serão acrescentados quando essa integração existir. Dockerfiles e inicialização de toda a aplicação pertencem à etapa seguinte.

Referências: [PostgreSQL como serviço GitHub Actions](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers), [setup-node](https://github.com/actions/setup-node).
