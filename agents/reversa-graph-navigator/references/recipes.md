# Receitas sobre o `graph.json`

Consultas somente leitura que o CLI não oferece direto. Troque `<graph_path>` pelo valor do `graph-index.json`. Todas rodam com `python3 -I` e só leem o grafo.

Estrutura do grafo: `nodes` (`id`, `label`, `community`, `community_name`, `source_file`, `source_location`, `_callable`) e `links` (`source`, `target`, `relation`, `confidence`, `context`, `source_file`, `source_location`). Relações vistas em grafos AST: `calls`, `imports`, `imports_from`, `contains`, `method`, `dynamic_import`, `inherits`, `extends`, `implements`, `references`, `uses`.

## Arquivos de uma comunidade

```bash
python3 -I - <graph_path> <community_id> <<'EOF'
import json, sys, collections
g = json.load(open(sys.argv[1])); c = int(sys.argv[2])
cnt = collections.Counter(n["source_file"] for n in g["nodes"] if n.get("community") == c and n.get("source_file"))
for f, n in cnt.most_common():
    print(f"{n}\t{f}")
EOF
```

## Acoplamento entre comunidades

Arestas que cruzam comunidades (exceto `contains`). Poucas arestas = fronteira natural (costura de strangler, bounded context); muitas = acoplamento.

```bash
python3 -I - <graph_path> <<'EOF'
import json, sys, collections
g = json.load(open(sys.argv[1]))
byid = {n["id"]: n for n in g["nodes"]}
cross = collections.Counter()
for e in g["links"]:
    a, b = byid.get(e["source"]), byid.get(e["target"])
    if a and b and a.get("community") != b.get("community") and e["relation"] != "contains":
        cross[tuple(sorted((a.get("community"), b.get("community"))))] += 1
for (x, y), n in cross.most_common(20):
    print(f"Community {x} <-> Community {y}: {n}")
EOF
```

## Símbolos sem chamador

Candidatos a código morto. **Sempre 🟡**: pontos de entrada (comandos, handlers, rotas), construtores, callbacks de framework e chamadas dinâmicas aparecem aqui sem estarem mortos. Descarte da lista os pontos de entrada que o Scout identificou.

```bash
python3 -I - <graph_path> <<'EOF'
import json, sys
g = json.load(open(sys.argv[1]))
rel = {"calls", "indirect_call", "references", "imports_from", "re_exports", "dynamic_import"}
called = {e["target"] for e in g["links"] if e["relation"] in rel}
for n in g["nodes"]:
    if n.get("_callable") and n["id"] not in called and n.get("source_file"):
        print(f'{n["label"]}\t{n["source_file"]}:{n["source_location"]}')
EOF
```

## Dependências externas

Nós sem `source_file` com id `ref_*` são módulos externos importados (bibliotecas, SDKs). Liste quem os usa:

```bash
python3 -I - <graph_path> <<'EOF'
import json, sys, collections
g = json.load(open(sys.argv[1]))
byid = {n["id"]: n for n in g["nodes"]}
users = collections.defaultdict(set)
for e in g["links"]:
    t = byid.get(e["target"])
    if t and not t.get("source_file"):
        users[t["label"]].add(e.get("source_file") or "?")
for lib, fs in sorted(users.items(), key=lambda kv: -len(kv[1])):
    print(f"{lib}\t{len(fs)} arquivo(s)\t{', '.join(sorted(fs)[:5])}")
EOF
```

## Contagem de linguagens

```bash
git ls-files | sed -n 's/.*\.\([A-Za-z0-9]*\)$/\1/p' | sort | uniq -c | sort -rn | head -20
```

Sem git: `find . -type f -not -path './.git/*' -not -path './node_modules/*'` com o mesmo `sed`.
