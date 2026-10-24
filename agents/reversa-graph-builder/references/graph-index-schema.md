# Schema de `.reversa/context/graph-index.json`

Índice do grafo, escrito só pelo `reversa-graph-builder` e lido por todos os agentes antes de qualquer consulta. É a fonte única de onde o grafo está e se ele está ligado.

```json
{
  "schema_version": 1,
  "enabled": true,
  "graph_path": ".reversa/graphify-out/graph.json",
  "source": "reversa",
  "mode": "ast",
  "graphify_version": "0.9.95",
  "built_at": "2026-10-24T14:02:11Z",
  "git_head": "030812cedaf69cf88a395b895a78d4db12687d33",
  "node_count": 129,
  "edge_count": 367,
  "file_count": 17,
  "god_nodes": [
    { "id": "lib_commands_update_update", "label": "update()", "degree": 24 }
  ],
  "communities": [
    {
      "id": 0,
      "label": "Community 0",
      "size": 25,
      "top_files": ["lib/installer/detector.js", "lib/utils/json-safe.js"]
    }
  ],
  "report_path": ".reversa/graphify-out/GRAPH_REPORT.md",
  "wiki_path": null,
  "benchmark": { "reduction": "5.3x", "avg_query_tokens": 1613 }
}
```

| Campo | Tipo | Regra |
|-------|------|-------|
| `schema_version` | int | Sempre `1` nesta versão |
| `enabled` | bool | `false` desliga o modo grafo em todos os agentes (modo clássico). Só os modos `off`/`on` do builder alteram. Preservado entre reconstruções |
| `graph_path` | string | Caminho relativo à raiz. Todos os comandos usam `--graph <graph_path>` |
| `source` | `"reversa"` \| `"root"` | `root` = `graphify-out/` da raiz, somente leitura |
| `mode` | `"ast"` \| `"semantic"` | Para `root`, deduza pelo `graph.json`: arestas com `confidence: "INFERRED"` vindas de LLM ou nós de documento indicam `semantic`; na dúvida, `ast` |
| `graphify_version` | string | Saída de `graphify --version` |
| `built_at` | ISO 8601 | Momento da última construção ou atualização feita pelo builder |
| `git_head` | string \| null | `built_at_commit` do `graph.json`; `null` sem git |
| `node_count`, `edge_count`, `file_count` | int | Do `graph.json` |
| `god_nodes` | array | Top 10 de `graphify god-nodes --json` |
| `communities` | array | Todas as comunidades, maior primeiro, com até 5 `top_files` |
| `report_path` | string \| null | `GRAPH_REPORT.md` ao lado do grafo |
| `wiki_path` | string \| null | `wiki/index.md` ao lado do grafo, se existir |
| `benchmark` | object \| null | De `graphify benchmark`; `null` se o comando falhar |

Campos desconhecidos devem ser preservados em reescritas.
