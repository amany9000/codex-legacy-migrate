# Lente do time de Migração

O time de Migração trabalha sobre as specs de `_reversa_sdd/`, não sobre o código. O grafo não muda isso: ele entra quando a spec é omissa, ambígua ou precisa de número (acoplamento, raio de impacto) e, antes, o agente teria de reabrir código ou registrar lacuna. Uma consulta ao grafo custa menos que uma releitura e evita lacunas desnecessárias no `ambiguity_log.md`.

Regras comuns:

- Spec primeiro, grafo depois, código bruto por último (só nas linhas localizadas)
- Toda evidência vinda do grafo entra nos artefatos com `arquivo:Llinha` e na confiança da tabela do protocolo
- Nada é escrito fora de `_reversa_sdd/migration/`, exceto a linha em `.reversa/context/graph-usage.jsonl` (`unit: "<agente>"`)

## reversa-paradigm-advisor

| Passo | Com o grafo |
|-------|-------------|
| 1. Detectar o paradigma do legado | Proporções do grafo como evidência: métodos (`.nome()`, arestas `method`) contra funções livres, volume de arestas `inherits`/`extends`/`implements`, god nodes do tipo classe ou módulo. Registre os números no gap |
| 3. Identificar o gap | God nodes muito acoplados e pares de comunidades com muitas arestas cruzadas (receita "Acoplamento entre comunidades") são as partes que mais vão sofrer na troca de paradigma |

## reversa-curator

| Passo | Com o grafo |
|-------|-------------|
| 2. Inventariar regras | Para cada regra da spec que cite símbolo, `graphify explain "<símbolo>"` confirma onde ela vive e quem depende dela |
| 3. Aplicar política | Regra cujo símbolo aparece na receita "Símbolos sem chamador" é candidata a descarte (código morto), **sempre 🟡** e registrada no `ambiguity_log.md` para decisão humana. `graphify affected "<símbolo>"` mostra o custo de manter ou descartar |

## reversa-strategist

| Passo | Com o grafo |
|-------|-------------|
| 1. Sintetizar contexto | Módulos de `graph-modules.json` e acoplamento entre comunidades como mapa da migração |
| 2/3. Filtrar e avaliar estratégias | Pares de comunidades com poucas arestas cruzadas são costuras naturais para strangler fig: candidatos a primeira fatia. God nodes são os pontos mais caros de cortar |
| 4. Riscos | `graphify affected "<god node>" --depth 3` quantifica o raio de impacto de cada risco estrutural |

## reversa-designer

| Passo | Com o grafo |
|-------|-------------|
| Fase 1, 2. Detectar topologia do legado | Comunidades + acoplamento entre elas + pontos de entrada descrevem a topologia real (monolito coeso, monolito acoplado, módulos independentes) |
| Fase 1, 3. Diagnosticar saúde estrutural | God nodes, ciclos (`graphify path` A→B e B→A), candidatos a código morto |
| Fase 2, 8. Bounded contexts | Comunidades com fronteira fraca entre si são candidatas a bounded contexts. Sempre 🟡: valide com o domínio da spec e com o usuário na pausa |

## reversa-screen-translator

| Passo | Com o grafo |
|-------|-------------|
| Fase 1, 1. Detectar plataforma de origem | Receita "Dependências externas" mostra frameworks de UI efetivamente importados |
| Fase 1, 3. Inventário interno de telas | `graphify query "screen page view component form route template" --budget 1500`; cada tela localizada vem com `arquivo:Llinha`. Navegação entre telas: `graphify path "<tela A>" "<tela B>"` |

## reversa-inspector

| Passo | Com o grafo |
|-------|-------------|
| 4. Identificar fluxos críticos | `graphify path "<ponto de entrada>" "<símbolo da regra crítica>"` dá a cadeia que o teste de paridade precisa cobrir. `graphify affected "<símbolo>"` ordena os fluxos por raio de impacto |
| 5. Reusar characterization_specs | `graphify query "test spec <fluxo>" --budget 800` localiza testes existentes ligados ao fluxo |
