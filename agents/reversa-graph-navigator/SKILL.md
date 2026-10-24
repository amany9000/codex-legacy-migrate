---
name: reversa-graph-navigator
description: Protocolo Graph-First do Reversa. Define como os agentes consultam o grafo graphify antes de abrir código (query, explain, path, affected), como recortar leituras para as linhas localizadas, como mapear arestas do grafo na escala de confiança e como registrar o uso. Traz uma lente por agente (Scout, Archaeologist, Detective, Architect, Data Master, Reviewer, time de Migração e time Bugs). Carregado pelos orquestradores quando o grafo está ativo.
disable-model-invocation: true
license: MIT
compatibility: Codex. As instruções usam apenas shell e o CLI do graphify; outras engines não são alvo nesta versão.
metadata:
  author: aman
  version: "1.0.0"
  framework: reversa
  team: graph
  role: protocol
---

Este skill não é um agente com saída própria. É o protocolo que **todo agente do Reversa segue enquanto o grafo estiver ativo**, mais uma lente por agente que traduz os passos do SKILL.md dele em consultas ao grafo. Os artefatos de saída, os templates e a escala de confiança de cada agente **não mudam**: muda só o caminho para chegar à evidência.

## Ativação

1. Leia `.reversa/context/graph-index.json`. Ausente ou `enabled: false`: este protocolo não se aplica, siga o agente no modo clássico
2. Guarde `graph_path` e `source`. Todos os comandos abaixo usam `--graph <graph_path>`
3. Leia a lente do agente em execução (tabela abaixo) e aplique-a por cima do SKILL.md do agente. Em conflito sobre **como ler código**, a lente vence; em conflito sobre **o que produzir**, o SKILL.md do agente vence

| Agente | Lente |
|--------|-------|
| `reversa-scout` | `references/lens-scout.md` |
| `reversa-archaeologist` | `references/lens-archaeologist.md` |
| `reversa-detective` | `references/lens-detective.md` |
| `reversa-architect` | `references/lens-architect.md` |
| `reversa-data-master` | `references/lens-data-master.md` |
| `reversa-reviewer` | `references/lens-reviewer.md` |
| `reversa-paradigm-advisor`, `reversa-curator`, `reversa-strategist`, `reversa-designer`, `reversa-screen-translator`, `reversa-inspector` | `references/lens-migrate.md` (seção do agente) |
| `reversa-debugger`, `reversa-depth-inspection`, `reversa-debugger-fix`, `reversa-debugger-debate` | `references/lens-bugs.md` (seção do agente) |

Agentes sem lente (Writer, Visor, Design System etc.) seguem só as regras gerais abaixo quando precisarem abrir código.

Receitas somente leitura sobre o `graph.json` (arquivos de uma comunidade, acoplamento entre comunidades, símbolos sem chamador, dependências externas, contagem de linguagens) ficam em `references/recipes.md`, citadas pelas lentes.

## Regra central

Antes do primeiro grep, busca ou leitura de arquivo de código para responder qualquer pergunta sobre o código, consulte o grafo. Leia código bruto **apenas nas linhas que o grafo ou uma leitura anterior já localizou**. Inclua esta regra em todo prompt de subagente que explore código.

## Ordem de consulta

1. **Índice**: `graph-index.json` já traz comunidades, top files e god nodes. Muitas perguntas de panorama se resolvem aqui, sem comando
2. **`graphify query "<pergunta>" --graph <p> --budget 1500`**: BFS a partir dos nós que casam com a pergunta. Devolve nós com `src=<arquivo> loc=L<linha> community=<c>`
3. **Foco**:
   - `graphify explain "<símbolo>" --graph <p>`: vizinhança de um nó, com cada aresta marcada `[EXTRACTED]`/`[INFERRED]` e `arquivo:Llinha`
   - `graphify path "<A>" "<B>" --graph <p>`: caminho mais curto entre dois nós (relações entre partes)
   - `graphify affected "<símbolo>" --graph <p> --depth 2`: quem é impactado por um nó (travessia reversa)
4. **Leitura recortada**: abra só o intervalo de linhas do símbolo (receita "Contorno de arquivo" abaixo). Nunca o arquivo inteiro quando o grafo localizou o trecho
5. **Fallback**: grep restrito aos `top_files` da comunidade em questão, só quando o grafo não responde (ver "Códigos de saída"). Registre como fallback

`GRAPH_REPORT.md` (`report_path` do índice) só para revisão ampla de arquitetura (lente do Architect) ou quando query/explain não trouxerem contexto suficiente. Se `wiki_path` existir, use-o para navegação ampla em vez de navegar pelo código.

## Ajuste das consultas

- **`[!] TRUNCATED`** na saída: estreite antes de aumentar. Opções, nesta ordem: `--seed <símbolo ou arquivo>` (parte de um nó conhecido), `--context call` (só arestas de chamada), pergunta mais específica. Só então suba `--budget`, com teto de 3000
- **`--seed <arquivo>`** combinado com `--context call` devolve só o nó do arquivo (arquivos se ligam aos símbolos por `contains`). Para explorar um arquivo, use `--seed <arquivo>` sem `--context`, ou semeie pelos símbolos
- **`--dfs`**: use para seguir uma cadeia de chamadas em profundidade (fluxogramas)
- Rótulos de função levam parênteses (`install()`), métodos levam ponto (`.installSkill()`). Use o rótulo exato que o grafo mostrou

