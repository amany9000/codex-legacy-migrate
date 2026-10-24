# Lente do Detective

Mapa do `reversa-detective/SKILL.md` com o grafo ativo. Saídas e escala de confiança não mudam.

| Passo do Detective | Com o grafo |
|--------------------|-------------|
| 1. Arqueologia Git | Igual (`git log`, `git blame` são baratos). Use os god nodes do índice para priorizar os arquivos cujo histórico vale ler primeiro |
| 2. Regras de negócio implícitas | Por módulo: `graphify query "<módulo> validate check rule exception error throw" --budget 1500`. Leia só os corpos localizados (receita "Contorno de arquivo"). Para medir até onde cada regra vale, use `graphify affected "<símbolo da regra>" --depth 2` |
| 3. Máquinas de estado | `graphify query "status state transition enum workflow step" --budget 1200`, depois `graphify explain "<enum ou campo de status>"` para ver quem lê e quem escreve o estado. Transições exigem leitura das linhas que atribuem o estado |
| 4. Permissões e papéis | `graphify query "permission role authorize guard policy middleware acl" --budget 1200`; `graphify affected "<guard ou middleware>"` mostra o que cada permissão protege |
| 5. Análise de logs | `graphify query "logger log warn error audit" --budget 800`; leia só as chamadas localizadas |

Regras inferidas só pelo nome de um símbolo ficam 🟡. Registre o uso em `graph-usage.jsonl` com `unit: "detective"`.
