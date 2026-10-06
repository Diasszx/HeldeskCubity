# Autenticação por sessão

Contrato implementado: sessões em PostgreSQL, prazo padrão de 8 horas sem atividade (SESSION_TTL_SECONDS=28800), renovação durante uso autenticado; cookie cubity.sid, host-only, path=/api, HttpOnly, SameSite=Lax e Secure em produção. Senhas do seed usam bcrypt custo 12; login verifica o custo registrado no hash, sem truncar ou remover espaços da senha.

CSRF usa token aleatório de 32 bytes associado à sessão, comparado com timingSafeEqual. O token é rotacionado ao regenerar a sessão no login. Toda rota mutável exige X-CSRF-Token, inclusive login e logout. Origin, quando enviado, deve corresponder exatamente a APP_ORIGIN; Sec-Fetch-Site=cross-site é recusado. Não habilitar CORS para contornar essa proteção.

| Método/rota           | Acesso e resposta                                                           |
| --------------------- | --------------------------------------------------------------------------- |
| GET /api/auth/csrf    | Público; cria/persiste sessão anônima e retorna {csrfToken}                 |
| POST /api/auth/login  | Público com CSRF; JSON {username,password}; retorna User {id,name,username} |
| GET /api/auth/me      | Sessão válida; retorna User, ou 401                                         |
| POST /api/auth/logout | Sessão válida e CSRF; destrói sessão e expira cookie; 204                   |

Buscar um novo token após login; manter somente em memória, junto ao cliente HTTP, sem localStorage. O frontend integrado consulta estes endpoints com cookies e CSRF. Health e Swagger são públicos. Novos controllers são protegidos pelo Guard global por padrão; @Public é exceção explícita à autenticação e não à proteção CSRF.

APP_ORIGIN é a origem pública exata do portal, sem path ou barra final. Padrão de desenvolvimento http://127.0.0.1:3000; ajustar para a origem servida pelo proxy Vite na integração. Em produção exige https; requisições sem transporte HTTPS reconhecido são recusadas com 403. SESSION_SECRET deve ter ao menos 32 caracteres e não pode ser o placeholder público em produção. SESSION_TTL_SECONDS aceita 60 a 2592000. TRUSTED_PROXY_IPS aceita IPs explícitos separados por vírgula; vazio não confia em proxy algum. Não usar trust proxy=true ou número de saltos indiscriminado. Com TLS terminado em proxy, informar somente os IPs desse proxy e limitar acesso direto à API na infraestrutura. TLS e proxy estão configurados no Compose, conforme [DOCKER.md](../DOCKER.md).

Migrations devem preparar a tabela session; o store não cria tabelas. Não há MemoryStore. Login aguarda regeneração e gravação antes de responder; logout aguarda destruição. Falhas retornam erro HTTP sem credenciais, hashes, IDs de sessão ou detalhes de conexão. Sessão armazena apenas userId, csrfToken e metadados do cookie. Expiração é verificada pelo store no banco, além do cookie do cliente. Sessões expiradas são removidas periodicamente pelo store.

Referências: [express-session](https://expressjs.com/en/resources/middleware/session/), [connect-pg-simple](https://github.com/voxpelli/node-connect-pg-simple), [CSRF synchronizer token](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## Validação

Dependências novas: express-session 1.19.0 e connect-pg-simple 10.0.0; testes utilizam @nestjs/testing 12.1.2. Login aceita senha de até 72 bytes UTF-8 e recusa campos adicionais. Usuário inexistente e senha incorreta recebem o mesmo 401.

Executar npm run check. Para os testes reais de persistência e autenticação, iniciar docker compose --profile test up -d db-test na raiz, definir TEST_DATABASE_URL conforme DATABASE.md e executar npm run test:db em backend. A entrega de autenticação foi validada com 17 testes de configuração/HTTP e 22 testes de integração PostgreSQL; novas funcionalidades acrescentam testes a esses comandos. Cobrem CSRF, credenciais, regeneração, logout, cookie antigo, renovação e expiração, reinício da API, falhas do store e confiança explícita no proxy. A configuração e as evidências históricas de HTTPS do proxy estão em [DOCKER.md](../DOCKER.md); certificados produtivos exigem configuração própria.

Quando o store falha ao destruir a sessão, logout retorna 500 e não declara revogação; o cliente pode repetir a operação. Erros de leitura e gravação também impedem resposta de sucesso. O frontend consome estes endpoints; mocks ficam restritos aos testes.
