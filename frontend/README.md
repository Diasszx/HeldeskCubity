# Frontend integrado

React, Vite, TypeScript, shadcn/ui e Tailwind com tokens semânticos e variantes `tv`. Formulários usam React Hook Form e Zod. O runtime usa a API NestJS e PostgreSQL; os mocks ficam restritos aos testes. Nenhuma dependência foi adicionada para a integração.

## Execução local

Requer Node.js 24, npm e Docker com Compose. Na raiz, prepare `.docker/database.env` conforme o exemplo e execute:

```bash
docker compose up -d --wait db
```

Em `backend`, execute `npm ci` e prepare `.env` a partir de `.env.example`. Mantenha a conexão do banco de desenvolvimento, use um segredo de sessão aleatório e configure:

```dotenv
PORT=3001
APP_ORIGIN=http://127.0.0.1:5176
```

Execute as migrations e, para disponibilizar os usuários/categorias de demonstração, o seed explícito descrito em [DATABASE.md](../backend/DATABASE.md). Depois inicie a API:

```bash
npm run db:deploy
npm run dev
```

Em outro terminal, dentro de `frontend`:

```bash
npm ci
npm run dev
```

Abra `http://127.0.0.1:5176`. O Vite usa essa porta fixa e falha se ela estiver ocupada. As chamadas relativas `/api` passam pelo proxy para `http://127.0.0.1:3001`, mantendo a origem do navegador. Usar `localhost` no lugar de `127.0.0.1` exige ajustar `APP_ORIGIN` para corresponder exatamente à origem acessada.

Para outra porta da API, defina `API_PROXY_TARGET` no ambiente do Vite ou em `frontend/.env.local`, por exemplo `API_PROXY_TARGET=http://127.0.0.1:3002`. Essa variável configura o servidor Vite, sem embutir credenciais no bundle. Não versionar arquivos locais de ambiente.

Com o seed executado, os usuários são `ana.demo` e `bruno.demo`, com senha `demo123`. O seed preserva registros existentes; ainda não cria solicitações. Uma listagem vazia é válida até o primeiro cadastro.

## Comunicação e sessão

`src/services/http-client.ts` centraliza fetch, cookies (`credentials: include`), timeout de 15 segundos por chamada e erros seguros. Antes de cada POST/PATCH/DELETE, consulta `/api/auth/csrf` e envia `X-CSRF-Token`. O nonce acompanha a sessão atual, inclusive após sua regeneração no login. Não há persistência de senha, cookie ou nonce em localStorage/sessionStorage, nem repetição automática de gravações.

`api-services.ts` adapta autenticação, catálogos, solicitações e dashboard aos contratos das telas. Criação/edição enviam apenas título, descrição e categoria. Solicitante, código, data e status inicial são definidos pelo backend. O dashboard usa `/api/dashboard`, sem baixar a lista. Datas dos filtros incluem o dia inteiro em UTC.

O bootstrap converte somente 401 de `/auth/me` em usuário ausente. Falhas de rede/servidor exibem erro e nova tentativa. Um 401 nos recursos protegidos encerra o estado autenticado e leva ao login. Erros de gravação preservam os campos; logout só encerra a identidade local após sucesso ou confirmação de sessão já inválida. Permissões e transições continuam sendo verificadas pelo backend.

## Verificações

```bash
npm run check
```

Executa design system, tipos, lint, formatação, 49 testes unitários e build. Para repetir o cenário integrado, instale também as dependências do backend e inicie o banco exclusivo de testes na raiz:

```bash
docker compose --profile test up -d --wait db-test
```

Dentro de `frontend`, no PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://cubity_test:cubity-test-demo@127.0.0.1:5433/cubity_support_test'
npm run test:integration
```

Em Bash, use `TEST_DATABASE_URL=postgresql://cubity_test:cubity-test-demo@127.0.0.1:5433/cubity_support_test npm run test:integration`. O teste aplica o guard compartilhado do backend antes de acessar o banco, faz build, migrations e seed demo, inicia uma API temporária em porta livre, executa os services reais com cookies e encerra o servidor. Remove somente as solicitações que criou; mantém os usuários/categorias do seed. Recusa ambientes produtivos e bancos/usuários fora da configuração exclusiva de testes.

O cenário cobre credenciais inválidas/válidas, sessão atual, catálogos, cadastro, edição, consulta, filtros combinados, dashboard, dono incorreto, transições proibidas/permitidas, exclusão, cookie antigo após logout e novo login. O workflow do backend executa esse teste depois das suites PostgreSQL; o workflow do frontend mantém as verificações de qualidade.

Validação manual realizada em 03/10/2026: login por Enter; cadastro e persistência após reload; edição; filtros combinados em UTC; atendimento por outro usuário; bloqueio de ações após conclusão; cancelamento por Escape e confirmação de exclusão; indisponibilidade da API mantendo os campos; sessão inválida redirecionando com aviso; menu e ausência de overflow da página em 390 px e 1440 px.

## Distribuição

O build usa `/api` na mesma origem. O [Compose completo](../DOCKER.md) serve `dist` pelo Nginx, encaminha `/api` para NestJS e suporta as rotas da SPA, em `http://127.0.0.1:8080` no modo local. `vite preview` sozinho não fornece esse encaminhamento. Em produção, o backend exige HTTPS, segredo privado e origem correta; o guia Docker documenta o override TLS e o proxy confiável.

O build atual emite aviso de bundle acima de 500 kB; a integração não acrescenta pacotes. Divisão de código permanece uma melhoria futura.
