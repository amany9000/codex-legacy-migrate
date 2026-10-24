# Knowledge Graph (Graphify)

Reversa can build a code graph of the legacy project with [Graphify](https://github.com/Graphify-Labs/graphify) (Graphify-Labs, Apache-2.0 / MIT). Graphify parses source code locally with tree-sitter and writes a graph of files, symbols and their `calls` / `imports` relationships. Reversa's agents query that graph for evidence (who calls a function, what breaks if it changes, what changed after a migration slice) instead of re-reading every file.

The graph is optional. With Graphify disabled or missing, every agent works exactly as before.

## Install

Graphify is an external Python CLI (`graphifyy` on PyPI, command `graphify`, Python 3.10+). Reversa does not bundle it.

`npx reversa install` asks **"Enable the Graphify knowledge graph?"**. If you say yes and Graphify is not installed, it offers to install it, naming the installer first. It uses the first one available:

1. `uv tool install graphifyy`
2. `pipx install graphifyy`
3. `python3 -m pip install --user graphifyy` (without `--user` inside a virtualenv)

uv and pipx come first because they install Graphify in an isolated environment with its own `graphify` command on PATH. Plain pip is the fallback. Reversa does not use pip on an externally managed Python (Homebrew, Debian/Ubuntu, PEP 668), and never passes `--break-system-packages`; it suggests installing uv or pipx instead. When pip puts the `graphify` script outside PATH, Reversa runs Graphify as `python3 -m graphify`. The command that works is saved in `.reversa/state.json` → `graph.command`.

If nothing works (no Python 3.10+, or you decline), Reversa prints the manual steps and continues without the graph. Install Graphify later and run `npx reversa update` to enable it.

What the installer writes when the graph is enabled:

| Path | What |
|---|---|
| `.claude/skills/graphify/`, `.agents/skills/graphify/`, `.kiro/skills/graphify/` | Graphify's own skill, rendered by `graphify install` in a temporary folder and copied in. Reversa copies only the skill folder: it does not let Graphify edit `CLAUDE.md`, `AGENTS.md` or `.claude/settings.json`. Run `graphify claude install` yourself if you want Graphify's hooks. |
| `.agents/skills/reversa-graph/` (and the other skills folders) | The `/reversa-graph` skill |
| `.reversa/tools/graph/` | The graph toolkit (runner, context adapter, diff, command). It has no npm dependencies, so agents run it with plain `node`. |
| `.reversa/state.json` → `graph` | `enabled`, `cli_version`, `command` |

`npx reversa update` re-renders the Graphify skill with the installed CLI and refreshes the toolkit, skipping files you modified. `npx reversa uninstall` removes the copied skills and the toolkit; the Graphify CLI and `graphify-out/` are left in place.

## Commands

Agents run `node .reversa/tools/graph/bin/reversa-graph.js <command>` from the project root. The same commands are available as `reversa graph <command>` from the Reversa CLI of this fork (for example `node <fork>/bin/reversa.js graph build`). Note that `npx reversa` resolves to the upstream npm package, which has no `graph` command.

| Command | What it does |
|---|---|
| `build [target]` | Runs `graphify extract <target> --code-only --no-cluster`, then `graphify cluster-only <target> --no-label`, offline (`GRAPHIFY_BACKEND=none`) with a full re-scan (`GRAPHIFY_FORCE=1`). Reversa's own folders (`.reversa/`, `_reversa_*/`, custom output folders, and the `.claude/`, `.agents/` and `.kiro/` skills folders) are passed as `--exclude`, so installed skills and the toolkit never show up as legacy code. Checks `graph.json`, `GRAPH_REPORT.md` and `graph.html`, then saves the `latest` snapshot. The first build also saves `baseline`. |
| `snapshot <name>` | Copies `graphify-out/graph.json` to `.reversa/context/graph/snapshots/<name>.json`, plus a `.meta.json` with the Graphify version, counts and git HEAD |
| `status` | Integration enabled, CLI version and command, graph present, snapshots |
| `context "<symbol>"` | Dependencies, callers, direct dependents and reverse impact (`--depth`, `--max-nodes`, `--max-edges`, `--json`). Exit code 3 = ambiguous symbol, 4 = not found. |
| `summary` | Node, edge and file counts, relation counts, communities and hubs (`--top`, `--json`) |
| `deps` | `deps.json` for `reversa-arquitetura-3d`: file-to-file edges with `weight` (`--level=symbol` for symbols, `--out`) |
| `diff [baseline] [after]` | Structural diff (default `baseline latest`), in Markdown or `--json`, optionally written with `--out`. Accepts snapshot names, `current` or file paths. |

The modules behind these commands:

- `graphify-runner.js`: build and snapshots
- `src/graphify/graph-context.js`: context, summary, deps ([adapter notes](../graphify-context-adapter.md))
- `src/graphify/graph-diff.js`: diff ([result contract](../graph-diff.md))

The Graphify behavior they rely on is recorded in the [Graphify contract](../graphify-contract.md).

## How the pipeline uses it

| Agent | Use |
|---|---|
| Reversa (orchestrator) | Builds the graph before the Scout. At the post-Scout checkpoint it shows communities next to the folder-based modules. On re-extractions it adds `diff baseline latest` to the final report. |
| Scout | Writes `surface.json.knowledge_graph` (counts, communities, hubs) and a "Grafo de código" section in `inventory.md` |
| Archaeologist | Runs `context` on each module's central symbols to decide which files to read. Fills `modules.json` dependencies with `dependency_evidence` (`source: graph` or `inferred`). |
| Detective | Uses callers and impact to see where each business rule actually applies |
| Architect | Uses communities and edges as evidence for C4 components and the spec impact matrix |
| Strategist | Orders migration slices by reverse impact and finds low-coupling cut lines between communities |
| Inspector | Adds "Paridade estrutural (grafo)" to `parity_specs.md`: before a slice, `snapshot baseline-<slice>`; after it, `build` and `diff baseline-<slice> latest`, with acceptance criteria for expected and unexpected edge changes |
| Arquitetura 3D | Gets `deps.json` from `deps` when no other input exists |

All agents share one recipe: `agents/reversa-graph/references/graph-usage.md`.

## Limits

- The graph is structural evidence, not proof of behavior. A clean diff does not mean a migration is correct; parity tests are still required.
- Graphify covers code. Dynamic dispatch, reflection, SQL in strings, queues and HTTP calls may be missing, so real impact can be larger than the graph shows.
- The context adapter follows only the verified relations `calls`, `imports` and `imports_from`. Other relations, such as `indirect_call` added in Graphify 0.9.95, are reported in `warnings` and not followed.
- Builds run offline without LLM labeling, so communities keep `Community N` names. Community numbering can change between builds, and the diff reports it as node metadata changes.
