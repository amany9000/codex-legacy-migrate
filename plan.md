# Reversa Full-Repository Security Posture

## Goal

Integrate Codex Security into Reversa as an independent full-repository security audit. Graphify skills continue to give migration agents bounded, graph-first code context; security scanning is not limited to those traversals. Do not add Migration MCP endpoints in this phase.

## Behavior

- Provide a `reversa-security-audit` skill for pre-change baseline and post-change scans, plus CLI commands and a local read-only dashboard.
- Use `@openai/codex-security` SDK and preserve scan status, coverage, normalized findings, and failure details. No heuristic fallback may be reported as a Codex Security result.
- Store pre/post JSON, scorecard JSON, and Markdown report in `.reversa/security/`; ignore generated reports in Git and apply restrictive file permissions where supported.
- Compare findings only when both scans completed with complete coverage. A finding is remediated only when absent from a complete post scan; otherwise retain it as open or unverified.
- Join findings to Graphify nodes by exact normalized source path. Keep unmatched findings in repository totals and leaderboard.
- Score with vulnerability severity (45%), graph blast radius (30%), graph uncertainty (15%), and verification deficit (10%). If Graphify data is unavailable, retain the security score but report the composite graph-weighted score as unavailable.
- Show scan posture, graph, findings, Reversa workflow progress, and pain points in a dashboard bound to loopback. Dashboard requests never change migration state or source files.

## Acceptance checks

- CLI supports `security-scan`, pre/post phase, full-repository target, cost limit, and dry run; failed or incomplete scans exit nonzero and are not described as clean.
- Dashboard supports full-repository scan, read-only status and graph views, node risk and one-hop details, and a ranked findings table. No migration simulation endpoints.
- Tests cover normalization, graph matching, unmapped findings, pre/post comparison, incomplete coverage, private report output, CLI script invocation, local dashboard APIs, and migration-state immutability.
