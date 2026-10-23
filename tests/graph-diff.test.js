import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffGraphFiles, diffGraphs } from '../src/graphify/graph-diff.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, 'fixtures', name);

function graph(nodes, links) {
  return { directed: false, multigraph: true, graph: { schema_version: 1, graphify_version: '0.9.94' }, nodes, links, hyperedges: [] };
}

test('identical graphs produce an empty structural diff', async () => {
  const result = await diffGraphFiles(fixture('graph-diff-baseline.json'), fixture('graph-diff-baseline.json'));
  assert.equal(result.schema_version, 1);
  assert.equal(result.summary.complete, true);
  assert.deepEqual(result.nodes.added, []);
  assert.deepEqual(result.nodes.removed, []);
  assert.deepEqual(result.nodes.changed, []);
  assert.deepEqual(result.edges.added, []);
  assert.deepEqual(result.edges.removed, []);
  assert.deepEqual(result.edges.changed, []);
});

test('detects added and removed nodes and separates metadata changes', async () => {
  const result = await diffGraphFiles(fixture('graph-diff-baseline.json'), fixture('graph-diff-after.json'));
  assert.deepEqual(result.nodes.added.map(({ node }) => node.id), ['new_service']);
  assert.deepEqual(result.nodes.removed.map(({ node }) => node.id), ['obsolete']);
  const renamed = result.nodes.changed.find(({ identity_changed }) => identity_changed);
  assert.deepEqual(renamed.identity_changed, { before: 'handler_v1', after: 'handler_v2' });
  assert.equal(result.summary.complete, false);
  assert.ok(renamed.metadata_changes.some(({ field }) => field === 'source_location'));
  assert.equal(result.nodes.changed.some(({ identity }) => identity.value === 'lookup'), false); // unchanged nodes are not emitted as changed
});

test('detects added and removed directed edges and preserves relation types', async () => {
  const result = await diffGraphFiles(fixture('graph-diff-baseline.json'), fixture('graph-diff-after.json'));
  assert.ok(result.edges.removed.some(({ identity }) => identity.source === 'lookup' && identity.target === 'handler_v1' && identity.relation === 'imports'));
  assert.ok(result.edges.added.some(({ identity }) => identity.source === 'lookup' && identity.target === 'new_service' && identity.relation === 'imports_from'));
  assert.ok(result.edges.changed.some(({ identity }) => identity.source === 'handler_v1' && identity.target === 'lookup' && identity.relation === 'calls'));
});

test('reversed edges and different relation types are distinct structures', async () => {
  const before = graph([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], [{ source: 'a', target: 'b', relation: 'calls' }]);
  const after = graph([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], [{ source: 'b', target: 'a', relation: 'calls' }]);
  const reversed = await diffGraphs(before, after);
  assert.equal(reversed.edges.removed.length, 1);
  assert.equal(reversed.edges.added.length, 1);

  const changedRelation = await diffGraphs(before, graph(before.nodes, [{ source: 'a', target: 'b', relation: 'imports' }]));
  assert.equal(changedRelation.edges.removed[0].identity.relation, 'calls');
  assert.equal(changedRelation.edges.added[0].identity.relation, 'imports');
});

test('duplicate identifiers and ambiguous label fallback are explicit and incomplete', async () => {
  const duplicate = await diffGraphs(
    graph([{ id: 'dup', label: 'First' }, { id: 'dup', label: 'Second' }], []),
    graph([{ id: 'dup', label: 'First' }], [])
  );
  assert.equal(duplicate.summary.complete, false);
  assert.ok(duplicate.warnings.some(({ code }) => code === 'DUPLICATE_NODE_ID'));

  const ambiguous = await diffGraphs(
    graph([{ id: 'old', label: 'Shared', norm_label: 'shared' }], []),
    graph([{ id: 'new-a', label: 'Shared', norm_label: 'shared' }, { id: 'new-b', label: 'Shared', norm_label: 'shared' }], [])
  );
  assert.equal(ambiguous.summary.complete, false);
  assert.equal(ambiguous.nodes.ambiguous.length, 1);
  assert.equal(ambiguous.nodes.added.length, 0);
  assert.equal(ambiguous.nodes.removed.length, 0);
  assert.ok(ambiguous.warnings.some(({ code }) => code === 'AMBIGUOUS_NODE_MATCH'));
});

test('invalid and incomplete graph inputs are handled without a clean diff', async () => {
  await assert.rejects(diffGraphs({}, graph([], [])), /nodes array/);
  await assert.rejects(diffGraphs(graph([], []), { nodes: [] }), /links or edges array/);
  const incomplete = await diffGraphs(
    graph([{ id: 'a', label: 'A' }], [{ source: 'missing', target: 'a', relation: 'calls' }]),
    graph([{ id: 'a', label: 'A' }], [])
  );
  assert.equal(incomplete.summary.complete, false);
  assert.ok(incomplete.warnings.some(({ code }) => code === 'INCOMPLETE_GRAPH'));
});

test('native inputs are not mutated and output is JSON serializable', async () => {
  const before = JSON.parse(JSON.stringify(graph([{ id: 'a', label: 'A' }], [])));
  const after = graph([{ id: 'a', label: 'A', source_location: 'L2' }], []);
  const originalBefore = JSON.stringify(before);
  const originalAfter = JSON.stringify(after);
  const result = await diffGraphs(before, after);
  assert.deepEqual(await diffGraphs(before, after), result);
  assert.equal(JSON.stringify(before), originalBefore);
  assert.equal(JSON.stringify(after), originalAfter);
  assert.doesNotThrow(() => JSON.stringify(result));
  result.nodes.changed[0].after.label = 'mutated result only';
  assert.equal(after.nodes[0].label, 'A');
});

test('rejects malformed JSON files with an explicit read error', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'graph-diff-'));
  try {
    const malformed = path.join(directory, 'bad.json');
    await writeFile(malformed, '{bad');
    await assert.rejects(diffGraphFiles(malformed, fixture('graph-diff-after.json')), (error) => error.code === 'GRAPH_READ_ERROR');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
