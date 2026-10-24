# Lente do Scout

Mapa passo a passo do `reversa-scout/SKILL.md` com o grafo ativo. As saídas (`inventory.md`, `dependencies.md`, `surface.json`) e o schema do `surface.json` não mudam.

| Passo do Scout | Com o grafo |
|----------------|-------------|
| 1. Estrutura de pastas | Não liste a árvore inteira. Use `find . -maxdepth 2 -type d` com as exclusões do Scout, mais as comunidades e `top_files` do `graph-index.json`. Aprofunde só pastas que o grafo não cobre (assets, scripts soltos) |
| 2. Tecnologias e frameworks | Manifestos lidos direto (baratos). Contagem de linguagens pela receita "Contagem de linguagens" (`references/recipes.md`). Bibliotecas efetivamente usadas no código pela receita "Dependências externas" |
| 3. Pontos de entrada | `graphify query "main entry point bootstrap server start" --budget 1000` + god nodes do índice. Scripts de `package.json`, CI e Docker lidos direto |
| 4. Schema de banco | `graphify query "model entity schema table migration repository" --budget 1000` para localizar; DDL e migrations SQL listados por `git ls-files` com filtro |
| 5. Cobertura de testes | `git ls-files` filtrando `*.test.*`, `*.spec.*`, `test_*`, `*_test.*` (barato, sem grafo) |
| 6. Sugestão de organização | Comunidades alinhadas com pastas top-level de domínio reforçam `module`. Comunidades espalhadas por várias pastas com roteamento centralizado reforçam `endpoint` ou `hybrid` |

## Saída extra: `.reversa/context/graph-modules.json`

Além das saídas normais, grave o mapa comunidade → módulo, que o orquestrador usa para montar as tarefas por módulo do Archaeologist:

```json
{
  "generated_by": "reversa-scout (lente de grafo)",
  "generated_at": "2026-10-24T14:10:00Z",
  "graph_path": ".reversa/graphify-out/graph.json",
  "modules": [
    {
      "name": "auth",
      "community_ids": [3],
      "folders": ["src/auth"],
      "top_files": ["src/auth/service.ts", "src/auth/middleware.ts"],
      "god_nodes": ["AuthService"],
      "node_count": 41,
      "confidence": "🟡"
    }
  ]
}
```

Regras para montar os módulos:

1. Parta das comunidades do índice. Nomeie cada uma pelo nome de domínio da pasta ou do god node dominante (não use "Community 3" como nome de módulo)
2. Junte comunidades pequenas (menos de ~5% dos nós) à vizinha com mais arestas cruzadas (receita "Acoplamento entre comunidades")
3. Quando a divisão por pastas de domínio e a divisão por comunidades discordarem, prefira as pastas e registre a divergência em `inventory.md`: ela é sinal de acoplamento entre módulos
4. `confidence` é sempre 🟡: comunidade é heurística

Registre o uso em `graph-usage.jsonl` com `unit: "scout"`.
