import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommands, run } from '../graphify-runner.js';

test('builds explicit-target extraction and report generation commands', () => {
  const target = path.resolve('/tmp/legacy-target');
  assert.deepEqual(buildCommands(target), [
    ['extract', target, '--code-only', '--no-cluster'],
    ['cluster-only', target, '--no-label']
  ]);
  assert.ok(buildCommands(target).every((args) => args[1] === target));
});

test('rejects a missing target and the product repository', () => {
  assert.throws(() => run('/tmp/graphify-target-that-does-not-exist'), /does not exist/);
  const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  assert.throws(() => run(productRoot), /Refusing to analyze the product repository/);
});
