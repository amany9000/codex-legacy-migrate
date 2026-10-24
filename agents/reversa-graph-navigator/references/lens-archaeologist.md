# Lente do Archaeologist

É aqui que o modo grafo mais economiza. Mapa do `reversa-archaeologist/SKILL.md` com o grafo ativo. Saídas, níveis de documentação e checkpoints por módulo não mudam.

## Escopo do módulo

Para cada módulo do plano:

1. Pegue `top_files` e `community_ids` do módulo em `.reversa/context/graph-modules.json` (ausente: use as pastas do `surface.json`)
2. Liste os arquivos completos da comunidade com a receita "Arquivos de uma comunidade" (`references/recipes.md`)
3. Para cada arquivo relevante, rode a receita "Contorno de arquivo" do protocolo. O contorno (símbolo + intervalo de linhas) é o sumário do módulo e substitui abrir os arquivos para descobrir o que existe neles

## Passos

| Passo do Archaeologist | Com o grafo |
|------------------------|-------------|
| 1. Fluxo de controle | `graphify query "<módulo>: funções principais e fluxo" --seed <arquivo principal> --budget 1500`, depois `graphify explain "<símbolo>"` nos nós de maior grau do módulo. Assinaturas (nome, parâmetros, retorno): leia só a linha de declaração de cada símbolo pelo intervalo do contorno |
| 2. Algoritmos e lógica | Selecione pelo contorno e pelos nomes os símbolos com cara de regra (calcular, validar, converter, aplicar, processar, regra, preço, taxa, status). Leia **o corpo inteiro só desses símbolos**, pelo intervalo do contorno. Regras e cálculos só viram 🟢 depois dessa leitura |
| 3. Estruturas de dados | `graphify query "<módulo> model entity DTO interface type schema" --seed <arquivo> --budget 1200`. Leia o corpo das classes/tipos localizados para o dicionário de dados (campos, tipos, defaults) |
| 4. Metadados e configurações | `graphify query "<módulo> constant enum config flag" --budget 800`; leia só os blocos localizados |
| 5. Checkpoint por módulo | Igual. Acrescente a linha do módulo em `graph-usage.jsonl` (`unit: "<módulo>"`) |
| 6. Pausa preventiva | Igual. Com o grafo, a sessão aguenta mais módulos; use o critério do SKILL.md sem antecipar a pausa |

## Fluxogramas (`completo` e `detalhado`)

- Por módulo: a cadeia de chamadas sai de `graphify query "<ponto de entrada do módulo>" --seed <símbolo de entrada> --context call --dfs --budget 1500`. As arestas `calls` viram as setas do Mermaid
- Por função (`detalhado`): o fluxo interno (condicionais, loops) **não está no grafo AST**. Leia o corpo da função pelo intervalo do contorno
- Entre módulos: `graphify path "<símbolo A>" "<símbolo B>"`

## `legacy-mapping.md` (granularidade `module`)

Os `arquivo:Llinha` do contorno e do grafo já são a referência direta pedida. Use-os em vez de reler os arquivos.

## Escala de confiança

Siga a tabela do protocolo. Em resumo: estrutura (quem chama quem, o que pertence a quê) com aresta `[EXTRACTED]` é 🟢; comportamento só é 🟢 com as linhas lidas.
