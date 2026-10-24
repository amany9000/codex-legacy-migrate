// Third-party components shipped with Reversa.
//
// Hoje: Impeccable (Paul Bakaus, Apache License 2.0), vendorizado em
// agents/impeccable/ by scripts/sync-impeccable.mjs, which also records the
// provenance in agents/impeccable/reversa-bundle.json. Install and update read
// that file to tell the user that Impeccable ships along, with which version
// and under which license, crediting the tool.
import { existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readJsonSafe } from '../utils/json-safe.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = resolve(__dirname, '..', '..', 'agents');

export const IMPECCABLE_AGENT_ID = 'impeccable';

export function getImpeccableBundle() {
  const file = join(AGENTS_DIR, IMPECCABLE_AGENT_ID, 'reversa-bundle.json');
  if (!existsSync(file)) return null;
  try {
    return readJsonSafe(file);
  } catch {
    return null;
  }
}

// Linhas do aviso exibido ao final do install e do update.
// hasSlashEngine: true when some installed engine accepts /name commands.
export function renderImpeccableNotice(chalk, { hasSlashEngine = true } = {}) {
  const bundle = getImpeccableBundle();
  if (!bundle) return [];
  const cmd = hasSlashEngine ? '/impeccable' : 'impeccable';
  return [
    chalk.bold('  Front-end Team: Impeccable'),
    `  Reversa ships ${chalk.bold(bundle.displayName)} v${bundle.version} by ${bundle.author} as its Front-end Team,`,
    `  under the ${chalk.bold('Apache License 2.0')} (LICENSE and NOTICE.md travel inside the ${IMPECCABLE_AGENT_ID} skill folder).`,
    `  ${bundle.homepage}  ·  ${bundle.repository}`,
    chalk.cyan(`  → For frontend design (critique, audit, polish, animate...), run ${cmd} init once, then ${cmd} <command> <target>`),
    chalk.gray('    The first run downloads the Impeccable engine binary into ~/.impeccable/bin (needs network).'),
  ];
}
