import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from '../src/graphify/graph-context.js';

const graphPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../legacy-demo-app/graphify-out/graph.json');

test('integration: native legacy graph resolves findById callers and test impact', async () => {
  const context = await loadGraph(graphPath);
  assert.equal(context.graph.links.length, 34);
  const utility = context.findNode('legacy_utils_findbyid');
  assert.equal(utility.label, 'findById()');

  const calls = context.getDependents(utility).filter(({ edge }) => edge.relation === 'calls');
  assert.deepEqual(calls.map(({ node }) => node.id).sort(), ['order_service_createorder', 'report_describeproduct']);
  assert.ok(calls.every(({ edge }) => edge.source_file && edge.source_location && edge.confidence === 'EXTRACTED'));

  const fromCaller = context.getDependencies('order_service_createorder').find(({ edge }) => edge.relation === 'calls');
  assert.equal(fromCaller.node.id, utility.id);
  const impact = context.getImpact(utility, { maxDepth: 3 });
  assert.ok(impact.direct.some(({ node }) => node.id === 'order_service_createorder'));
  assert.ok(impact.direct.some(({ node }) => node.id === 'report_describeproduct'));
  assert.ok(impact.transitive.some(({ node }) => node.id === 'order_service_test_callcreateorder'));
  assert.ok(impact.transitive.some(({ node }) => node.id === 'report_test'));

  const packageContext = context.getMigrationContext('findById()', { maxDepth: 3 });
  assert.equal(packageContext.target.source_file, 'legacy-utils.js');
  assert.ok(packageContext.callers.some(({ node }) => node.id === 'order_service_createorder'));
  assert.ok(packageContext.callers.some(({ node }) => node.id === 'report_describeproduct'));
});
