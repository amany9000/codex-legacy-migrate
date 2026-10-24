# [Unit Name], Implementation Tasks

> Template for the `tasks.md` file. Focuses on a sequence of executable tasks to reimplement the unit from the legacy system, with traceability to the original code.

## Prerequisites
- [ ] The unit's dependencies listed in `design.md` are available
- [ ] Compatible database schema/migrations (if applicable)
- [ ] Required environment variables / configs documented

## Tasks

> Each task references the legacy file the behavior was extracted from.

- [ ] T-01, [Task description]
  - Legacy source: `path/file.ext:line`
  - Definition of done: [how to validate]
  - Confidence: 🟢 / 🟡 / 🔴

- [ ] T-02, [Task description]
  - Legacy source: `path/file.ext:line`
  - Definition of done: [how to validate]
  - Confidence: 🟢 / 🟡 / 🔴

## Test Tasks

- [ ] TT-01, Happy-path test of the main flow (see `requirements.md`, Acceptance Criteria)
- [ ] TT-02, Test of the main error case
- [ ] TT-03, [Other relevant scenarios]

## Data Migration Tasks (if applicable)

- [ ] TM-01, [Migration of data X, referencing the legacy schema]

## Suggested Order
1. [Which tasks should be done first and why]
2. [Blockers between tasks]

## Pending Gaps (🔴)
[List here the decisions that depend on human validation before implementation]
