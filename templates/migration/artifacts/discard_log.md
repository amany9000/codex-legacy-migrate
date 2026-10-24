---
schemaVersion: 1
generatedAt: <ISO-8601>
reversa:
  version: "x.y.z"
kind: discard_log
producedBy: curator
hash: "sha256:<hash of the body below the front-matter>"
---

# Discard Log

> Full record of what was discarded from the migration and why. Each item is traceable to its source in the legacy system.

## Discarded items

### BR-DISCARD-001
- **Source**: `_reversa_sdd/<unit>/{requirements,design}.md` § <section>
- **Description**: <discarded rule or behavior>
- **Justification**: <text>
- **Paradigm-linked**: yes | no
  - If yes: <which paradigm and how the target paradigm absorbs the case>
- **Replacement in the new system**: <none | replaced by X>
- **Risk of discarding**: low | medium | high, with an explanatory note

<repeat per item>

## Items discarded because of a paradigm change (dedicated subsection)

> Lists only the items with `Paradigm-linked = yes`. Explicit audit for the coding agent.

| ID | Source | Legacy paradigm | Replacement in the target paradigm |
|---|---|---|---|
| BR-DISCARD-XXX | <ref> | <e.g. synchronous pessimistic lock> | <e.g. idempotency via event ID> |

## Notes
<Final notes from the Curator about the discarded set.>
