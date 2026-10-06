# MEMORIAL TÉCNICO DE DESENVOLVIMENTO

**Projeto:** Cubity Support — Portal de Solicitações Internas da bit Soluções

**Data desta revisão:** 05/10/2026

**Escopo:** documentação da implementação disponível no repositório, conforme os entregáveis solicitados. Este memorial consolida a referência de planejamento e as decisões posteriormente adotadas; resultados demonstrados estão no [relatório de validação](validacao.md).

## 1. Escopo do projeto

Aplicação web para colaboradores autenticados registrarem demandas internas, consultarem todas as solicitações e acompanharem o atendimento até a conclusão. Frontend React, API REST NestJS e PostgreSQL integram a mesma entrega. O objetivo é implementar o fluxo delimitado do desafio com regras verificadas no servidor e instalação reproduzível.

Funcionalidades: login/logout com sessão persistente, cadastro com título/descrição/categoria, código/data/dono/status automáticos, listagem e detalhes, filtros combináveis, edição/exclusão das próprias abertas, atendimento sequencial e dashboard global.

Código de frontend/backend, migration SQL, dicionário, instruções, README e screenshots são localizados pelo [índice da entrega](README.md). Vídeo é opcional e não foi produzido. Não há cadastro público, recuperação de senha, anexos, comentários, inventário, SLA ou notificações.

## 2. Regras de negócio

As [RN01–RN15](requisitos.md) integram este memorial. Acesso requer sessão; identidade vem do servidor. Título/descrição são obrigatórios após trim e limitados a 60/1.000 caracteres. As cinco categorias são fornecidas por seed. Criação inicia OPEN, com código único e instante do banco.

Todos os autenticados consultam e atendem; apenas o dono edita/exclui OPEN. Estados seguem OPEN → IN_PROGRESS → COMPLETED. Escritas condicionadas também verificam dono/status, protegendo a regra em concorrência. Filtros de título, categoria, status e período são combináveis. Período inclui os dias informados em UTC. Dashboard não herda filtros da lista.

Essas permissões uniformes e o fluxo sequencial foram adotados porque o enunciado não estabelece perfis distintos. Não se importam papéis ou recursos do repositório usado como referência visual de documentação.

## 3. Arquitetura da solução

O monorepositório separa `frontend` e `backend`. O frontend é organizado por funcionalidades, com componentes de UI/layout reutilizáveis, React Hook Form/Zod nos formulários e cliente HTTP centralizado. Rotas aninhadas e contexto de autenticação coordenam navegação e identidade. Runtime consome a API; mocks ficam nos testes.

NestJS é monólito modular: Auth, Users, Categories, Requests e Dashboard, apoiados por configuração, sessão, Prisma e observabilidade. Controllers definem contratos; guards verificam sessão/CSRF; pipes validam Zod; services executam negócio. PrismaService é usado diretamente, evitando um repositório genérico redundante.

Dados de negócio usam Prisma com adapter `pg`; sessões usam express-session/connect-pg-simple por pool próprio. Nginx serve a SPA e encaminha `/api` na mesma origem. Compose inicia banco saudável, migration, API e web em ordem. Consulte [arquitetura](arquitetura.md).

## 4. Modelagem e banco

User, Category e Request usam UUID. Request referencia categoria e solicitante com FKs RESTRICT, tem enum de status e instante timestamptz(3). Índices atendem as consultas por período, categoria/status e dono. Checks impedem título/descrição em branco e usuário de login fora do formato normalizado. A função SQL de código consome sequência BIGINT atômica, sem count+1; lacunas são aceitas.

Sessões ficam em `session`, com sid, JSON e expire; não há relação Prisma/FK para userId dentro do JSON. O guard valida a identidade. `_prisma_migrations` é infraestrutura, não entidade de negócio. O [dicionário completo](dicionario-de-dados.md) registra tipos, nullability, defaults, índices e objetos SQL; a [migration](../backend/prisma/migrations/20261003160000_initial/migration.sql) é o script de criação oficial.

## 5. Tecnologias e justificativa técnica

Versões são as linhas dos manifests/lockfiles, não garantia de compatibilidade com majors futuros. Instalação usa `npm ci`; semver nos manifests não substitui o lockfile. Node 24 é exigido pelos dois projetos. Backend usa TypeScript 5.9; frontend TypeScript 6. Tecnologias auxiliares são descritas por papel; dependências transitivas continuam registradas no lockfile.

