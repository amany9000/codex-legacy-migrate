# Lente do Data Master

Mapa do `reversa-data-master/SKILL.md` com o grafo ativo. As fontes de análise do Data Master continuam válidas; o grafo localiza a camada de dados no código.

| Passo do Data Master | Com o grafo |
|----------------------|-------------|
| Fontes de análise | DDL e migrations SQL: leitura direta (o grafo AST não cobre SQL puro). Models de ORM, repositórios e DAOs: localize com `graphify query "model entity table column repository dao orm schema" --budget 1500` |
| 1. Inventário de tabelas | Cruze os arquivos de migration com os models localizados. Model sem migration (ou o contrário) é achado a registrar |
| 2. Estrutura detalhada | Leia só o corpo de cada model ou bloco DDL localizado (receita "Contorno de arquivo") |
| 3. Relacionamentos | Arestas entre nós de model (`references`, `uses`, `inherits`) apontam candidatos; confirme lendo as declarações de relação do ORM ou as FKs |
| 4. Regras de negócio no banco | Triggers, procedures e constraints: leitura direta do SQL. Quem chama procedures no código: `graphify query "procedure call exec stored function" --budget 800` |
| 5. ERD | Igual |

## Banco vivo (opcional)

O graphify extrai schema de um PostgreSQL vivo (`graphify extract . --postgres <DSN>`), mapeando tabelas, views, funções e FKs (sem detalhe de coluna). Só use se o usuário fornecer o DSN explicitamente nesta conversa, com a saída isolada em `.reversa/graph-db/` (`--out .reversa/graph-db`), e nunca grave o DSN em arquivo. Esse caminho não foi validado nesta versão do Reversa: trate a saída como 🟡 e confira contra o DDL.

Registre o uso em `graph-usage.jsonl` com `unit: "data-master"`.
