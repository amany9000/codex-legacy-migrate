# Lente do Architect

Mapa do `reversa-architect/SKILL.md` com o grafo ativo. O Architect é o único agente com uso livre do `GRAPH_REPORT.md` (`report_path` do índice): leia-o uma vez no início, ele traz god nodes, comunidades e conexões surpreendentes.

| Passo do Architect | Com o grafo |
|--------------------|-------------|
| 1. C4 Contexto | Sistemas externos pela receita "Dependências externas" (`references/recipes.md`): SDKs, clientes HTTP, drivers de banco e filas. Confirme cada integração com `graphify explain "<cliente>"` |
| 2. C4 Containers | Pontos de entrada (do Scout) + configuração de deploy lida direto (Dockerfile, compose, CI). O grafo ajuda a ligar cada entry point às comunidades que ele aciona: `graphify query "<entry point>" --seed <arquivo> --budget 1200` |
| 3. C4 Componentes | Use os módulos de `graph-modules.json` como componentes. Relações entre componentes pela receita "Acoplamento entre comunidades"; o rótulo da seta sai de `graphify path "<símbolo A>" "<símbolo B>"` |
| 4. ERD | Consuma o que o Data Master produziu. Para validar uma relação: `graphify path "<Entidade A>" "<Entidade B>"` |
| 5. Integrações externas | Receita "Dependências externas" + `graphify query "http client fetch request api webhook queue publish" --budget 1200`. Endpoints, payloads e timeouts exigem leitura das linhas localizadas |
| 6. Dívidas técnicas | God nodes com grau muito acima da média (acoplamento), pares de comunidades com muitas arestas cruzadas, ciclos (`path` A→B e B→A ambos existentes), candidatos a código morto (receita "Símbolos sem chamador", sempre 🟡) |
| 7. Spec Impact Matrix | `graphify affected "<símbolo central do componente>" --depth 2` por componente dá o raio de impacto |

Componentes derivados de comunidades são 🟡 até baterem com a estrutura de pastas ou com o código. Registre o uso em `graph-usage.jsonl` com `unit: "architect"`.
