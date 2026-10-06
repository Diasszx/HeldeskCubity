# Guia completo de execução

## Opção 1 — aplicação completa com Docker Compose

Pré-requisitos: Git para obter o código, Docker Desktop com containers Linux e plugin Compose **2.24.4 ou superior**. Acesso aos registries no primeiro build. Portas locais padrão livres: **8080** (web) e **5432** (PostgreSQL). Node/npm no host são dispensáveis nesta opção.

```powershell
git clone https://github.com/Diasszx/HeldeskCubity.git
cd HeldeskCubity
```

Prepare os arquivos somente se ainda não existirem:

```powershell
if (!(Test-Path .docker/database.env)) {
  Copy-Item .docker/database.env.example .docker/database.env
}
if (!(Test-Path .docker/application.env)) {
  Copy-Item .docker/application.env.example .docker/application.env
}
```

Edite `.docker/application.env` antes de iniciar:

- Substitua SESSION_SECRET por um segredo aleatório próprio com pelo menos 32 caracteres; conserve entre reinícios.
- DATABASE_URL deve corresponder ao banco/usuário/senha de `.docker/database.env`; **dentro do Compose o host é db:5432**.
- APP_ORIGIN é `http://127.0.0.1:8080`, sem barra final. Use essa mesma origem no navegador.
- `SEED_DEMO=true` cria as contas/categorias de demonstração; é recusado em produção.
- Observe é desativado por padrão; não exige conta/credencial para executar o portal.

Geração de segredo, usando Docker:

```powershell
docker run --rm node:24.21.0-bookworm-slim node --input-type=module -e "import {randomBytes} from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"
```

Copie o resultado para SESSION_SECRET; não compartilhe/versione os arquivos locais. Caracteres especiais da senha precisam de codificação na URL.

```powershell
docker compose config --quiet
docker compose up --build -d --wait --wait-timeout 180
docker compose ps -a
```

| Serviço            | Endereço                            |
| ------------------ | ----------------------------------- |
| Portal             | http://127.0.0.1:8080               |
| Swagger            | http://127.0.0.1:8080/api/docs      |
| OpenAPI            | http://127.0.0.1:8080/api/docs-json |
| Health HTTP        | http://127.0.0.1:8080/api/health    |
| PostgreSQL no host | 127.0.0.1:5432                      |

O job `migrate` terminar com código 0 é esperado. Ele aplica o SQL versionado e o seed opcional; a API só inicia depois. Um banco novo começa sem solicitações.

| Usuário público de demonstração | Senha   | Permissão                                                         |
| ------------------------------- | ------- | ----------------------------------------------------------------- |
| ana.demo                        | demo123 | Consulta/atendimento global; edição/exclusão das próprias abertas |
| bruno.demo                      | demo123 | Mesma permissão; útil para testar demanda de outro dono           |

Não usar essas credenciais em produção. Seed não redefine senhas/nomes/IDs existentes.

### Conferir o funcionamento

1. Entre como ana.demo e cadastre uma solicitação com título, descrição e categoria.
2. Recarregue a listagem para conferir persistência; abra os detalhes e edite enquanto aberta.
3. Combine filtros e compare com o dashboard global.
4. Saia e entre como bruno.demo: consulta e atendimento são permitidos; edição/exclusão da demanda de Ana são bloqueados.
5. Avance Aberto → Em Atendimento → Concluído; não há retorno nem conclusão direta de aberta.
6. Saia; uma rota protegida deve levar ao login.

```powershell
docker compose logs migrate api web
docker compose stop
docker compose up -d --wait
docker compose down
```

Esses comandos preservam o volume; não usar `down -v`. Para atualizar código, repita `up --build`. Não execute jobs concorrentes de migration. Para mudar a porta web, defina `$env:APP_PORT='8082'` e ajuste APP_ORIGIN para `http://127.0.0.1:8082` antes de iniciar. `POSTGRES_PORT` muda apenas a porta no host, nunca `db:5432`.

## Opção 2 — desenvolvimento com Node no host e PostgreSQL em Docker

Requer **Node.js 24.x**, npm e o mesmo Docker/Compose. Use o banco de desenvolvimento, nunca o banco de testes para trabalho persistente. Portas: 5432, 3001 e 5176.

Na raiz, prepare `.docker/database.env` como acima:

```powershell
docker compose up -d --wait db
cd backend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Configure `backend/.env`: DATABASE_URL com **127.0.0.1:5432** (usuário/senha do arquivo de banco); SESSION_SECRET próprio; `PORT=3001`, `HOST=127.0.0.1`, `APP_ORIGIN=http://127.0.0.1:5176`, `NODE_ENV=development`.

```powershell
npm run db:deploy
$env:SEED_DEMO='true'
npm run db:seed
Remove-Item Env:SEED_DEMO
npm run dev
```

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm ci
npm run dev
```

Acesse **http://127.0.0.1:5176**. Vite usa porta fixa e proxy `/api` para `http://127.0.0.1:3001`. Outra porta da API exige API_PROXY_TARGET no ambiente do Vite ou `.env.local`. `localhost` e `127.0.0.1` são origens distintas: APP_ORIGIN precisa corresponder ao endereço usado.

## Variáveis

| Variável                 | Uso/default                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| DATABASE_URL             | Obrigatória; conexão PostgreSQL, privada                                                                         |
| SESSION_SECRET           | Obrigatória; mínimo 32 caracteres                                                                                |
| SESSION_TTL_SECONDS      | 28800 (8h); aceita 60–2592000                                                                                    |
| NODE_ENV                 | development/test/production; padrão development                                                                  |
| HOST / PORT              | Host API; Compose força 0.0.0.0:3000; host usa 127.0.0.1:3001 neste guia                                         |
| APP_ORIGIN               | Origem pública exata; ajustar conforme modo de execução                                                          |
| TRUSTED_PROXY_IPS        | IPs explícitos separados por vírgula; vazio sem confiança                                                        |
| SEED_DEMO                | Opt-in do preparo/seed; não é credencial                                                                         |
| APP_PORT / POSTGRES_PORT | Portas publicadas pelo Compose, 8080/5432                                                                        |
| TEST_DATABASE_URL        | Exclusiva dos testes; não substitui DATABASE_URL de desenvolvimento                                              |
| OBSERVE_*                | Opcionais; ativação, credenciais, endpoint e amostragem descritos no [guia Observe](../backend/OBSERVABILITY.md) |

## Testes, produção e solução de problemas

Checks e integração isolada: [validação](validacao.md). HTTPS, IP de proxy, certificados, persistência e backups: [DOCKER.md](../DOCKER.md). Produção exige HTTPS e credenciais próprias; o repositório não provisiona usuários produtivos nem certificados reais.

- Docker indisponível: iniciar Docker Desktop e confirmar containers Linux com `docker info`.
- Porta ocupada: ajustar publicação/origem; não encerrar processos desconhecidos.
- Migration falhou: consultar logs de `migrate`; não remover volume para contornar o erro.
- Login falhou: conferir seed, credenciais e correspondência entre origem e APP_ORIGIN. Seed repetido preserva senha antiga.
- Conexão ao banco: host é `db` nos containers e `127.0.0.1` no host; alterações POSTGRES_* não modificam banco já inicializado.
- Sessão/CSRF: abrir a origem configurada; frontend gerencia token e cookies. Trocar SESSION_SECRET invalida cookies existentes.
- `vite preview` sozinho não oferece o proxy de distribuição: use Compose/Nginx para a aplicação compilada.
