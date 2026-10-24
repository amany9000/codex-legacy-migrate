// Graphify (Graphify-Labs, Apache-2.0/MIT) como CLI externo.
//
// O Reversa não vendoriza o Graphify: ele é um pacote Python (graphifyy no
// PyPI, comando `graphify`) e a skill dele não faz nada sem o CLI. Aqui ficam:
// detecção do CLI, instalação opcional (uv → pipx → pip, sempre com
// confirmação do usuário), cópia da skill renderizada pelo próprio Graphify
// para as pastas de skills das engines e o aviso exibido no install/update.
//
// A skill é renderizada numa pasta temporária e só a pasta da skill é copiada
// para o projeto: `graphify install --platform claude` também escreve no
// CLAUDE.md da raiz e em .claude/settings.json, que o Reversa não toca.
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const GRAPHIFY_SKILL_ID = 'graphify';
export const GRAPHIFY_PACKAGE = 'graphifyy';
export const GRAPHIFY_VERIFIED_VERSION = '0.9.94';
export const GRAPHIFY_HOMEPAGE = 'https://github.com/Graphify-Labs/graphify';
const MIN_PYTHON = [3, 10];

// Pasta de skills do Reversa → plataforma do `graphify install` que renderiza
// a variante certa da skill, e onde ela aparece dentro da pasta temporária.
const SKILL_PLATFORMS = {
  '.claude/skills': { platform: process.platform === 'win32' ? 'windows' : 'claude', rendered: '.claude/skills' },
  '.kiro/skills': { platform: 'kiro', rendered: '.kiro/skills' },
  '.agents/skills': { platform: 'agents', rendered: '.agents/skills' },
};

function probe(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) return null;
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function pythonCandidates() {
  return process.platform === 'win32'
    ? [['py', '-3'], ['python'], ['python3']]
    : [['python3'], ['python']];
}

function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isVerifiedVersion(version) {
  return Boolean(version) && compareVersions(version, GRAPHIFY_VERIFIED_VERSION) >= 0;
}

// Executa o Graphify com o comando detectado (['graphify'] ou ['python3', '-m', 'graphify']).
export function runGraphify(command, args, options = {}) {
  return spawnSync(command[0], [...command.slice(1), ...args], options);
}

// Pastas bin onde uv/pipx colocam o executável, para o caso de ainda não estarem no PATH.
function installerBinDirs() {
  const dirs = [];
  const uvBin = probe('uv', ['tool', 'dir', '--bin']);
  if (uvBin) dirs.push(uvBin.split(/\r?\n/).pop());
  const pipxBin = probe('pipx', ['environment', '--value', 'PIPX_BIN_DIR']);
  if (pipxBin) dirs.push(pipxBin.split(/\r?\n/).pop());
  return dirs;
}

// Procura o CLI: `graphify` no PATH, nas pastas bin do uv/pipx e, por fim,
// `python -m graphify` (instalação via pip --user fora do PATH).
export function detectGraphify() {
  const exe = process.platform === 'win32' ? 'graphify.exe' : 'graphify';
  const candidates = [
    ['graphify'],
    ...installerBinDirs().map(dir => [join(dir, exe)]).filter(([p]) => existsSync(p)),
    ...pythonCandidates().map(py => [...py, '-m', 'graphify']),
  ];
  for (const command of candidates) {
    const out = probe(command[0], [...command.slice(1), '--version']);
    const version = out?.match(/graphify\s+v?(\d+\.\d+\.\d+)/i)?.[1];
    if (version) return { found: true, version, command };
  }
  return { found: false, version: null, command: null };
}

// Primeiro Python disponível, com versão, venv e marcador PEP 668.
function detectPython() {
  const script = [
    'import sys, os, sysconfig, json',
    'marker = os.path.join(sysconfig.get_path("stdlib"), "EXTERNALLY-MANAGED")',
    'venv = sys.prefix != sys.base_prefix',
    'print(json.dumps({"version": list(sys.version_info[:2]), "venv": venv, "managed": os.path.exists(marker) and not venv}))',
  ].join('; ');
  for (const py of pythonCandidates()) {
    const out = probe(py[0], [...py.slice(1), '-c', script]);
    if (!out) continue;
    try {
      return { command: py, ...JSON.parse(out.split(/\r?\n/).pop()) };
    } catch { /* tenta o próximo */ }
  }
  return null;
}

// Escolhe como instalar o CLI: uv, pipx ou pip. Retorna { name, argv } ou
// { name: null, reason } quando nenhum caminho é viável.
export function planGraphifyCliInstall() {
  if (probe('uv', ['--version'])) {
    return { name: 'uv', argv: ['uv', 'tool', 'install', GRAPHIFY_PACKAGE] };
  }
  if (probe('pipx', ['--version'])) {
    return { name: 'pipx', argv: ['pipx', 'install', GRAPHIFY_PACKAGE] };
  }
  const python = detectPython();
  if (!python) return { name: null, reason: 'no-python' };
  const [major, minor] = python.version;
  if (major < MIN_PYTHON[0] || (major === MIN_PYTHON[0] && minor < MIN_PYTHON[1])) {
    return { name: null, reason: 'old-python', python: `${major}.${minor}` };
  }
  if (python.managed) return { name: null, reason: 'externally-managed' };
  const userFlag = python.venv ? [] : ['--user'];
  return { name: 'pip', argv: [...python.command, '-m', 'pip', 'install', ...userFlag, GRAPHIFY_PACKAGE] };
}

