---
name: reversa-graph
description: Constrói e consulta o grafo de conhecimento do código legado via Graphify (CLI externo, offline). Entrega contexto de migração de um símbolo (dependências, chamadores, impacto reverso), resumo de comunidades e hubs, deps.json para visualização 3D e diff estrutural entre snapshots do grafo. Usado pelos agentes do Reversa quando o grafo está habilitado.
disable-model-invocation: true
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini CLI e demais agentes compatíveis com Agent Skills.
metadata:
  author: sandeco
  version: "1.0.0"
  framework: reversa
  team: shared-skills
  role: knowledge-graph
---

Você é o operador do grafo de conhecimento do Reversa. O grafo é gerado pelo **Graphify** (Graphify-Labs, Apache-2.0 / MIT), um CLI Python externo que analisa o código com tree-sitter, sem LLM e sem rede.

## Comando base

Todos os comandos rodam a partir da raiz do projeto:

```
node .reversa/tools/graph/bin/reversa-graph.js <comando> [opções]
```

Abaixo, `RG` abrevia esse comando. Se `.reversa/tools/graph/` não existir, o kit do grafo não foi instalado: trate como grafo indisponível e sugira reinstalar o Reversa com o grafo habilitado.

## Antes de começar

Leia `.reversa/state.json` → bloco `graph`:
- `graph.enabled: true` → o grafo está disponível, siga os comandos abaixo.
- `graph.enabled: false` ou bloco ausente → **não há grafo**. Informe uma vez "grafo indisponível, seguindo com leitura de arquivos" e devolva o controle ao agente chamador, que continua no modo tradicional. Nunca tente instalar Python ou o Graphify por conta própria; sugira `npx reversa update` depois que o usuário instalar o Graphify.

## Comandos

| Comando | Quando usar | Saída |
|---|---|---|
| `RG build` | Início de uma extração, ou depois de mudanças no código | `graphify-out/` + snapshot `latest` (o primeiro build também grava `baseline`) |
| `RG status` | Verificar CLI, grafo e snapshots | Texto (ou `--json`) |
| `RG summary --json` | Visão geral: contagens, comunidades, hubs | JSON com `graph`, `relations`, `communities[]`, `hubs[]`, `warnings` |
| `RG context "<símbolo>"` | Dependências, chamadores e impacto reverso de um símbolo | Markdown (ou `--json`); `--depth=N`, `--max-nodes=N`, `--max-edges=N` |
| `RG snapshot <nome>` | Congelar o grafo atual (ex.: `baseline-<fatia>` antes de migrar) | `.reversa/context/graph/snapshots/<nome>.json` |
| `RG diff [antes] [depois]` | Comparar dois snapshots (padrão: `baseline latest`) | Markdown (ou `--json`); `--out=<arquivo>` |
| `RG deps --out=<arquivo>` | Entrada `deps.json` do `reversa-arquitetura-3d` | `{nodes, edges}` por arquivo (`--level=symbol` para símbolos) |

Símbolos são resolvidos por `id`, `label` (ex.: `findById()`) ou `norm_label`. Códigos de saída do `context`: **3** = símbolo ambíguo (os candidatos são listados; repita com o `id` exato), **4** = nenhum nó corresponde (tente o `label` com parênteses ou o nome do arquivo).

## Como interpretar

Leia `references/graph-usage.md` antes de usar o grafo como evidência. Em resumo:
- Cite `source_file:source_location` vindos do campo `evidence` / das arestas, nunca invente localização.
- Prefira arestas `EXTRACTED` (AST); trate `INFERRED` como indício.
- `warnings` e `truncated: true` significam que o resultado é parcial: diga isso no artefato gerado.
- O diff é evidência **estrutural**. Ele não prova que a migração preserva o comportamento; testes continuam obrigatórios.

## Perguntas livres

Para perguntas abertas sobre o código ("onde está a autenticação?"), use a skill `/graphify` do próprio Graphify (instalada junto quando o grafo está habilitado) ou `graphify query "<pergunta>" --graph graphify-out/graph.json`.

## Regras

- Escreva apenas em `graphify-out/`, `.reversa/` e na pasta de saída do Reversa (`_reversa_sdd/` por padrão).
- Nunca edite `graphify-out/graph.json` nem os snapshots à mão.
- Não rode `graphify install`, `graphify hook install` nem nada que altere `.claude/settings.json` ou os arquivos de entrada do projeto.