| Tecnologia utilizada                                 | Função e motivo da escolha                                                         | Alternativa e impacto                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript / Node.js 24                              | Tipos nos contratos, componentes e serviços; runtime comum                         | JavaScript reduz configuração, mas perde checagem estática; tipos facilitam refatoração, sem substituir validação em execução                 |
| React 19 / react-dom                                 | Interface declarativa e renderização por componentes                               | DOM manual exigiria sincronização de estados; componentes ajudam manutenção das telas                                                         |
| React Router 8                                       | Rotas, parâmetros, layouts e navegação                                             | Troca de telas por estados não oferece URLs estáveis; router organiza acesso e recarga                                                        |
| Vite 8 / plugin-react                                | Desenvolvimento, compilação e proxy local                                          | Configuração manual de bundler exige mais manutenção; Vite simplifica, mas bundle atual pede futura divisão de código                         |
| Tailwind CSS 4 / plugin Vite                         | Composição de estilos com tokens semânticos                                        | CSS espalhado aumentaria inconsistência; utilitários exigem disciplina em componentes compartilhados                                          |
| shadcn/ui / Radix UI                                 | Código incorporado e primitivas acessíveis de diálogo/slot                         | Componentes próprios demandariam mais esforço; código local permite adaptação, mas exige revisão de foco/teclado                              |
| tailwind-variants 3                                  | Variantes e slots tipados (`tv`)                                                   | Concatenação/ternários repetidos fragilizam consistência; receitas centralizadas facilitam evolução                                           |
| clsx / tailwind-merge                                | Composição e resolução de classes                                                  | Concatenação manual pode duplicar/conflitar classes; utilitário local padroniza customizações                                                 |
| lucide-react                                         | Ícones consistentes                                                                | Desenhos independentes dificultariam padronização; texto/labels continuam necessários                                                         |
| React Hook Form 7 / @hookform/resolvers              | Estado/erros de formulário e adaptação Zod                                         | Estados manuais duplicariam controle; schema compartilha a validação com a interface                                                          |
| Zod 4                                                | Entradas/configuração em runtime e formulários                                     | Só tipos não validam HTTP; schemas estritos rejeitam campos automáticos e limites incorretos                                                  |
| NestJS 12 / platform-express / Express               | Módulos, DI, controllers, guards e pipes                                           | Express puro é menor, mas exigiria convenções locais; Nest oferece estrutura adequada ao monólito                                             |
| reflect-metadata / RxJS                              | Metadados de DI/decorators e infraestrutura Nest                                   | Implementações próprias seriam incompatíveis com o framework; são suporte, não camadas de negócio adicionais                                  |
| PostgreSQL 17                                        | Integridade relacional, transações, dados e sessões                                | Banco documental não oferece o mesmo modelo relacional; um banco único reduz operação no escopo atual                                         |
| Prisma 7 / client / adapter-pg                       | Modelos, consultas tipadas, migrations e driver adapter                            | SQL manual oferece controle maior, mas aumenta mapeamento; migration preserva SQL customizado além do schema                                  |
| pg                                                   | Driver para adapter e armazenamento de sessão                                      | Outro driver exigiria adaptar clientes; pools separados precisam de dimensionamento sob carga                                                 |
| express-session / connect-pg-simple                  | Sessão revogável no servidor e persistência                                        | JWT exigiria estratégia adicional de revogação; sessão simplifica logout, com custo de acesso ao banco                                        |
| bcrypt 6                                             | Hash/verificação de senha; custo 12 no seed                                        | Senha em texto é inadequada; outro hash exigiria migração e ajuste de custo; login tem limite de 72 bytes                                     |
| @nestjs/config / dotenv                              | Carregamento e validação das variáveis; dotenv também usado na configuração Prisma | Configuração dispersa dificulta diagnóstico; validação falha sem divulgar valores                                                             |
| @nestjs/swagger                                      | OpenAPI e UI de exploração                                                         | Documento manual pode divergir dos controllers; decorators precisam acompanhar schemas Zod                                                    |
| @nestjs/observe 0.3.6                                | Lifecycle HTTP e métricas opt-in do Nest                                           | APM genérico pode ter menos contexto de guards/pipes; SDK reduz instrumentação manual, mas depende do collector e tem custos/limites externos |
| Jest 30 / @nestjs/testing / Supertest / ts-jest      | Unidade, módulos Nest e HTTP, incluindo ESM                                        | Scripts ad hoc teriam menos isolamento; ts-jest integra TypeScript ao runner e requer compatibilidade mantida                                 |
| Executor node:test                                   | Testes frontend de contratos, regras e transporte                                  | Acrescentar runner não foi necessário; esses testes não substituem validação no navegador                                                     |
| ESLint / typescript-eslint / plugins React / globals | Análise estática com regras de TS/hooks                                            | Apenas build não detecta todas as violações; regras têm custo de atualização                                                                  |
| Prettier / eslint-config-prettier                    | Formatação e separação de responsabilidades com lint                               | Formatação manual gera diffs sem propósito; automatização mantém leitura consistente                                                          |
| concurrently / watch Node e TypeScript               | Coordenação de recompilação e processo API no desenvolvimento                      | Terminais separados funcionam, mas exigem controle manual; somente ferramenta de desenvolvimento                                              |
| Docker / Compose / Node e Nginx oficiais             | Instalação reproduzível, builds em estágios, proxy e serviços coordenados          | Instalação manual no host aumenta divergência; containers exigem Docker, recursos e atualizações de imagens                                   |
| GitHub Actions                                       | Checks e PostgreSQL isolado em CI                                                  | Validação apenas local depende do ambiente do autor; CI não substitui testes de uso e não implica deploy                                      |
| Pacotes @types, @eslint/js, plugins Vite/Tailwind    | Tipagem/configuração das ferramentas acima                                         | Auxiliares de desenvolvimento; não são funcionalidades do portal                                                                              |

