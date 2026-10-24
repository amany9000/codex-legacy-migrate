# Lente do time Bugs

Mapa dos agentes do time Bugs com o grafo ativo. O registro (`bug.md`, front matter, views) e os gates não mudam. Registre o uso em `.reversa/context/graph-usage.jsonl` com `unit: "<ID do bug>"` (ou `"<contexto>"` na inspeção profunda).

## reversa-debugger

| Etapa | Com o grafo |
|-------|-------------|
| Rota expressa, item 4 (dedupe) | Além do grep nos catálogos, compare os símbolos suspeitos com o `affected_code` dos bugs abertos do contexto |
| 2.4 Rastreabilidade vertical (Tracer) | `affected_code`: `graphify query "<sintoma em termos do código>" --budget 1200`, depois `graphify explain "<símbolo suspeito>"`. Preencha com `arquivo:Llinha`. Testes relacionados: `graphify query "test <símbolo>" --budget 600` |
| 2.5 Correlação horizontal (Correlator) | Bugs cujos `affected_code` se cruzam no mesmo nó, ou em nós ligados por `graphify path` curto, são candidatos a `related-to`/`caused-by`. Continuam `proposed`: o grafo é indício, não evidência de causa |

## reversa-depth-inspection

| Etapa | Com o grafo |
|-------|-------------|
| 1. Mapa da feature, item 2 (código) | Substitui "siga imports e chamadas a partir dos pontos de entrada": `graphify query "<feature>" --seed <ponto de entrada> --budget 2000` e `graphify affected "<símbolo central>" --depth 2`. Apresente o mapa com `arquivo:Llinha` |
| 1. Mapa da feature, item 4 (dados) | `graphify query "<feature> model repository cache queue client" --budget 1000` |
| 2. Lentes | Cada lente começa por uma consulta focada ao grafo sobre o recorte dela (ex. erros: `graphify query "<feature> exception catch error" --budget 1200`) e só então lê os corpos localizados |

## reversa-debugger-fix

| Etapa | Com o grafo |
|-------|-------------|
| 3. Diagnóstico e causa raiz | `graphify path "<ponto de entrada do sintoma>" "<símbolo suspeito>"` mostra a cadeia a inspecionar; leia só os corpos dessa cadeia |
| 4. Risco da mudança | `graphify affected "<símbolo a alterar>" --depth 3` é o raio de impacto. Inclua a lista no relatório visual (4.1) e use-a para escolher os testes de regressão |
| Após aplicar a correção | O código mudou: execute o `reversa-graph-builder` em modo `preflight` para a atualização incremental (só quando `source` for `reversa`; com `source: root`, sugira ao usuário `graphify update .`) |

## reversa-debugger-debate

| Etapa | Com o grafo |
|-------|-------------|
| Setup | Inclua nas entradas travadas o recorte do grafo do bug (`graphify explain` dos símbolos de `affected_code`), para que todos os debatedores partam do mesmo mapa |
| Execução | Toda hipótese que afirme "X chama Y" ou "X afeta Y" deve citar a aresta (`graphify path`) ou cair para 🟡. Debatedores externos recebem a Regra central do protocolo no prompt, exceto com `visibility: restricted` |
