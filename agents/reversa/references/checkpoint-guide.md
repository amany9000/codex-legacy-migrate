# Checkpoint Guide: .reversa/state.json

Reversa is the only agent that **writes** to state.json. The other agents only read it.

## Absolute rules

1. **Never remove existing fields.** Only add or update.
2. **Always read the file before writing**: another agent may have updated `checkpoints`.
3. **Save after each completed phase**, not only at the end.
4. **On context overflow**, save immediately before pausing.

## What to save at each phase

### When starting a phase
```json
{
  "phase": "reconnaissance"
}
```

### When an agent finishes
```json
{
  "checkpoints": {
    "scout": {
      "completed_at": "2026-04-26T10:30:00Z",
      "files": [
        "_reversa_sdd/inventory.md",
        "_reversa_sdd/dependencies.md",
        ".reversa/context/surface.json"
      ]
    }
  }
}
```

### When a whole phase finishes
```json
{
  "phase": "excavation",
  "completed": ["reconnaissance"],
  "pending": ["excavation", "interpretation", "generation", "review"]
}
```

### When marking a partial Archaeologist task
```json
{
  "checkpoints": {
    "archaeologist": {
      "modules_analyzed": ["auth", "orders"],
      "modules_pending": ["payments", "users"]
    }
  }
}
```

## Phase sequence

```
null → reconnaissance → excavation → interpretation → generation → review
```

When moving to the next phase:
- Remove the finished phase from `pending` and add it to `completed`
- Update `phase` to the next phase

## Example state.json with an analysis in progress

```json
{
  "version": "1.0.0",
  "project": "my-system",
  "user_name": "Ana",
  "answer_mode": "chat",
  "output_folder": "_reversa_sdd",
  "phase": "excavation",
  "completed": ["reconnaissance"],
  "pending": ["excavation", "interpretation", "generation", "review"],
  "checkpoints": {
    "scout": {
      "completed_at": "2026-04-26T10:30:00Z",
      "files": [
        "_reversa_sdd/inventory.md",
        "_reversa_sdd/dependencies.md",
        ".reversa/context/surface.json"
      ]
    },
    "archaeologist": {
      "modules_analyzed": ["auth", "orders"],
      "modules_pending": ["payments", "users"]
    }
  },
  "engines": ["claude-code"],
  "agents": ["reversa", "reversa-scout", "reversa-archaeologist"],
  "created_files": []
}
```

## Pause message on context overflow

If the context is running out, save the current checkpoint and say:

> "[Name], I'll pause here to preserve the context. Everything is saved in `.reversa/state.json`. Type `reversa` in a new session to continue where we left off."
