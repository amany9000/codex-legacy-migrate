#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectGraphify, isVerifiedVersion, manualInstallSteps, runGraphify, GRAPHIFY_VERIFIED_VERSION } from './lib/installer/graphify.js';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_NAME = /^[A-Za-z0-9._-]+$/;

// Reversa's own files in the target (skills, toolkit, specs) are not legacy code; keep them out of the graph.
export const REVERSA_EXCLUDES = ['.reversa/', '_reversa_*/', '.claude/skills/', '.agents/skills/', '.kiro/skills/'];

export function buildCommands(target, { excludes = [] } = {}) {
  return [
    ['extract', target, '--code-only', '--no-cluster', ...excludes.flatMap((pattern) => ['--exclude', pattern])],
    ['cluster-only', target, '--no-label']
  ];
}

export function graphPathFor(target) {
  return path.join(path.resolve(target), 'graphify-out', 'graph.json');
}

export function snapshotDir(target) {
  return path.join(path.resolve(target), '.reversa', 'context', 'graph', 'snapshots');
}

// command: the Graphify invocation to use (['graphify'] or ['python3', '-m', 'graphify']); detected when omitted.
// excludes: gitignore-style patterns anchored at the target, passed to extract as --exclude.
export function run(target = process.cwd(), { command, quiet = false, excludes = REVERSA_EXCLUDES } = {}) {
  const absoluteTarget = path.resolve(target);
  if (!existsSync(absoluteTarget)) {
    throw new Error(`Target repository does not exist: ${absoluteTarget}`);
  }
  if (!statSync(absoluteTarget).isDirectory() || readdirSync(absoluteTarget).length === 0) {
    throw new Error(`Target is not a non-empty directory: ${absoluteTarget}`);
  }
  if (realpathSync(absoluteTarget) === realpathSync(projectRoot)) {
    throw new Error('Refusing to analyze the product repository; pass a separate target repository.');
  }

  const graphify = command ? { found: true, command, version: null } : detectGraphify();
  if (!graphify.found) {
    throw new Error(`Graphify CLI not found. Run npx reversa install again to set it up, or install it by hand: ${manualInstallSteps().join(' | ')}`);
  }
  if (graphify.version && !isVerifiedVersion(graphify.version)) {
    process.stderr.write(`Graphify ${graphify.version} is older than the verified ${GRAPHIFY_VERIFIED_VERSION}; results may differ.\n`);
  }

  // GRAPHIFY_BACKEND=none keeps the run offline: no LLM backend is picked up from the environment.
  // GRAPHIFY_FORCE=1 makes extract do a full re-scan: incremental re-extraction (0.9.95) can mint
  // absolute-path node ids, which breaks id matching between snapshots in graph-diff.
  const env = { ...process.env, GRAPHIFY_BACKEND: 'none', GRAPHIFY_FORCE: '1' };
  for (const args of buildCommands(absoluteTarget, { excludes })) {
    const result = runGraphify(graphify.command, args, { cwd: projectRoot, encoding: 'utf8', env });
    if (!quiet && result.stdout) process.stdout.write(result.stdout);
    if (!quiet && result.stderr) process.stderr.write(result.stderr);
    if (result.error) {
      throw new Error(`Could not run Graphify: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(`Graphify ${args[0]} failed with exit code ${result.status}`);
    }
  }

  const outputDir = path.join(absoluteTarget, 'graphify-out');
  for (const artifact of ['graph.json', 'GRAPH_REPORT.md', 'graph.html']) {
    if (!existsSync(path.join(outputDir, artifact))) {
      throw new Error(`Graphify completed but expected artifact is missing: ${path.join(outputDir, artifact)}`);
    }
  }
  if (!quiet) process.stdout.write(`Verified Graphify artifacts in ${outputDir}\n`);
  const graphPath = path.join(outputDir, 'graph.json');
  const version = graphify.version ?? JSON.parse(readFileSync(graphPath, 'utf8')).graph?.graphify_version ?? null;
  return { target: absoluteTarget, outputDir, graphPath, version, command: graphify.command };
}

// Freezes the current native graph.json under .reversa/context/graph/snapshots/<name>.json for graph-diff.
export function snapshot(target = process.cwd(), name = 'latest') {
  if (typeof name !== 'string' || !SNAPSHOT_NAME.test(name)) {
    throw new Error(`Invalid snapshot name "${name}"; use letters, digits, dot, dash or underscore.`);
  }
  const absoluteTarget = path.resolve(target);
  const source = graphPathFor(absoluteTarget);
  if (!existsSync(source)) {
    throw new Error(`No graph to snapshot at ${source}; build the graph first.`);
  }
  const dir = snapshotDir(absoluteTarget);
  mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${name}.json`);
  copyFileSync(source, dest);

  const graph = JSON.parse(readFileSync(dest, 'utf8'));
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: absoluteTarget, encoding: 'utf8' });
  const meta = {
    name,
    graph_path: path.relative(absoluteTarget, dest),
    graphify_version: graph.graph?.graphify_version ?? null,
    node_count: Array.isArray(graph.nodes) ? graph.nodes.length : null,
    edge_count: Array.isArray(graph.links) ? graph.links.length : Array.isArray(graph.edges) ? graph.edges.length : null,
    git_head: head.status === 0 ? head.stdout.trim() : null,
    created_at: new Date().toISOString()
  };
  writeFileSync(path.join(dir, `${name}.meta.json`), `${JSON.stringify(meta, null, 2)}\n`);
  return { ...meta, path: dest };
}

// Accepts a snapshot name, "current" (graphify-out/graph.json) or a path to a graph JSON file.
export function resolveGraphInput(target, nameOrPath) {
  if (nameOrPath === 'current') return graphPathFor(target);
  if (SNAPSHOT_NAME.test(nameOrPath)) {
    const candidate = path.join(snapshotDir(target), `${nameOrPath}.json`);
    if (existsSync(candidate)) return candidate;
  }
  const asPath = path.resolve(target, nameOrPath);
  if (existsSync(asPath)) return asPath;
  throw new Error(`No snapshot or graph file named "${nameOrPath}" (looked in ${snapshotDir(target)}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run(process.argv[2] ?? process.cwd());
  } catch (error) {
    console.error(`Graphify runner: ${error.message}`);
    process.exitCode = 1;
  }
}
