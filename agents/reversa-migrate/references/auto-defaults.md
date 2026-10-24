# `--auto` defaults

When the user invokes `/reversa-migrate --auto`, the orchestrator skips human pauses and applies these defaults. Before starting, the warning to the user lists each of them. Each auto-applied item is recorded in `ambiguity_log.md` with the tag `auto-decided` for later review.

## Paradigm Advisor
- Choose **option 1: adopt the target stack's natural paradigm**.
- `derived_appetite` = `transformational`.

## Curator
- HUMAN DECISION items are marked as pending in `ambiguity_log.md` and do not block the pipeline.
- 🟡 INFERRED items → MIGRATE (with the note "validate in the coding agent").
- 🔴 GAP and ⚠️ AMBIGUOUS items → DISCARD with the explicit note "auto-discarded, requires review".

## Strategist
- Adopts the strategy marked as **recommended**.
- `critical` risks that would depend on a human owner get `owner = "TBD"` in `risk_register.md`.

## Designer
- **Topology (Phase 1)**: accepts the proposed modern topology (option 2). The justification recorded in `topology_decision.md` is the Designer's own; `ambiguity_log.md` gets the `auto-decided` tag for later review. Rationale: `--auto` is for users who want the recommended path; refusing to decide would stop the pipeline and break the `--auto` contract.
- **Architecture (Phase 2)**: approves the first proposal without iteration.
- Bounded contexts, events and ADRs are accepted as proposed.

## Screen Translator
- **Mode (Phase 1)**: adopts the mode the agent recommends for the detected source→target pair (literal for textual pairs; modernized for platform changes; hybrid only with an explicit list, so never in `--auto`).
- **Generation (Phase 2)**: accepts the generated `target_screens.md` and propagates deviations as `pending`. `--auto` does not approve deviations on its own; they stay in `ambiguity_log.md` as `auto-decided` for later review, without blocking the handoff (exception to `--auto`: if a deviation is `type=correction` in literal mode, the agent refuses and asks for human approval even in `--auto`, because changing text without sign-off breaks expectations).
- **Golden file capture**: not automated in `--auto` (the oracle driver is OQ-02). Only emits `manifest.yaml` with suggested commands.
- **Legacy without UI**: marks status `skipped` automatically, without asking.
- **Missing Discovery prerequisites** (`_reversa_sdd/design-system/` or `_reversa_sdd/ui/inventory.md`): creates a minimal `tokens-derived.md` and builds the inventory from the source code only; alerts in `ambiguity_log.md`.

## Inspector
- Uses parity criteria derived directly from the chosen paradigm (see `parity-coverage-matrix.md` in the agent).
- Does not negotiate the "parity accepted" criterion with the user.

## Detected manual modifications
- Adopts **option (a)**: keep the manually modified version and abort regeneration of that artifact. Never destroys human work.

## Mandatory warning

Always before starting `--auto`, present:

> "⚠️ `--auto` mode enabled. The defaults below will be applied without pausing for confirmation:
> - Paradigm Advisor: adopt the stack's natural paradigm (transformational).
> - Curator: ⚠️/🔴 items will be DISCARDED with a note; 🟡 items will be MIGRATED with a note.
> - Strategist: the recommended strategy will be adopted.
> - Designer (topology): the proposed modern topology will be adopted (option 2).
> - Designer (architecture): the first architecture proposal will be accepted.
> - Screen Translator (mode): adopts the recommended mode for the source→target pair. Hybrid mode never in `--auto`. On a legacy system without UI, status `skipped`.
> - Screen Translator (generation): deviations stay pending in `ambiguity_log.md` (not approved). Golden file capture is not automated (manifest only).
> - Inspector: parity criteria derived from the paradigm without interactive adjustment.
>
> The final `handoff.md` will highlight every auto-decided item for later review.
> Confirm? (y/N)"
