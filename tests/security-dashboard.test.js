import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runCodexSecurityScan } from '../src/security/codex-security-runner.js';
import { buildSecurityScorecard } from '../src/security/risk-scorer.js';

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'reversa-security-'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function graphFixture(root) {
  writeJson(path.join(root, '.reversa', 'context', 'graph-index.json'), {
    enabled: true, graph_path: '.reversa/graphify-out/graph.json', benchmark: { reduction: '4x' }
  });
  writeJson(path.join(root, '.reversa', 'graphify-out', 'graph.json'), {
    nodes: [
      { id: 'entry', label: 'entry()', source_file: 'src/app.js', source_location: 'L1' },
      { id: 'helper', label: 'helper()', source_file: 'src/helper.js', source_location: 'L4' }
    ],
    links: [{ source: 'entry', target: 'helper', relation: 'calls', confidence: 'INFERRED' }]
  });
  writeJson(path.join(root, '_reversa_sdd', 'migration', '.state.json'), {
    completedAgents: ['paradigm_advisor', 'curator', 'strategist', 'designer', 'screen_translator', 'inspector'],
    pendingAgents: [], currentAgent: { agent: null }, nodes: []
  });
}

function fakeSdk(findings, coverage = { deferred: [], openQuestions: [] }) {
  return class FakeCodexSecurity {
    async run(target) {
      assert.ok(fs.existsSync(target));
      return { findings: { findings }, coverage, reportPath: null, sarifPath: null };
    }
    async close() {}
  };
}

const baselineFinding = {
  id: 'finding-1', title: 'SQL injection in query handler', severity: 'HIGH', cwe: 'CWE-89',
  location: 'src/app.js:12', description: 'Unsanitized query value.', remediation: 'Use a parameterized query.'
};

test('full repository scan normalizes findings and writes private phase reports', async () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'export function query() {}');
  const report = await runCodexSecurityScan(root, 'pre', { CodexSecurity: fakeSdk([baselineFinding]) });
  assert.equal(report.status, 'complete');
  assert.equal(report.findings[0].file, 'src/app.js');
  assert.equal(report.findings[0].line, 12);
  assert.equal(report.findings[0].status, 'OPEN');
  assert.ok(fs.existsSync(path.join(root, '.reversa', 'security', 'security-pre.json')));
  assert.match(fs.readFileSync(path.join(root, '.reversa', 'security', '.gitignore'), 'utf8'), /^\*/);
});

test('post scan only marks a baseline finding remediated after complete pre and post coverage', async () => {
  const root = tempProject();
  graphFixture(root);
  await runCodexSecurityScan(root, 'pre', { CodexSecurity: fakeSdk([baselineFinding]) });
  await runCodexSecurityScan(root, 'post', { CodexSecurity: fakeSdk([]) });
  const scorecard = buildSecurityScorecard(root);
  assert.equal(scorecard.summary.remediatedFindings, 1);
  assert.equal(scorecard.summary.openFindings, 0);
  assert.equal(scorecard.summary.postMigrationVerifiedClean, true);
  assert.equal(scorecard.nodes.find((node) => node.id === 'entry').findings[0].status, 'REMEDIATED');
  assert.equal(scorecard.summary.tokenSavingsPercent, 75);

  const incompleteRoot = tempProject();
  graphFixture(incompleteRoot);
  await runCodexSecurityScan(incompleteRoot, 'pre', { CodexSecurity: fakeSdk([baselineFinding]) });
  await assert.rejects(runCodexSecurityScan(incompleteRoot, 'post', { CodexSecurity: fakeSdk([], { deferred: ['src/helper.js'] }) }), /incomplete/);
  const incomplete = buildSecurityScorecard(incompleteRoot);
  assert.equal(incomplete.summary.remediatedFindings, 0);
  assert.equal(incomplete.summary.unverifiedFindings, 1);
});

test('unmapped findings remain in the repository leaderboard', async () => {
  const root = tempProject();
  graphFixture(root);
  await runCodexSecurityScan(root, 'pre', { CodexSecurity: fakeSdk([{ ...baselineFinding, location: 'vendor/other.js:4' }]) });
  const scorecard = buildSecurityScorecard(root);
  assert.equal(scorecard.summary.unmappedFindings, 1);
  assert.equal(scorecard.painPoints[0].category, 'UNMAPPED_CODEX_SECURITY_FINDING');
});

test('npm security scan script supports dry run without invoking a scanner', () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['security:scan'], 'node src/security/cli-audit.js');
  const npmCli = process.env.npm_execpath;
  const output = npmCli
    ? execFileSync(process.execPath, [npmCli, 'run', 'security:scan', '--', '--dry-run', '--phase', 'post'], { cwd: packageRoot, encoding: 'utf8', windowsHide: true })
    : execFileSync(process.execPath, ['src/security/cli-audit.js', '--dry-run', '--phase', 'post'], { cwd: packageRoot, encoding: 'utf8', windowsHide: true });
  assert.match(output, /full repository/i);
  assert.match(output, /phase=post/i);
});
