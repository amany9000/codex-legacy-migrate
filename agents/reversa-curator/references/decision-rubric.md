# Curator Decision Rubric

Quick reference table for applying the decision policy.

## Decision table

| Signal observed in the rule | Default decision | Notes |
|---|---|---|
| 🟢 CONFIRMED, compatible with the target paradigm, no pain point | MIGRATE | no caveat |
| 🟡 INFERRED, compatible with the target paradigm | MIGRATE | add the note "validate in the coding agent" |
| 🔴 GAP | HUMAN DECISION | optional recommendation |
| ⚠️ AMBIGUOUS | HUMAN DECISION | listing the interpretations is mandatory |
| Rule cited as a pain point | HUMAN DECISION | default recommendation: replace with X in the new system |
| Rule incompatible with the brief (out of scope) | DISCARD | justification: "out of the scope declared in migration_brief.md" |
| Rule incompatible with the brief (technical) | DISCARD | justification: "a technical constraint in the brief prevents it" |
| Rule is a mechanism of the legacy paradigm, paradigm changed | DISCARD (paradigm-linked) | state the replacement in the target paradigm |
| Rule is a mechanism of the legacy paradigm, paradigm is the same | MIGRATE | no caveat |

## List of typical paradigm mechanisms (discardable when the paradigm changes)

### Procedural → event-driven
- Pessimistic lock (`SELECT ... FOR UPDATE`)
- Whole ACID transaction around the flow
- Synchronous response to the user with an inline side effect
- Retry implemented as a `for` loop in the controller

### Classic OO → OO with DI
- Active Record mixing persistence and domain
- Inheritance used for behavior reuse (prefer composition)
- Manual singleton (prefer scoped DI)

### Classic OO → functional
- Mutable encapsulation (prefer immutable types)
- Void methods with side effects (prefer return + pure function)

### OO with DI → event-driven
- Synchronous commands with an immediate return (prefer event + ack)
- Centralized orchestration (prefer choreography)
- 2PC / distributed transaction (prefer saga)

### Synchronous → asynchronous in general
- Timeout configured in the controller (moves to the consumer's retry policy)
- Error handling as a propagated exception (becomes a DLQ)

## What to NEVER discard because of the paradigm

- Pure business rules (calculations, conditions, derivations).
- Regulatory rules.
- Domain invariants.
- Rights / permissions.

These rules change **place** in the new paradigm, but they do not disappear.
