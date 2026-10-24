# Migration MCP server

The Migration MCP server is an additive local stdio service under
`src/migration_mcp/`. It reuses this repository's `graphify-runner.js`,
`src/graphify/graph-context.js`, and `src/graphify/graph-diff.js`. It does not
change the Reversa project configuration or Graphify MCP implementation. The
repository currently has no checked-in MCP server configuration; its
`templates/config.toml` is Reversa project configuration, not MCP client
configuration.

## Prerequisites

- Python 3.11 or newer.
- Node.js available on `PATH`, or its executable set in `MIGRATION_MCP_NODE`.
- Graphify CLI available on `PATH` or in `~/.local/bin`, or set
  `MIGRATION_MCP_GRAPHIFY` to its executable path. The configured executable
  must resolve to a file named `graphify`, because the existing runner invokes
  that command. Graphify analysis uses the repository's existing
  `--code-only`/`--no-label` workflow and does not require network access.
- `uv` to create the isolated environment (recommended), or another way to
  install the declared `mcp>=2,<3` dependency into a Python 3.11+ environment.

From the repository root, create the environment and start the server:

```sh
uv sync --project src/migration_mcp
uv run --project src/migration_mcp python src/migration_mcp/server.py
```

The local environment interpreter is
`src/migration_mcp/.venv/bin/python` on Unix-like systems and
`src/migration_mcp/.venv/Scripts/python.exe` on Windows. To set a nonstandard
Node.js or Graphify path, supply `MIGRATION_MCP_NODE` or
`MIGRATION_MCP_GRAPHIFY` in the MCP client's server environment. These are
executable paths, not secrets. No API keys or other credentials are required.

## Connect from Codex

Codex reads local MCP server entries from `~/.codex/config.toml`; it also
supports trusted project-scoped `.codex/config.toml`. The desktop app, CLI, and
IDE extension share that configuration. Add the following server block after
replacing each placeholder with a path on the machine that runs Codex:

```toml
# Keep this launch configuration as supplied by Graphify MCP's own docs.
# For an HTTP server, retain its documented `url` entry instead.
[mcp_servers.graphify]
command = "<existing Graphify MCP server command>"
args = ["<existing Graphify MCP arguments>"]

[mcp_servers.migration]
command = "<ABSOLUTE_PATH_TO_REPO>/src/migration_mcp/.venv/bin/python"
args = ["<ABSOLUTE_PATH_TO_REPO>/src/migration_mcp/server.py"]
cwd = "<ABSOLUTE_PATH_TO_REPO>"
startup_timeout_sec = 20
tool_timeout_sec = 300

[mcp_servers.migration.env]
MIGRATION_MCP_NODE = "<ABSOLUTE_PATH_TO_NODE>"
MIGRATION_MCP_GRAPHIFY = "<ABSOLUTE_PATH_TO_GRAPHIFY_EXECUTABLE_NAMED_graphify>"
```

