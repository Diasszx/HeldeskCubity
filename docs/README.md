# Documentação de entrega

Este índice reúne os documentos públicos do Cubity Support, Portal de Solicitações Internas da bit Soluções. A organização foi inspirada na apresentação do [Helpdesk Management System](https://github.com/roposropos/helpdesk-management-system); funcionalidades, regras, modelo e evidências correspondem exclusivamente ao código deste repositório.

| Entregável solicitado                       | Localização                                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Código-fonte completo do backend e frontend | [backend](../backend/) e [frontend](../frontend/)                                                                       |
| Instruções completas de execução            | [Execução](execucao.md) e [Docker, HTTPS e backup](../DOCKER.md)                                                        |
| Scripts de criação de tabelas               | [Migration SQL](../backend/prisma/migrations/20261003160000_initial/migration.sql) e [guia do banco](banco-de-dados.md) |
| Dicionário de dados                         | [Dicionário](dicionario-de-dados.md)                                                                                    |
| MEMORIAL TÉCNICO DE DESENVOLVIMENTO         | [Memorial](MEMORIAL_TECNICO_DE_DESENVOLVIMENTO.md)                                                                      |
| README com descrição do projeto             | [README principal](../README.md)                                                                                        |
| Evidências da aplicação funcionando         | [Screenshots](screenshots/README.md) e [relatório de validação](validacao.md)                                           |

## Leitura técnica

- [Arquitetura e fluxos](arquitetura.md)
- [Requisitos e regras de negócio](requisitos.md)
- [Contratos da API](api.md)
- [Observabilidade: configuração e limites](../backend/OBSERVABILITY.md)
- [Design system e componentes](../frontend/DESIGN_SYSTEM.md)
- [Testes PostgreSQL e integração contínua](../backend/TESTING.md)

Os screenshots são evidências visuais, não substituem testes de autorização, persistência ou concorrência. Datas e resultados efetivamente executados estão registrados no relatório de validação. Vídeo não é necessário para esta entrega.
