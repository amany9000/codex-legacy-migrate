#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { clearTerminalForLogo, renderReversaLogo } from '../lib/utils/banner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const [,, command, ...args] = process.argv;

const commands = {
  install:            () => import('../lib/commands/install.js'),
  update:             () => import('../lib/commands/update.js'),
  status:             () => import('../lib/commands/status.js'),
  uninstall:          () => import('../lib/commands/uninstall.js'),
  'add-engine':       () => import('../lib/commands/add-engine.js'),
  'export-diagrams':  () => import('../lib/commands/export-diagrams.js'),
};

if (!command || command === '--help' || command === '-h') {
  clearTerminalForLogo();
  console.log(renderReversaLogo(chalk) + `

  reversa v${pkg.version}

  Usage: npx graph-propagate <command>

  Commands:
    install            Installs Reversa in the current project (all agents)
    update             Updates everything to the latest version (all agents)
    status             Shows the current analysis state
    uninstall          Removes Reversa from the project
    add-engine         Adds support for an engine
    export-diagrams    Exports Mermaid diagrams as SVG/PNG images
                       Options: --format=svg|png  --output=<folder>
                       Requires: npm install -g @mermaid-js/mermaid-cli
    security-scan      Run a full-repository Codex Security audit
                       Options: --target=<path> --phase=pre|post --max-cost-usd=<amount>
    dashboard          Open the local read-only security dashboard (127.0.0.1:4400)

  Main chat flows (after install):
    /reversa          Discovers and documents an existing system
    /reversa-new      Creates a PRD and specs for a new project
    /reversa-forward  Implements or evolves code from the specs
    /reversa-migrate  Plans the migration of a legacy system
    /reversa-docs     Generates the visual documentation mini-site

  Documentation: https://github.com/sandeco/reversa
  `);
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log(pkg.version);
  process.exit(0);
}

if (command === 'security-scan' || command === '--security-scan') {
  const { runCli } = await import('../src/security/cli-audit.js');
  process.exitCode = await runCli(args);
} else if (command === 'dashboard' || command === '--dashboard') {
  const targetIndex = args.indexOf('--target');
  const targetEquals = args.find((arg) => arg.startsWith('--target='));
  const target = targetIndex >= 0
    ? args[targetIndex + 1]
    : targetEquals
      ? targetEquals.slice('--target='.length)
      : args.find((arg) => !arg.startsWith('-')) || process.cwd();
  if (args.includes('--dry-run')) {
    console.log(`Reversa dashboard dry run: http://127.0.0.1:4400; target=${target}; read-only migration status`);
  } else {
    const { startDashboardServer } = await import('../src/dashboard/server.js');
    startDashboardServer(target);
  }
} else if (commands[command]) {
  const mod = await commands[command]();
  await mod.default(args);
} else {
  console.error(`\n  Unknown command: "${command}"`);
  console.error('  Run "npx graph-propagate --help" to see the available commands.\n');
  process.exitCode = 1;
}
