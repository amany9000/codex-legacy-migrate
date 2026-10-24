import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDashboardServer } from '../src/dashboard/server.js';
import { runCodexSecurityScan } from '../src/security/codex-security-runner.js';

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function graphFixture(root) {
  writeJson(path.join(root, '.reversa', 'context', 'graph-index.json'), {
    enabled: true, graph_path: '.reversa/graphify-out/graph.json'
  });
  writeJson(path.join(root, '.reversa', 'graphify-out', 'graph.json'), {
    nodes: [{ id: 'entry', label: 'entry()', source_file: 'src/app.js', source_location: 'L1' }],
    links: []
  });
  writeJson(path.join(root, '_reversa_sdd', 'migration', '.state.json'), {
    completedAgents: [], pendingAgents: ['inspector'], currentAgent: { agent: 'inspector' }, nodes: []
  });
}

function fakeSdk() {
  return class FakeCodexSecurity {
    async run() {
      return { findings: { findings: [] }, coverage: { deferred: [], openQuestions: [] }, reportPath: null, sarifPath: null };
    }
    async close() {}
  };
}

test('dashboard APIs stay local, run scans, and never modify migration state', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reversa-dashboard-'));
  graphFixture(root);
  const statePath = path.join(root, '_reversa_sdd', 'migration', '.state.json');
  const originalState = fs.readFileSync(statePath, 'utf8');
  const server = createDashboardServer({
    projectRoot: root,
    port: 0,
    scan: (target, phase) => runCodexSecurityScan(target, phase, { CodexSecurity: fakeSdk() })
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = await fetch(`${base}/api/scorecard`);
  assert.equal(get.status, 200);
  assert.equal((await get.json()).graph.status, 'available');
  const scan = await fetch(`${base}/api/security/scan`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phase: 'post' }) });
  assert.equal(scan.status, 200);
  assert.equal((await scan.json()).scan.status, 'complete');
  assert.equal(fs.readFileSync(statePath, 'utf8'), originalState);
  const simulatedMigration = await fetch(`${base}/api/security/simulate-post`, { method: 'POST' });
  assert.equal(simulatedMigration.status, 404);
  assert.equal(fs.readFileSync(statePath, 'utf8'), originalState);
});
