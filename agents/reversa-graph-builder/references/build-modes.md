# Modos de construção do grafo

Comandos validados no graphify `0.9.95`. Rode sempre a partir da raiz do projeto legado.

## AST (padrão)

```bash
graphify extract . --code-only --out .reversa
graphify cluster-only .reversa --no-label --no-viz
```

- `extract --code-only`: extração AST local, sem LLM e sem chave de API. Grava em `.reversa/graphify-out/`: `graph.json`, `manifest.json`, `.graphify_analysis.json`, `.graphify_root` e `cache/`
- `cluster-only --no-label --no-viz`: recalcula as comunidades e gera `GRAPH_REPORT.md`, sem chamar LLM e sem gerar `graph.html`. **Obrigatório após todo `extract`**: sem ele, o campo `community_name` dos nós fica defasado em relação ao `community` (comunidades com nome trocado)
- Respeita o `.gitignore` do projeto
- Rodar de novo é **incremental**: o manifest compara os arquivos e só re-extrai os alterados (saída `incremental summary: N files cached/unchanged, 1 re-extracted`). É o mesmo comando para construir e para atualizar

## Semântico

```bash
graphify extract . --out .reversa
graphify cluster-only .reversa --no-viz
```

- Sem `--code-only`: AST + extração semântica por LLM, com arestas `INFERRED` (com `confidence_score`) e nós de documentação
- Backend: o graphify usa a chave de API configurada no ambiente (gemini, kimi, claude, openai, deepseek ou ollama). Não passe `--backend` a menos que o usuário peça um específico. Sem chave, o comando falha informando o que espera: mostre a mensagem ao usuário
- `cluster-only` sem `--no-label` nomeia as comunidades com o mesmo backend (custo pequeno). Se o usuário quiser custo zero nessa etapa, use `--no-label`
- Atualização: o **mesmo** comando semântico, também incremental (custa tokens só dos arquivos alterados)
- **Nunca** atualize um grafo semântico com `--code-only`. O modo `--code-only` trata documentos como arquivos excluídos e os poda do grafo (saída `Pruned N node(s) from N deleted or excluded source file(s)`)

### Alternativa sem chave de API: skill `/graphify` do Codex

Se o usuário tiver o skill do graphify instalado no Codex, ele pode rodar `/graphify` para que o próprio Codex faça a extração semântica. Esse caminho grava `graphify-out/` na **raiz** do projeto, ou seja, fora das pastas do Reversa: só o usuário pode rodá-lo. Na ativação seguinte o grafo é detectado como `source: "root"` e usado somente leitura.

## Extrair comunidades e contagens para o índice

O `graph.json` tem `nodes`, `links` e `built_at_commit`. Cada nó traz `id`, `label`, `community`, `community_name`, `source_file` e `source_location` (ex. `L42`). Cada aresta traz `source`, `target`, `relation`, `confidence` (`EXTRACTED`/`INFERRED`), `context`, `source_file` e `source_location`.

Receita (somente leitura do grafo):

```bash
python3 -I - .reversa/graphify-out/graph.json <<'EOF'
import json, sys, collections
g = json.load(open(sys.argv[1]))
nodes, links = g["nodes"], g["links"]
com = collections.defaultdict(list)
for n in nodes:
    com[n.get("community")].append(n)
files = {n["source_file"] for n in nodes if n.get("source_file")}
out = {
    "git_head": g.get("built_at_commit"),
    "node_count": len(nodes), "edge_count": len(links), "file_count": len(files),
    "communities": [
        {"id": cid, "label": ns[0].get("community_name") or f"Community {cid}", "size": len(ns),
         "top_files": [f for f, _ in collections.Counter(n["source_file"] for n in ns if n.get("source_file")).most_common(5)]}
        for cid, ns in sorted(com.items(), key=lambda kv: -len(kv[1]))
    ],
}
print(json.dumps(out, ensure_ascii=False, indent=2))
EOF
```

Troque o caminho por `graphify-out/graph.json` quando `source` for `root`.

## Outros comandos úteis do builder

| Comando | Para quê |
|---------|----------|
| `graphify god-nodes --top 10 --json --graph <p>` | Hubs arquiteturais (`id`, `label`, `degree`) |
| `graphify benchmark <p>` | Redução de tokens por consulta contra leitura ingênua do corpus |
| `graphify --version` | Checagem da ferramenta |

## Repositórios grandes

- A extração AST usa todos os núcleos (`--max-workers`). Em monorepos muito grandes, avise o usuário que a primeira extração pode levar alguns minutos
- Pastas geradas ou vendorizadas que não estejam no `.gitignore` incham o grafo. A exclusão é decisão do usuário: ele pode criar `.graphifyignore` na raiz (você não cria)
- Grafos acima de ~5000 nós: mantenha `--no-viz` (já é o padrão aqui)
