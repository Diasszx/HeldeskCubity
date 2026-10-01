# Frontend

# Navegação — SPEC-002

Rotas centralizadas em `src/routes.tsx`: `/login`, `/dashboard`, `/requests`, `/requests/new`, `/requests/:id` e `/requests/:id/edit`. A raiz redireciona para o dashboard; endereços desconhecidos exibem a página 404. Login fica fora do AppLayout. As páginas são estruturas iniciais, sem dados, formulários ou autenticação.

O menu se adapta a telas menores que 768 px. Enter abre o menu, Tab percorre os links e Escape fecha e devolve o foco ao botão. A navegação transfere o foco ao conteúdo e atualiza o título do documento.

No servidor de produção, configurar fallback de URLs da SPA para `index.html` (sem aplicar a assets/API). URLs diretas foram validadas no Vite; hospedagem ainda não definida.

O checkout separado `portal-solicitacoes/` está excluído do ESLint e Prettier. A formatação aceita os finais de linha existentes no Windows. Nenhuma dependência foi adicionada nesta etapa.