Replace the Python path with the Windows venv interpreter path on Windows.
Environment variables can be omitted when the MCP process inherits a PATH that
resolves both executables. The server has no path-variable expansion in this
TOML example; replace the literal placeholders. Keep this user-specific
configuration out of source control. Verify discovery with `codex mcp list`
or `/mcp` in the Codex TUI, then start a new local task/client session if the
currently running client has not refreshed its MCP list. For current Codex
configuration syntax, see [Codex MCP configuration](https://developers.openai.com/codex/extend/mcp).

### Graphify MCP alongside Migration MCP

Register the two servers as independent entries with unique names. Keep the
existing Graphify MCP transport and launch command exactly as its own
installation documents specify; place that existing configuration under a
separate `[mcp_servers.graphify]` entry and add the `[mcp_servers.migration]`
entry above. For a Graphify MCP that uses stdio, the separate entry has the
client's normal `command`, `args`, and optional `cwd` fields. For an HTTP MCP,
retain its documented `url` entry instead. Do not replace its command with the
Graphify CLI executable or modify Graphify MCP itself. The Graphify CLI help
verified for this repository does not advertise an MCP subcommand, so no
Graphify MCP launch command is guessed here.

This arrangement allows an MCP client to expose both tools: Graphify MCP's
native tools and Migration MCP's analysis/context/diff wrappers. Migration MCP
uses the Graphify CLI for `analyze_legacy_repo` and calls the existing local
JavaScript context and diff APIs for the other two tools.

## Tools

All three tools return structured JSON. Tool-level failures use
`success: false` and an `error` object with a stable `code` and human-readable
`message`; analysis may also include stdout/stderr snippets and artifact
presence. Errors are returned as tool results and are not hidden as successful
empty graphs.

### `analyze_legacy_repo`

Input:

- `repository_path` (required): absolute or resolvable directory containing
  `package.json`; the Migration MCP product repository itself is rejected.
- `timeout_seconds` (optional, default `300`): positive integer.

Example:

```json
{"repository_path":"/path/to/legacy-repo","timeout_seconds":300}
```

Success returns `target_repository`, artifact paths for `graph_json`,
`graph_report`, and `graph_html`, `artifact_presence`, `warnings`, and captured
runner `stdout`. It reports success only after the runner exits successfully
and all three native artifacts exist under `<repository_path>/graphify-out/`.
Errors include `repository_not_found`, `invalid_repository`, `invalid_timeout`,
`runner_not_found`, `graphify_unavailable`, `node_unavailable`, `timeout`,
`runner_failed`, and `missing_artifacts` (plus process-start/result failures).
The runner writes only inside the target's Graphify output directory and does
not remove unrelated repository files.

### `get_migration_context`

Input:

- `graph_path` (required): path to a readable Graphify JSON graph.
- `target` (required): node ID, label, or normalized label supported by the
  graph context adapter.
- `max_depth` (optional, default `3`, range `0..8`), `max_nodes` (default
  `60`, range `0..200`), `max_edges` (default `60`, range `0..200`), and
  `timeout_seconds` (default `30`, range `1..120`).

Example:

```json
{"graph_path":"/path/to/legacy-repo/graphify-out/graph.json","target":"findById()","max_depth":3,"max_nodes":60,"max_edges":60}
```

Success returns the resolved `target`, `matched_nodes`, direct `dependencies`,
`callers`, `direct_dependents`, `import_dependents`, bounded `impact`,
`relationship_direction`, `evidence`, `warnings`, and
`evidence_completeness`. Ambiguous/missing targets and malformed graphs retain
the adapter's diagnostic codes (including `AMBIGUOUS_TARGET`, `NODE_NOT_FOUND`,
and `INVALID_GRAPH`). Wrapper errors include `GRAPH_NOT_FOUND`,
`INVALID_GRAPH_PATH`, `INVALID_TARGET`, `INVALID_OPTION`, `NODE_UNAVAILABLE`,
`TIMEOUT`, and `MALFORMED_BRIDGE_OUTPUT`.

### `compare_migration_graphs`

Input:

- `baseline_graph_path` and `after_graph_path` (required): readable graph JSON
  files from distinct analysis snapshots.
- `timeout_seconds` (optional, default `30`, range `1..120`).

Example:

```json
{"baseline_graph_path":"/path/to/baseline/graphify-out/graph.json","after_graph_path":"/path/to/after/graphify-out/graph.json"}
```

Success returns the graph diff under `comparison`, preserving its schema
version, summary, node/edge additions, removals and metadata changes, ambiguity,
warnings, and limitations. It also returns
`behavioral_equivalence: "not_assessed"`. Errors include `GRAPH_NOT_FOUND`,
`INVALID_GRAPH_PATH`, `GRAPH_UNREADABLE`, `INVALID_OPTION`,
`INVALID_GRAPH`/other adapter diagnostics, `TIMEOUT`, and
`MALFORMED_BRIDGE_OUTPUT`.

## Baseline snapshots

`analyze_legacy_repo` writes to the target repository's `graphify-out/`
directory. A later analysis of that same target can replace its current graph.
After baseline analysis, copy the native `graph.json` to a separately named,
revision-specific baseline location before changing the source. Then analyze
the post-migration state and pass the preserved baseline path plus the new
`graphify-out/graph.json` path to `compare_migration_graphs`. For example:

```text
<baseline-root>/<revision>/graphify-out/graph.json
<post-root>/<revision>/graphify-out/graph.json
```

These paths must remain distinct; do not pass the same file as both arguments.
The comparison reads both snapshots and does not edit them. Store durable
baseline snapshots outside a disposable temp directory if they are needed for
later review. `graphify-out/` is ignored by Git to avoid accidentally
committing generated graphs, reports, HTML, or Graphify caches. If a baseline
is intentionally part of a reproducible test, keep it in the test's checked-in
fixture directory instead.

A graph diff reports structural changes only. Added or removed nodes and edges
do not prove that behavior is equivalent or that a migration succeeded. Run
the relevant test suite and review behavior separately. Graphify extraction,
bounded traversal, unsupported relation types, unresolved endpoints, and
ambiguous identity matching can all leave incomplete evidence.

