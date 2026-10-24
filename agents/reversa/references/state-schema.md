# Schema: .reversa/state.json

This file persists the full analysis state across sessions. Reversa reads and writes this file.

## Full structure

```json
{
  "version": "1.0.0",
  "project": "project-name",
  "user_name": "User Name",
  "answer_mode": "chat",
  "doc_level": null,
  "output_folder": "_reversa_sdd",
  "phase": "reconnaissance",
  "completed": ["reconnaissance"],
  "pending": ["excavation", "interpretation", "generation", "review"],
  "engines": ["claude-code"],
  "agents": ["reversa", "reversa-scout", "reversa-archaeologist"],
  "checkpoints": {
    "scout": {
      "completed_at": "2026-04-26T10:00:00Z",
      "files": [
        "_reversa_sdd/inventory.md",
        "_reversa_sdd/dependencies.md",
        ".reversa/context/surface.json"
      ]
    },
    "archaeologist": {
      "completed_at": "2026-04-26T11:00:00Z",
      "modules_analyzed": ["auth", "orders", "payments"],
      "files": [
        "_reversa_sdd/code-analysis.md",
        "_reversa_sdd/data-dictionary.md",
        ".reversa/context/modules.json"
      ]
    }
  },
  "created_files": [
    "CLAUDE.md",
    ".agents/skills/reversa/SKILL.md",
    ".reversa/state.json",
    ".reversa/plan.md"
  ]
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Installed Reversa version |
| `project` | string | Name of the legacy project |
| `user_name` | string | User's name (for interactions) |
| `answer_mode` | string | How the user answers gaps: `chat` or `file` |
| `doc_level` | string \| null | Volume of generated documentation: `essential`, `complete` or `detailed`. Starts `null` and must be filled by the user's choice after the Scout. |
| `output_folder` | string | Output folder for the specs (default: `_reversa_sdd`) |
| `phase` | string \| null | Current phase. `null` = not started |
| `completed` | string[] | Completed phases |
| `pending` | string[] | Pending phases |
| `checkpoints` | object | Completion record of each agent |
| `engines` | string[] | Configured engines (e.g. `["claude-code", "codex"]`) |
| `agents` | string[] | Installed agents |
| `created_files` | string[] | Every file created by Reversa (for safe uninstall) |
| `graph_mode` | string | Optional. Graph build mode chosen in the autonomous interview: `ast` or `semantic` |

All interactions and generated artifacts are in English.

## Valid phases

`reconnaissance` → `excavation` → `interpretation` → `generation` → `review`

## Writing rule

Never remove existing fields. Only add or update.

## Where NOT to write

The specs organization decision (granularity, custom folders, the Scout's original suggestion, timestamp of the choice) does **not** go in `state.json`. It is persisted in `.reversa/config.toml`, section `[specs]`, as described in `references/step-03-specs-organization.md`. `state.json` is runtime state; `config.toml` is a long-term decision.
