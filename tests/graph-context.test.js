import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GraphContext, GraphContextError, loadGraph } from '../src/graphify/graph-context.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, 'fixtures/graphify-small.json');

test('loads the verified fixture and resolves by id or label', async () => {
  const context = await loadGraph(fixturePath);
  assert.equal(context.findNode('lookup').id, 'lookup');
  assert.throws(() => context.findNode('findById()'), (error) => error.code === 'AMBIGUOUS_TARGET' && error.details.candidates.length === 2);
  assert.throws(() => context.findNode('not-present'), (error) => error.code === 'NODE_NOT_FOUND');
  assert.ok(context.warnings.some((warning) => warning.includes('ghost')));
});

test('preserves caller-to-callee direction and source evidence', async () => {
  const context = await loadGraph(fixturePath);
  const outgoing = context.getDependencies('createOrder()');
  assert.deepEqual(outgoing.map(({ edge }) => edge.relation), ['calls']);
  assert.equal(outgoing[0].node.id, 'lookup');
  assert.equal(outgoing[0].edge.source_location, 'L7');
  assert.equal(outgoing[0].edge.confidence, 'EXTRACTED');
  const incomingCalls = context.getDependents('lookup').filter(({ edge }) => edge.relation === 'calls');
  assert.deepEqual(incomingCalls.map(({ node }) => node.id).sort(), ['create', 'describe']);
  assert.deepEqual(context.getDependencies('lookup'), []);
});

test('separates direct callers from bounded transitive test impact', async () => {
  const context = await loadGraph(fixturePath);
  const impact = context.getImpact('lookup', { maxDepth: 3 });
  assert.deepEqual(impact.direct.map(({ node }) => node.id).sort(), ['create', 'describe', 'order-file', 'report-file']);
  assert.ok(impact.transitive.some(({ node }) => node.id === 'test-helper'));
  assert.ok(impact.transitive.some(({ node }) => node.id === 'order-test'));
  assert.ok(impact.transitive.some(({ node }) => node.id === 'report-test'));
  const limited = context.getImpact('lookup', { maxDepth: 1 });
  assert.equal(limited.transitive.length, 0);
});

test('terminates on cycles and respects depth and node limits', () => {
  const context = new GraphContext({
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    links: [
      { source: 'b', target: 'a', relation: 'calls' },
      { source: 'a', target: 'b', relation: 'calls' },
      { source: 'c', target: 'b', relation: 'calls' }
    ]
  });
  const bounded = context.getImpact('a', { maxDepth: 8 });
  assert.deepEqual(bounded.nodes.map(({ node }) => node.id), ['b', 'c']);
  assert.equal(context.getImpact('a', { maxDepth: 1 }).nodes.length, 1);
  assert.equal(context.getImpact('a', { maxNodes: 1 }).truncated, true);
});

test('reports malformed graph JSON and tolerates missing optional metadata', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'graph-context-'));
  try {
    const malformed = path.join(directory, 'malformed.json');
    await writeFile(malformed, '{broken');
    await assert.rejects(loadGraph(malformed), (error) => error.code === 'GRAPH_READ_ERROR');

    const optional = path.join(directory, 'optional.json');
    await writeFile(optional, JSON.stringify({ nodes: [{ id: 'bare' }], links: [{ source: 'bare', target: 'bare', relation: 'calls' }] }));
    const context = await loadGraph(optional);
    const packageContext = context.getMigrationContext('bare');
    assert.equal(packageContext.target.source_file, undefined);
    assert.ok(packageContext.warnings.some((warning) => warning.includes('source location metadata')));
    assert.ok(packageContext.warnings.some((warning) => warning.includes('Graphify version metadata')));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('accepts raw edges, skips unresolved endpoints, and reports invalid graph shape', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'graph-context-'));
  try {
    const raw = path.join(directory, 'raw.json');
    await writeFile(raw, JSON.stringify({ nodes: [{ id: 'one' }], edges: [{ source: 'missing', target: 'one', relation: 'calls' }] }));
    const context = await loadGraph(raw);
    assert.equal(context.getDependents('one').length, 0);
    assert.ok(context.warnings.some((warning) => warning.includes('unresolved or ambiguous endpoint')));

    const invalid = path.join(directory, 'invalid.json');
    await writeFile(invalid, JSON.stringify({ nodes: [] }));
    await assert.rejects(loadGraph(invalid), (error) => error.code === 'INVALID_GRAPH');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('assembles a bounded migration context with references and metadata', async () => {
  const context = await loadGraph(fixturePath);
  const result = context.getMigrationContext('lookup', { maxDepth: 3, maxNodes: 5, maxEdges: 3 });
  assert.equal(result.target.source_file, 'legacy-utils.js');
  assert.equal(result.graph.edge_key, 'links');
  assert.equal(result.impact.truncated, true);
  assert.ok(result.evidence.source_references.includes('legacy-utils.js'));
  assert.ok(result.evidence.source_references.includes('order-service.js'));
  assert.ok(result.evidence.caller_edges[0].confidence_score === 1);
  assert.deepEqual(result.callers.map(({ node }) => node.id).sort(), ['create', 'describe']);
  assert.ok(result.direct_dependents.some(({ edge }) => edge.relation === 'imports'));
  assert.ok(result.warnings.some((warning) => warning.includes('limited to 3 entries')));
});
