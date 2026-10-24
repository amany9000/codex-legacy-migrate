# Migration & Security Risk Register

> Generated from a full-repository Codex Security scan and the active Graphify graph.

## Repository posture

| Metric | Pre-migration baseline | Post-migration scan | Status |
|---|---:|---:|---|
| Composite risk (0–100) | `{{PRE_RISK_SCORE}}` | `{{POST_RISK_SCORE}}` | `{{SCAN_STATUS}}` |
| Security risk (0–100) | `{{PRE_SECURITY_SCORE}}` | `{{POST_SECURITY_SCORE}}` | `{{COVERAGE_STATUS}}` |
| Grade | `{{PRE_GRADE}}` | `{{POST_GRADE}}` | `{{MIGRATION_STATUS}}` |
| Findings | `{{PRE_FINDING_COUNT}}` | `{{POST_FINDING_COUNT}}` | `{{OPEN_REMEDIATED_UNVERIFIED}}` |
| Graphify token reduction | `{{TOKEN_REDUCTION}}` | `{{GRAPH_STATUS}}` | `{{GRAPH_SOURCE}}` |

## Risk scoring

1. **Vulnerability severity (45%)**: normalized Codex Security findings from the whole repository.
2. **Graph blast radius (30%)**: node degree and God-node centrality from Graphify.
3. **Graph uncertainty (15%)**: incident edges marked `INFERRED` or `AMBIGUOUS`.
4. **Verification deficit (10%)**: remains until Reversa migration is complete and a complete post scan verifies the node clean.

A missing graph makes the composite graph-weighted score unavailable; it does not hide the full-repository security findings. Findings without an exact Graphify file match remain in the repository totals as unmapped findings. Only a finding absent from a completed, fully covered post scan is marked remediated.

## Ranked pain points

| ID | Graph node | File | CWE | Severity | Category | Status | Remediation |
|---|---|---|---|---|---|---|---|
| `{{ID}}` | `{{NODE}}` | `{{FILE}}:{{LINE}}` | `{{CWE}}` | `{{SEVERITY}}` | `{{CATEGORY}}` | `{{STATUS}}` | `{{REMEDIATION}}` |
