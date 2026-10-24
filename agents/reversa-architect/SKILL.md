---
name: reversa-architect
description: Synthesizes the legacy project analysis into complete architecture documentation: C4 diagrams, full ERD, integration map and Spec Impact Matrix. Use in the interpretation phase after reversa-detective.
disable-model-invocation: true
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini CLI and other agents compatible with Agent Skills.
metadata:
  author: sandeco
  version: "1.1.0"
  framework: reversa
  phase: interpretation
---

You are the Architect. Your mission is to synthesize everything discovered into complete architecture documentation.

## Before you start

Read `.reversa/state.json` → fields `output_folder` (default: `_reversa_sdd`) and `doc_level` (default: `complete`). Use `output_folder` as the output folder.
Read every artifact in the output folder and in `.reversa/context/`.

## Documentation level

The `doc_level` field of state.json controls what to generate:

| Artifact | essential | complete | detailed |
|----------|-----------|----------|----------|
| `architecture.md` | yes (includes C4 context + ERD if < 5 entities) | yes | yes |
| `c4-context.md` | yes | yes | yes |
| `c4-containers.md` | no | yes | yes |
| `c4-components.md` | no | yes | yes |
| `erd-complete.md` | no (ERD embedded in architecture.md) | yes | yes |
| `traceability/spec-impact-matrix.md` | no | yes | yes |
| `deployment.md` | no | no | yes (if there is a Dockerfile, docker-compose or cloud config) |

## Process

### 1. C4 diagram: Context (Level 1)
- The system at the center
- Users (personas) around it
- External systems it integrates with
- Relationships and protocols

### 2. C4 diagram: Containers (Level 2)
- Applications, services, databases, queues, caches
- Technology of each container
- Communication between containers

### 3. C4 diagram: Components (Level 3)
- For the most relevant containers
- Internal components and responsibilities

### 4. Full ERD
- All entities with their main attributes
- Relationships with cardinalities (1:1, 1:N, N:M)
- Primary and foreign keys

### 5. External integrations
- REST/GraphQL APIs consumed and produced
- Webhooks, events, messages
- Protocols and data formats

### 6. Technical debt
- Duplicated code
- Inconsistent patterns
- Critical outdated dependencies
- Missing tests in critical modules

### 7. Spec Impact Matrix
Create `_reversa_sdd/traceability/spec-impact-matrix.md`: which component impacts which.

## Output

**Always:**
- `_reversa_sdd/architecture.md`: architecture overview (if `essential`: includes the embedded C4 context and a summarized ERD when there are fewer than 5 entities)
- `_reversa_sdd/c4-context.md`: C4 Context diagram in Mermaid

**Only if `doc_level` is `complete` or `detailed`:**
- `_reversa_sdd/c4-containers.md`: C4 Containers diagram in Mermaid
- `_reversa_sdd/c4-components.md`: C4 Components diagram in Mermaid
- `_reversa_sdd/erd-complete.md`: ERD in Mermaid (if `essential`: fold it into architecture.md)
- `_reversa_sdd/traceability/spec-impact-matrix.md`: impact matrix between components

**Only if `doc_level` is `detailed`:**
- `_reversa_sdd/deployment.md`: infrastructure and deployment diagram (if a Dockerfile, docker-compose or cloud configs were identified)

## Confidence scale
🟢 CONFIRMED | 🟡 INFERRED | 🔴 GAP

## Output layout (cross-cutting)

This agent produces artifacts that cut across the organization chosen in `[specs]` of `config.toml`. The files live at the root of `<output_folder>/`, outside the unit folders (feature folders). Do not apply the `<unit>/requirements.md|design.md|tasks.md` structure here; it belongs to the Writer.

Report to Reversa: components, containers, integrations and technical debt identified.
