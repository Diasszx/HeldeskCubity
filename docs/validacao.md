# Relatório de validação

**Revisão:** 05/10/2026. Branch `feature/documentacao-entrega`, criada de `main` após a integração de Compose e observabilidade. Revisão e testes feitos pelo autor das alterações, sem revisão independente.

## Checks automatizados desta revisão

| Verificação executada               | Resultado                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `frontend/npm run check`            | PASSOU: design system, tipos, lint, formatação, 49 testes e build                   |
| `backend/npm run check`             | PARCIAL: Prisma, tipos e lint passaram; parou no format:check                       |
| `backend/npm test` separado         | PASSOU: 36 testes em 6 suítes, incluindo collector local Observe                    |
| `backend/npm run build` separado    | PASSOU: geração Prisma e compilação ESM                                             |
| `backend/npm run test:db`           | PASSOU: 110 testes em 5 suítes com PostgreSQL temporário separado                   |
| `frontend/npm run test:integration` | PASSOU: cenário dos services reais contra NestJS/PostgreSQL, sessão, cookies e CSRF |
| Build/start Compose isolado         | PASSOU: imagens construídas, migration terminou 0; db/api/web saudáveis             |
| Navegador integrado                 | PASSOU nos cenários abaixo; 15 screenshots reais                                    |

### Pendências e observações

O check completo do backend não passou nesta revisão: Prettier apontou `src/app.module.ts`, `src/config/environment.ts`, `src/main.ts`, `src/observability/observability.ts`, `test/observability.spec.ts`, `scripts/compose-smoke.mjs`, `scripts/https-smoke.mjs`, `scripts/prepare-database.mjs`, `package.json` e `eslint.config.mjs`. São arquivos preexistentes, sem alteração desta feature de documentação. Não se declara check verde com base em testes executados separadamente. Há alterações locais do usuário nas dependências preservadas fora dos commits; checks no host refletem esse working tree.

O build frontend emite aviso de bundle JS acima de 500 kB (cerca de 587 kB não comprimido). Os testes backend usam VM Modules experimental do Node. Avisos não impediram testes/build. Não foram executados nesta revisão: smoke Compose de reinício/recriação/down-up, smoke HTTPS, teste de carga, backup/restore, CI remoto ou ingestão real no dashboard Observe. Evidências históricas desses smokes, quando existentes, permanecem nos guias técnicos e não são atribuídas a esta execução.

## Ambiente de demonstração

Projeto Compose `cubity-docs`, porta web 8083, PostgreSQL 5435 e volume próprio `cubity-docs_postgres_data`. Arquivos locais de configuração/segredo não integram a entrega pública. Observe ficou desativado. Docker Desktop Linux foi iniciado para esta validação. O job aplicou a migration inicial e seed em banco novo; somente os dados fictícios de screenshots foram cadastrados.

Banco de testes: `cubity_support_test`, usuário `cubity_test`, serviço `cubity-docs-db-test-1`, porta 5436, tmpfs separado. O runner recebeu TEST_DATABASE_URL dedicada; não recebeu o banco de demonstração nem o volume do desenvolvimento.

Após a captura, os containers exclusivos de validação foram encerrados com `down`, sem `-v`. O volume de demonstração foi preservado. Os dois arquivos temporários de configuração desta tarefa foram removidos; nenhuma configuração local preexistente foi sobrescrita. A aba de validação foi fechada.

## Validação no navegador

| Cenário executado                 | Evidência/resultado                                                        |
| --------------------------------- | -------------------------------------------------------------------------- |
| Login com Enter e logout          | Identidade autenticada; retorno à tela de login                            |
| Cadastro com catálogos PostgreSQL | SOL-0001 a SOL-0004 criadas pela interface                                 |
| Edição de própria aberta          | Alteração salva; código/dono/abertura mantidos                             |
| Reload de rota SPA                | Sessão recuperada e quatro registros persistidos                           |
| Segundo usuário                   | Bruno consulta demanda de Ana sem editar/excluir; inicia atendimento       |
| Fluxo de status                   | Aberto → Em Atendimento → Concluído; UI final sem ação de retorno          |
| Filtros combinados                | Título + TI + Concluído retornaram uma demanda                             |
| Dashboard após filtros            | Continuou total 4 = 2 abertas + 1 em atendimento + 1 concluída             |
| Desktop 1440 × 1000               | Páginas e foco inspecionados; largura da página 1440                       |
| Mobile 390 × 844                  | Dashboard/listagem/login; sem overflow da página nos estados inspecionados |
| Menu por teclado                  | Enter abre; Escape fecha e retorna foco a Abrir menu                       |
| Confirmação de exclusão           | Foco inicial em Cancelar; Escape cancela e retorna a Excluir solicitação   |

Veja a [galeria](screenshots/README.md). Datas de abertura usam UTC e podem mostrar o dia seguinte à data local da revisão. A tabela mobile possui rolagem própria; não se declara que todo o conteúdo da tabela cabe em 390 px. A validação é focal, não uma auditoria integral de acessibilidade. Não se testaram manualmente todas as combinações inválidas nesta revisão; tests HTTP/SQL cobrem autorização, CSRF, concorrência e validação.

## Reproduzir os checks

Após `npm ci` em cada pasta:

```powershell
# Dentro de frontend
npm run check
# Dentro de backend
npm run check
```

Na raiz, iniciar banco dedicado:

```powershell
docker compose --profile test up -d --wait db-test
```

Em `backend`:

```powershell
$env:TEST_DATABASE_URL='postgresql://cubity_test:cubity-test-demo@127.0.0.1:5433/cubity_support_test?schema=public'
npm run test:db
Remove-Item Env:TEST_DATABASE_URL
```

Em `frontend`, contra o mesmo banco exclusivo:

```powershell
$env:TEST_DATABASE_URL='postgresql://cubity_test:cubity-test-demo@127.0.0.1:5433/cubity_support_test?schema=public'
npm run test:integration
Remove-Item Env:TEST_DATABASE_URL
```

Não executar esses testes em produção ou no banco de desenvolvimento. Para repetir com outro host port permitido, ajuste POSTGRES_TEST_PORT e URL mantendo banco/usuário exclusivos. [Guard, isolamento e CI](../backend/TESTING.md). Os testes de services frontend fazem HTTP real, mas não são E2E de navegador; esta revisão registra a validação manual do navegador separadamente.
