import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'bin', 'reversa.js');

test('reversa supports --dashboard with a dry-run banner', () => {
  const output = execFileSync(process.execPath, [cliPath, '--dashboard', '--dry-run'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  assert.match(output, /dashboard/i);
  assert.match(output, /4400/i);
});

test('reversa supports --security-scan with a dry-run summary', () => {
  const output = execFileSync(process.execPath, [cliPath, '--security-scan', '--dry-run'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  assert.match(output, /security/i);
  assert.match(output, /graphify/i);
});
