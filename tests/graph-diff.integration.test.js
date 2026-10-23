import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from '../src/graphify/graph-context.js';
import { diffGraphs } from '../src/graphify/graph-diff.js';

const graphPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../legacy-demo-app/graphify-out/graph.json');

test('integration: compares representative snapshots cloned from the native Graphify graph', async () => {
  const baseline = await loadGraph(graphPath);
  const after = structuredClone(baseline.graph);
  after.nodes.push({ id: 'migration_probe', label: 'migrationProbe()', _origin: 'ast', file_type: 'code', source_file: 'probe.js', source_location: 'L1' });
  after.links.push({ source: 'migration_probe', target: 'legacy_utils_findbyid', relation: 'calls', _origin: 'ast', confidence: 'EXTRACTED', confidence_score: 1, context: 'call', source_file: 'probe.js', source_location: 'L2', weight: 1 });

  const result = await diffGraphs(baseline, after);
  assert.equal(result.baseline.edge_count, 34);
  assert.equal(result.nodes.added[0].node.id, 'migration_probe');
  assert.ok(result.edges.added.some(({ identity }) => identity.source === 'migration_probe' && identity.target === 'legacy_utils_findbyid' && identity.relation === 'calls'));
  assert.equal(result.summary.nodes_added, 1);
  assert.equal(result.summary.edges_added, 1);
  assert.equal(baseline.graph.nodes.some(({ id }) => id === 'migration_probe'), false);
});
