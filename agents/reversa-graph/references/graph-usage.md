# Uso do grafo pelos agentes do Reversa

Receita compartilhada. Os agentes do pipeline apontam para este arquivo em vez de repetir instruções. `RG` = `node .reversa/tools/graph/bin/reversa-graph.js`.

## 0. O grafo está disponível?

1. `.reversa/state.json` → `graph.enabled` precisa ser `true`.
2. `graphify-out/graph.json` precisa existir. Se não existir e `graph.enabled` for `true`, rode `RG build`.
3. Se qualquer passo falhar: registre **uma vez** "grafo indisponível" no artefato/resumo e siga o processo tradicional do agente (leitura de arquivos). O grafo é acelerador, nunca pré-requisito.

## 1. Qual comando usar

| Necessidade | Comando |
|---|---|
| Mapa geral (Scout, orquestrador) | `RG summary --json` |
| Escopo de leitura de um módulo / símbolo (Archaeologist) | `RG context "<símbolo>" --json` |
| Quem chama X / o que quebra se X mudar (Detective, Architect, Strategist) | `RG context "<símbolo>" --depth=3` |
| Antes de uma fatia de migração (Inspector) | `RG snapshot baseline-<fatia>` |
| Depois da fatia (Inspector) | `RG build` → `RG diff baseline-<fatia> latest --out=<saída>/migration/graph-diff-<fatia>.md` |
| Visualização 3D | `RG deps --out=<saída>/assets/data/deps.json` |

Para escolher símbolos de um módulo: use os `hubs` do `summary` e os nós cujo `source_file` está na pasta do módulo (`RG summary --json` lista arquivos por comunidade; `RG context "<arquivo>.js"` funciona com o label do nó de arquivo).

## 2. Lendo o resultado de `context`

- `target`: o nó resolvido, com `source_file` e `source_location`.
- `dependencies`: o que o alvo usa (arestas de saída `calls`, `imports`, `imports_from`).
- `callers`: quem chama o alvo (`calls` de entrada). `direct_dependents` inclui também quem importa.
- `impact.direct` / `impact.transitive`: impacto reverso por profundidade (BFS limitada). `truncated: true` = há mais.
- `evidence`: as arestas usadas, com localização, `_origin` e `confidence`.
- `warnings`: limitações conhecidas (ex.: relação `indirect_call` não percorrida, grafo marcado `directed=false`). Repita os relevantes no artefato.

## 3. Regras de evidência

- Cite sempre `arquivo:linha` a partir de `source_file`/`source_location` do nó ou da aresta.
- `confidence: EXTRACTED` (AST) é fato estrutural. `INFERRED` é indício: confirme lendo o trecho.
- Marque a origem de cada dependência registrada: `source: graph` (veio do grafo) ou `source: inferred` (dedução do agente).
- Relações não verificadas (ex.: `indirect_call`) aparecem em `warnings` e não entram no impacto; não as trate como ausência de dependência.
- O grafo cobre código. Configuração dinâmica, reflexão, SQL em string, filas e chamadas HTTP podem não aparecer: o impacto real pode ser maior.

## 4. Lendo o resultado de `diff`

- `summary.complete: false` → a comparação é parcial (ids duplicados, nós ambíguos, casamento por label). Não conclua nada sem revisar `warnings`.
- `nodes.changed` só com `community`/`community_name` é reagrupamento do Graphify, não mudança de código.
- `edges.removed` com relação `calls` para um símbolo migrado = chamador que deixou de depender dele (esperado se a fatia previa isso; alerta se não previa).
- `edges.added` inesperadas = acoplamento novo. Leve ao checkpoint humano.
- O diff não prova correção de comportamento. Testes e revisão continuam obrigatórios.