shadcn/ui é origem de código incorporado, não dependência encapsulada de runtime. A implementação usa scripts TypeScript/Node dos manifests; não exige instalar um CLI Nest global.

## 6. Sessão, validação e observabilidade

Cookie HttpOnly/SameSite=Lax, Secure em produção, path /api e expiração renovada. Login regenera e salva antes de responder; logout aguarda destruição. CSRF utiliza nonce aleatório ligado à sessão, timingSafeEqual e verificação de origem. Dados automáticos não são aceitos no payload. Respostas não expõem hashes/segredos.

Observe fica desativado por padrão. Capture de headers/body, código-fonte, user IDs e envio de logs ficam desativados; query e mensagens/stacks de erros são mascaradas. Isso reduz detalhe de diagnóstico. Banco/runtime estão configurados; ingestão externa, alertas e métricas sustentadas não são declarados validados sem evidência. Consulte [limites do SDK](../backend/OBSERVABILITY.md).

## 7. Execução, testes e evidências

O [guia de execução](execucao.md) descreve clone, pré-requisitos, variáveis, migrations, seed, endereços, credenciais públicas, rotina e desenvolvimento no host. HTTPS/backup estão no guia Docker. Código ESM, lockfiles e migrations integram a entrega.

O [relatório de validação](validacao.md) registra checks realmente executados, cenários visuais e limites. [Screenshots](screenshots/README.md) demonstram telas com dados de demonstração em frontend integrado. Uma imagem isolada não comprova autorização, concorrência ou ausência de falhas; testes específicos complementam a evidência.

## 8. Análise crítica e evolução

O monólito atende ao escopo sem a carga operacional de microsserviços. PostgreSQL também para sessões reduz serviços, mas pools, renovação e limpeza devem ser medidos com volume real. Redis é alternativa futura condicionada a latência/carga e necessidade de isolamento; não foi adotado.

Prioridades futuras: paginação no servidor, divisão do bundle, rate limiting de login, provisionamento seguro de usuários produtivos, emissão/renovação de TLS e política de backup/restore validada. Observabilidade pode orientar índices, pool e alertas após linha de base. Não há teste de carga, certificação de segurança, cobertura integral de acessibilidade ou deploy produtivo demonstrado.

## 9. Fontes e rastreabilidade

O enunciado e a referência histórica do memorial fundamentam escopo/RN01–RN15. A consolidação foi conferida com código, manifests, schema e migration locais; decisões atuais prevalecem sobre descrições de fases antigas. A referência [Helpdesk Management System](https://github.com/roposropos/helpdesk-management-system) orienta apenas a apresentação da documentação. A revisão e a validação desta entrega foram realizadas pelo próprio autor das alterações, sem alegação de revisão independente.
