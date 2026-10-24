import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationSkill = readFileSync(
  new URL('../agents/reversa-migrate/SKILL.md', import.meta.url),
  'utf8',
);
const codingSkill = readFileSync(
  new URL('../agents/reversa-coding/SKILL.md', import.meta.url),
  'utf8',
);

test('Reversa migration planning uses Graphify before implementation and preserves a baseline', () => {
  const workflow = migrationSkill.match(
    /### Evidência de dependências com Migration MCP \(Codex\)([\s\S]*?)### Passo 2:/,
  )?.[1];

  assert.ok(workflow, 'Migration MCP workflow section is present');
  for (const tool of ['analyze_legacy_repo', 'get_migration_context', 'compare_migration_graphs']) {
    assert.ok(workflow.includes(`\`${tool}\``), `workflow documents ${tool}`);
  }
  assert.ok(workflow.indexOf('`analyze_legacy_repo`') < workflow.indexOf('`get_migration_context`'));
  assert.ok(workflow.indexOf('`get_migration_context`') < workflow.indexOf('`compare_migration_graphs`'));
  assert.match(workflow, /não sobrescreva/i);
  assert.match(workflow, /não prova equivalência comportamental/i);
  assert.match(workflow, /não simule a chamada executando Graphify manualmente/i);
});

test('Reversa coding obtains context before edits and compares only after tests', () => {
  const workflow = codingSkill.match(
    /## Evidência Graphify em uma migração([\s\S]*?)## Loop de execução por fase/,
  )?.[1];

  assert.ok(workflow, 'migration-only coding workflow section is present');
  const context = workflow.indexOf('`get_migration_context`');
  const edits = workflow.indexOf('Execute as ações previstas');
  const analyzeAfter = workflow.indexOf('`analyze_legacy_repo`');
  const compare = workflow.indexOf('`compare_migration_graphs`');
  assert.ok(context >= 0 && context < edits, 'context is retrieved before code changes');
  assert.ok(edits < analyzeAfter && analyzeAfter < compare, 'post-change analyze precedes graph comparison');
  assert.match(workflow, /Nunca declare equivalência comportamental/);
  assert.match(workflow, /Não substitua as chamadas MCP por comandos Graphify manuais/);
});