// Executa o plano com a saída visível ao usuário e detecta o CLI de novo.
export function installGraphifyCli(plan) {
  const result = spawnSync(plan.argv[0], plan.argv.slice(1), { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    return { ok: false, detection: detectGraphify(), message: result.error?.message ?? `exit code ${result.status}` };
  }
  const detection = detectGraphify();
  return { ok: detection.found, detection, message: detection.found ? null : 'installed, but the graphify command could not be found' };
}

export function describeInstallFailure(reason, python) {
  switch (reason) {
    case 'no-python': return 'No Python 3.10+ interpreter was found.';
    case 'old-python': return `Python ${python} is too old; Graphify needs Python 3.10+.`;
    case 'externally-managed': return 'This Python is externally managed (PEP 668), so pip cannot install into it. Install uv or pipx (e.g. brew install pipx).';
    default: return 'Graphify could not be installed automatically.';
  }
}

export function manualInstallSteps() {
  return [
    `uv tool install ${GRAPHIFY_PACKAGE}`,
    `pipx install ${GRAPHIFY_PACKAGE}`,
    `python3 -m pip install --user ${GRAPHIFY_PACKAGE}`,
  ];
}

// Copia a skill do Graphify para cada pasta de skills das engines.
// replace=true reinstala (update); senão, uma skill graphify já existente é mantida.
export function installGraphifySkills(command, skillsDirs, writer, { replace = false } = {}) {
  const report = { installed: [], kept: [], failed: [] };
  for (const skillsDir of [...new Set(skillsDirs)]) {
    const target = SKILL_PLATFORMS[skillsDir] ?? { platform: 'agents', rendered: '.agents/skills' };
    const dest = join(writer.projectRoot, skillsDir, GRAPHIFY_SKILL_ID);
    if (existsSync(dest) && !replace) {
      report.kept.push(skillsDir);
      continue;
    }
    const tmp = mkdtempSync(join(tmpdir(), 'reversa-graphify-'));
    try {
      const result = runGraphify(command, ['install', '--project', '--platform', target.platform], { cwd: tmp, encoding: 'utf8' });
      const rendered = join(tmp, target.rendered, GRAPHIFY_SKILL_ID);
      if (result.error || result.status !== 0 || !existsSync(join(rendered, 'SKILL.md'))) {
        report.failed.push({ skillsDir, message: result.error?.message ?? (result.stderr || `exit code ${result.status}`).trim() });
        continue;
      }
      if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
      writer.installExternalSkill(rendered, skillsDir, GRAPHIFY_SKILL_ID);
      report.installed.push(skillsDir);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  return report;
}

export function skillsDirsFor(engines) {
  const dirs = [];
  for (const engine of engines) {
    dirs.push(engine.skillsDir);
    if (engine.universalSkillsDir) dirs.push(engine.universalSkillsDir);
  }
  return [...new Set(dirs)];
}

// Linhas do aviso exibido ao final do install e do update.
export function renderGraphifyNotice(chalk, { graph, hasSlashEngine = true } = {}) {
  if (!graph?.enabled) {
    if (!graph?.requested) return [];
    return [
      chalk.bold('  Knowledge graph: Graphify (not installed)'),
      '  Graphify was requested but is not available, so the agents will read files as usual.',
      '  Install it with one of:',
      ...manualInstallSteps().map(step => chalk.gray(`    ${step}`)),
      chalk.cyan('  → Then run npx reversa update to enable the graph integration.'),
      `  ${GRAPHIFY_HOMEPAGE}`,
    ];
  }
  const cmd = hasSlashEngine ? '/reversa-graph' : 'reversa-graph';
  const lines = [
    chalk.bold('  Knowledge graph: Graphify'),
    `  Reversa uses ${chalk.bold('Graphify')} v${graph.cli_version} (Graphify-Labs, Apache-2.0 / MIT) as an external CLI;`,
    '  it is not bundled. The agents query its code graph instead of re-reading every file.',
    `  ${GRAPHIFY_HOMEPAGE}`,
    chalk.cyan(`  → Build the graph with ${cmd} build in the chat, or node .reversa/tools/graph/bin/reversa-graph.js build`),
    chalk.gray('    Output goes to graphify-out/; add it to .gitignore unless you want to commit the graph.'),
  ];
  if (!isVerifiedVersion(graph.cli_version)) {
    lines.push(chalk.yellow(`    Graphify ${graph.cli_version} is older than the verified ${GRAPHIFY_VERIFIED_VERSION}; upgrade if commands fail.`));
  }
  return lines;
}
