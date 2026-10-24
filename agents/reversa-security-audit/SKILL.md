---
name: reversa-security-audit
description: Run a full-repository Codex Security audit before changes or after a migration, compare saved scans, and explain the Graphify-weighted risk score. Invoke when the user requests a Reversa security audit, security posture, baseline scan, or post-migration scan.
disable-model-invocation: true
license: MIT
compatibility: Reversa CLI with Node.js 22.13+ and an authenticated @openai/codex-security installation.
metadata:
  author: sandeco
  framework: reversa
  team: security
  role: audit
---

# Reversa Security Audit

Use the Codex Security CLI/SDK for a full-repository security posture scan. The Graphify navigator remains the focused context mechanism for Reversa migration agents; it does not restrict this security scan.

## Workflow

1. Resolve the target repository root from the user's request. If it is not clear which repository is intended, ask before scanning. Never default to scanning Reversa's own package when the user means a separate legacy project.
2. Choose phase `pre` for a baseline before source changes and phase `post` only after the migrated source is present. Reversa's migration planning workflow may produce specifications without editing source code; completing that workflow alone is not evidence that source migration occurred.
3. Run `reversa security-scan --target <repository-root> --phase <pre|post>`. For a bounded spend, pass `--max-cost-usd <amount>` when the user supplied or approved an amount. Do not run a fallback pattern scanner and do not represent failed or incomplete results as clean.
   Reversa defaults to `gpt-5.6-terra`, which is compatible with ChatGPT authentication. Set `CODEX_SECURITY_MODEL` when the account or provider requires another supported model.
4. Read the CLI scorecard and report paths from its output. Summarize scan status, coverage, repository security grade and score, pre/post finding changes, unmapped findings, compound God-node findings, and the top pain points in the chat response.
5. If the scan failed or coverage is incomplete, say so directly. Do not claim remediation unless a completed post scan with adequate coverage no longer reports a baseline finding.
6. When useful, tell the user how to open the dashboard: `reversa dashboard --target <repository-root>`.

## Evidence and privacy

- Scans cover the full target repository independently of Graphify migration traversal.
- Graphify edges and nodes provide structural context for scoring; a missing graph means the composite graph-weighted score is unavailable, while security findings remain reportable.
- Reports can contain source excerpts and vulnerability details. Keep them in `.reversa/security/`; do not copy them into public artifacts or commit them.
- Never modify source code, Reversa state, migration state, or Graphify artifacts as part of this audit.
