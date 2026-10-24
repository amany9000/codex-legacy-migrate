import fs from 'node:fs';
import path from 'node:path';

const VALID_PHASES = new Set(['pre', 'post']);
const DEFAULT_SECURITY_MODEL = 'gpt-5.6-terra';

function assertSupportedRuntime() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const supported = (major === 22 && minor >= 13) || major === 24 || major === 26;
  if (!supported) throw new Error(`@openai/codex-security requires Node.js 22.13+ in 22.x, 24.x, or 26.x; current runtime is ${process.versions.node}.`);
}

function normalizeSeverity(value) {
  const severity = String(value || 'MEDIUM').toUpperCase();
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(severity) ? severity : 'MEDIUM';
}

function relativeFindingPath(root, value) {
  const raw = String(value || '').replace(/\\/g, '/');
  const location = raw.match(/^(.+?):(\d+)(?::\d+)?$/);
  const filename = location ? location[1] : raw;
  const line = location ? Number(location[2]) : null;
  const absolute = path.isAbsolute(filename) ? filename : path.resolve(root, filename);
  const relative = path.relative(root, absolute).replace(/\\/g, '/');
  if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) return { file: raw, line, outsideTarget: true };
  return { file: relative, line, outsideTarget: false };
}

function privateOutputDirectory(targetRoot) {
  const directory = path.join(targetRoot, '.reversa', 'security');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(directory, 0o700); } catch { /* Windows ACLs are managed by the OS. */ }
  const ignorePath = path.join(directory, '.gitignore');
  const ignoreRules = '*\n!.gitignore\n';
  const existingRules = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
  if (!existingRules.split(/\r?\n/).includes('*') || !existingRules.split(/\r?\n/).includes('!.gitignore')) {
    fs.writeFileSync(ignorePath, `${existingRules}${existingRules && !existingRules.endsWith('\n') ? '\n' : ''}${ignoreRules}`, { mode: 0o600 });
  }
  return directory;
}

function persistReport(directory, filename, payload) {
  const outputPath = path.join(directory, filename);
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(outputPath, 0o600); } catch { /* Windows ACLs are managed by the OS. */ }
  return outputPath;
}

function normalizeFinding(finding, index, targetRoot) {
  const fileValue = finding.location?.file || finding.file || finding.path || finding.location || 'unknown';
  const normalized = relativeFindingPath(targetRoot, fileValue);
  const title = String(finding.title || finding.message || 'Codex Security finding').trim();
  const cwe = Array.isArray(finding.cwe) ? finding.cwe.join(', ') : (finding.cwe || finding.weakness || 'CWE-unknown');
  const sourceId = finding.id || finding.findingId || `CS-${index + 1}`;
  return {
    id: String(sourceId),
    fingerprint: [normalized.file.toLowerCase(), String(cwe).toLowerCase(), title.toLowerCase().replace(/\s+/g, ' ')].join('|'),
    file: normalized.file,
    line: finding.line || finding.location?.line || normalized.line,
    cwe: String(cwe),
    severity: normalizeSeverity(finding.severity),
    title,
    description: String(finding.description || finding.summary || finding.evidence || ''),
    remediation: String(finding.remediation || finding.recommendation || ''),
    status: 'OPEN',
    source: 'codex-security',
    outsideTarget: normalized.outsideTarget
  };
}

export async function runCodexSecurityScan(targetDir = process.cwd(), phase = 'pre', options = {}) {
  if (!VALID_PHASES.has(phase)) throw new Error(`Invalid scan phase "${phase}". Use pre or post.`);
  const targetRoot = path.resolve(targetDir);
  if (!fs.existsSync(targetRoot) || !fs.statSync(targetRoot).isDirectory()) {
    throw new Error(`Scan target is not a directory: ${targetRoot}`);
  }
  const outputDirectory = privateOutputDirectory(targetRoot);
  const outputPath = path.join(outputDirectory, `security-${phase}.json`);
  const startedAt = new Date().toISOString();
  let scanner;
  let payload;
  const model = options.model || process.env.CODEX_SECURITY_MODEL || DEFAULT_SECURITY_MODEL;
  try {
    if (!options.CodexSecurity) assertSupportedRuntime();
    const module = options.CodexSecurity ? null : await import('@openai/codex-security');
    const CodexSecurity = options.CodexSecurity || module?.CodexSecurity;
    if (!CodexSecurity) throw new Error('The @openai/codex-security SDK does not export CodexSecurity.');
    const scannerFactory = options.scannerFactory || ((Ctor, config) => new Ctor(config));
    scanner = await scannerFactory(CodexSecurity, { codexOverrides: { model } });
    const result = await scanner.run(targetRoot, options.scanOptions || {});
    const rawFindings = result?.findings?.findings;
    if (!Array.isArray(rawFindings)) throw new Error('Codex Security returned no findings array; scan result cannot be treated as clean.');
    const coverage = result.coverage || {};
    const coverageAvailable = Boolean(result.coverage && Array.isArray(result.coverage.deferred));
    const deferred = Array.isArray(coverage.deferred) ? coverage.deferred : [];
    const openQuestions = Array.isArray(coverage.openQuestions) ? coverage.openQuestions : [];
    const status = coverageAvailable && deferred.length === 0 ? 'complete' : 'incomplete';
    payload = {
      schemaVersion: '2.0',
      engine: '@openai/codex-security',
      model,
      phase,
      target: targetRoot,
      status,
      startedAt,
      completedAt: new Date().toISOString(),
      coverage: { ...coverage, available: coverageAvailable, complete: status === 'complete', deferred, openQuestions },
      reportPath: result.reportPath || null,
      sarifPath: result.sarifPath || null,
      totalFindings: rawFindings.length,
      findings: rawFindings.map((finding, index) => normalizeFinding(finding, index, targetRoot))
    };
  } catch (error) {
    payload = {
      schemaVersion: '2.0',
      engine: '@openai/codex-security',
      model,
      phase,
      target: targetRoot,
      status: 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      coverage: { complete: false, deferred: [], openQuestions: [] },
      totalFindings: 0,
      findings: [],
      error: { name: error?.name || 'Error', message: error?.message || String(error) }
    };
  } finally {
    if (scanner && typeof scanner.close === 'function') {
      try { await scanner.close(); } catch { /* Preserve the scan result; close failure is non-fatal. */ }
    }
  }
  payload.outputPath = persistReport(outputDirectory, `security-${phase}.json`, payload);
  if (payload.status !== 'complete') {
    const reason = payload.error?.message || (payload.coverage.available
      ? `${payload.coverage.deferred.length} coverage item(s) deferred`
      : 'coverage metadata unavailable');
    const error = new Error(`Codex Security ${payload.status}: ${reason}`);
    error.report = payload;
    throw error;
  }
  return payload;
}

export { normalizeFinding, relativeFindingPath };