## Códigos de saída

| Código | Significado | O que fazer |
|--------|-------------|-------------|
| `0` | Resposta | Siga |
| `3` | Nome ambíguo, candidatos listados | Escolha o candidato certo e repita com o rótulo exato ou `--seed <id>` |
| `4` | Nenhum nó casa | Reformule uma vez com termos do código (nomes de arquivo, classe). Persistindo, fallback grep restrito à comunidade |

## Contorno de arquivo (leitura recortada)

Para saber o intervalo de cada símbolo de um arquivo sem abri-lo:

```bash
python3 -I - <graph_path> <arquivo-relativo> <<'EOF'
import json, sys
g = json.load(open(sys.argv[1])); f = sys.argv[2]
ns = sorted((int(n["source_location"][1:]), n["label"]) for n in g["nodes"]
            if n.get("source_file") == f and str(n.get("source_location", "")).startswith("L"))
for i, (line, label) in enumerate(ns):
    end = ns[i + 1][0] - 1 if i + 1 < len(ns) else "EOF"
    print(f"{label}\tL{line}-{end}")
EOF
```

Depois leia só o intervalo do símbolo (ex. `sed -n '74,94p' <arquivo>`). O contorno custa uma fração da leitura do arquivo e serve de sumário.

## O que ler direto, sem grafo

São baratos e o grafo AST não os cobre:

- Manifestos e configuração: `package.json`, `requirements.txt`, `pom.xml`, `go.mod`, `Gemfile`, `Cargo.toml`, `composer.json`, `.env.example`, `Dockerfile`, `docker-compose.yml`, CI (`.github/workflows/`, `Jenkinsfile`, `.gitlab-ci.yml`)
- DDL, migrations SQL e arquivos não-código (quando o grafo for AST)
- Listagens rasas: `git ls-files` com filtro, `find -maxdepth 2`
- Artefatos do próprio Reversa (`.reversa/`, `_reversa_sdd/` e afins)

## Escala de confiança com o grafo

O grafo acelera a localização, não substitui a leitura onde a afirmação depende do conteúdo:

| Evidência | Confiança máxima |
|-----------|------------------|
| Aresta `[EXTRACTED]` (AST) para fatos **estruturais**: chamadas, imports, herança, definição, pertencimento a arquivo | 🟢 CONFIRMADO, citando `arquivo:Llinha` da aresta |
| Aresta `[INFERRED]` (semântica) | 🟡 INFERIDO até a leitura das linhas confirmar |
| Regra de negócio, algoritmo, cálculo, validação, valor de constante, condição | 🟢 só depois de ler as linhas citadas. Só o grafo: 🟡 |
| Agrupamento por comunidade (módulo, bounded context) | 🟡 INFERIDO: comunidade é heurística de clusterização, confirme pelo código ou pelo usuário |
| Ausência no grafo (ex. "ninguém chama X") | 🟡 INFERIDO: chamadas dinâmicas, reflexão e injeção de dependência escapam do AST |

Toda citação vinda do grafo leva `arquivo:Llinha`.

## Registro de uso

Ao final de cada unidade de trabalho (módulo do Archaeologist, agente inteiro nos demais, bug no time Bugs), acrescente uma linha em `.reversa/context/graph-usage.jsonl`:

```json
{"ts":"2026-10-24T14:30:00Z","agent":"reversa-archaeologist","unit":"auth","queries":7,"raw_reads":4,"raw_lines":180,"fallbacks":1,"notes":"fallback: rota dinâmica não aparece no grafo"}
```

- `queries`: comandos do graphify rodados
- `raw_reads`: leituras de arquivo de código (recortadas ou não)
- `raw_lines`: total aproximado de linhas de código lidas
- `fallbacks`: greps de fallback

Esse arquivo é a medida do ganho do modo grafo. Não invente números: conte o que fez.

## Memória do grafo (opcional)

Só quando `source` for `reversa`: uma consulta que resolveu bem uma pergunta difícil pode ser salva para melhorar as próximas:

```bash
graphify save-result --question "<pergunta>" --answer "<resposta curta>" --nodes <rótulos citados> --outcome useful --memory-dir .reversa/graphify-out/memory
```

Com `source: root`, não salve (escreveria fora das pastas do Reversa).

## Código alterado durante a sessão

Se a sessão alterar código do legado (só o `reversa-debugger-fix` e agentes com edição liberada pela política), o grafo fica defasado. Ao fim da alteração, execute o `reversa-graph-builder` em modo `preflight` para a atualização incremental (só quando `source` for `reversa`).

## Regras absolutas

- O protocolo nunca relaxa a regra non-destructive do Reversa: consultas ao grafo são somente leitura
- `graphify-out/` na raiz é somente leitura; nada de `update`, `extract`, `cluster-only`, `save-result` ou `label` apontando para ela
- Arquivos sujos em `graphify-out/` ou `.reversa/graphify-out/` são esperados e não são motivo para ignorar o grafo. Só ignore o grafo se a tarefa for sobre o próprio grafo estar errado, ou se o usuário pedir
