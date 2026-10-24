# Lente do Reviewer

Mapa do `reversa-reviewer/SKILL.md` com o grafo ativo. O Reviewer revisa specs; o grafo torna barata a conferência de cada afirmação contra o código.

| Passo do Reviewer | Com o grafo |
|-------------------|-------------|
| Passo 0 / Revisão cruzada via Codex | Igual. Inclua a Regra central do protocolo no prompt delegado, para que o revisor externo também consulte o grafo antes de abrir código |
| 1. Revisão por unit | Para cada afirmação 🟡 que cite símbolo ou arquivo: `graphify explain "<símbolo>"` confirma a parte estrutural (existe, quem chama, onde está). Promova a 🟢 só se a aresta for `[EXTRACTED]` **e**, para comportamento, as linhas citadas forem lidas. Afirmação que cita símbolo inexistente no grafo (código de saída `4`, mesmo após reformular) vira candidata a 🔴 |
| 2. Revisão cruzada entre units | Toda dependência entre units descrita nas specs deve existir no grafo: `graphify path "<símbolo da unit A>" "<símbolo da unit B>"`. Dependência sem caminho é achado; caminho forte que as specs não citam também |
| 3. Validação das matrizes | Rastreabilidade e Spec Impact Matrix: confira cada linha com `graphify affected "<símbolo>" --depth 2` |
| 4 a 6 | Igual |

Registre o uso em `graph-usage.jsonl` com `unit: "reviewer"`.