## Tests and checks

From the repository root:

```sh
# JavaScript project suite
npm test

# Fast Python wrapper/protocol tests (no live Graphify CLI)
src/migration_mcp/.venv/bin/python -m unittest discover \
  -s src/migration_mcp/tests -v

# Opt-in end-to-end MCP stdio workflow; requires Node.js and Graphify
MIGRATION_MCP_RUN_GRAPHIFY_INTEGRATION=1 \
  src/migration_mcp/.venv/bin/python -m unittest discover \
  -s src/migration_mcp/integration_tests -v
```

Set `MIGRATION_MCP_NODE` and `MIGRATION_MCP_GRAPHIFY` for nonstandard binary
locations in the integration environment. The test uses a temporary repository
and cleans up only that temporary directory. `package.json` currently defines
`test` and `graphify:analyze`; the Python project declares no separate lint or
type-check command.

## Verification record

Verified locally on 2026-10-24:

- Codex CLI, system Python 3.11.9, the project venv's Python 3.12.11, Node.js
  20.17.0, `uv` 0.8.15, and Graphify 0.9.94 were available. The `node`
  executable resolved to `/usr/local/bin/node`; Graphify resolved to
  `~/.local/bin/graphify`. The Codex server registration uses the verified
  project venv interpreter plus explicit `MIGRATION_MCP_NODE` and
  `MIGRATION_MCP_GRAPHIFY` executable settings. `codex mcp list` reports
  `migration` as enabled and still lists the pre-existing `node_repl` entry.
- A separate MCP SDK client handshake using the exact command and arguments in
  the Codex registration listed all four tools and received `ok` from `health`.
- The real MCP stdio integration test completed analysis, context retrieval,
  snapshot comparison, and invalid-input calls for each business tool against
  an isolated temporary repository. It also listed the registered tools and
  completed a health call over the same protocol connection.
- A clean offline installation could not be verified. `uv sync --locked
  --offline` using the existing shared uv cache failed because the process
  could not read a cache entry. A retry with a new cache under a temporary
  directory failed in uv's macOS system-configuration initialization. No
  shared cache permissions were bypassed and no cache was deleted. To verify a
  A trial launch using the registered `uv run` form failed for the same cache
  permission reason, so the local registration was switched to the already
  installed project venv interpreter. To verify a fresh setup, provide a
  working uv environment plus either registry/network
  access to the locked packages or a readable, complete local uv cache. The
  existing repository virtual environment was used for tests and is not proof
  of clean installation.
- This checkout has no Graphify MCP server entry in the Codex configuration;
  the existing MCP entries were preserved. The Migration MCP registration is
  local to Codex and is not checked into this repository.
- Reversa in this repository is distributed as Agent Skills copied by its
  installer; it is not a separate plugin process and this checkout has no
  plugin manifest or plugin-scoped MCP map. In a Codex session, skills run in
  the Codex agent context, which can use the user-configured MCP entry. This
  was verified with `codex exec`: the runtime discovered
  `mcp__migration__health` and successfully called it after approval, then
  invoked `analyze_legacy_repo`, `get_migration_context`, and
  `compare_migration_graphs` against a disposable copy. Context returned both
  expected callers; it marked extracted evidence incomplete. Analysis warned
  that `report.test.js` yielded no symbols, and both graphs warned that their
  metadata says `directed=false`. Comparison against the preserved original
  graph returned zero structural changes. This was an invocation smoke test,
  not a migration or behavioral-equivalence test. Therefore no duplicate
  plugin-scoped server registration was added.
- The Codex CLI command above is the agent runtime verification. The MCP
  integration test remains a separate SDK client harness. The current chat
  tool registry itself does not expose Migration MCP, so this result does not
  mean every Codex-backed runtime or cloud session sees the local server; it
  must be a local Codex session loading the user's `~/.codex/config.toml`.

To repeat a minimal runtime check in local Codex after registering the server:

```sh
codex exec --ephemeral --approve-for-me \
  "Call the configured migration MCP health tool once and report its result."
```

The Reversa skill source now documents when to call the tools in
`agents/reversa-migrate/SKILL.md` and `agents/reversa-coding/SKILL.md`. Reinstall
or update the Reversa skills in a target project for those instruction changes
to be available there.

The MCP stdio test is a supported Python MCP SDK client harness, not an AI
agent invocation through Codex or Reversa. The Graphify-dependent test is
explicitly opt-in and must be run with the command above; it is not counted as
passed when skipped.
