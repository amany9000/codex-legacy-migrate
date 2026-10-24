// npx reversa graph <subcomando>: ponte entre os agentes (que só executam
// comandos de shell) e os módulos do Graphify:
//   graphify-runner.js            → build, snapshot
//   src/graphify/graph-context.js → context, summary, deps
//   src/graphify/graph-diff.js    → diff
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { run, snapshot, snapshotDir, graphPathFor, resolveGraphInput, REVERSA_EXCLUDES } from '../../graphify-runner.js';
import { loadGraph, GraphContextError, dependencyRelations } from '../../src/graphify/graph-context.js';
import { diffGraphs } from '../../src/graphify/graph-diff.js';
import { detectGraphify } from '../installer/graphify.js';
import { readJsonSafe } from '../utils/json-safe.js';

const VALUE_FLAGS = new Set(['depth', 'max-nodes', 'max-edges', 'graph', 'out', 'top', 'level']);
const LIST_LIMIT = 50;

const HELP = `
  Usage: npx reversa graph <command> [options]

  Commands:
    build [target]              Build the code graph (offline) and refresh the "latest" snapshot.
                                The first build also freezes a "baseline" snapshot.
    snapshot <name>             Freeze the current graph as .reversa/context/graph/snapshots/<name>.json
    status                      Show Graphify, graph and snapshot status
    context <symbol>            Dependencies, callers and reverse impact of a symbol
                                --depth=N  --max-nodes=N  --max-edges=N  --json  --graph=<path>
    summary                     Counts, communities and hubs of the graph   --top=N  --json  --graph=<path>
    deps                        deps.json for reversa-arquitetura-3d        --level=file|symbol  --out=<path>
    diff [baseline] [after]     Structural diff of two snapshots (default: baseline latest)
                                Accepts snapshot names, "current" or file paths.   --json  --out=<path>

  Exit codes for context: 3 = ambiguous symbol (candidates listed), 4 = no matching symbol.
`;

function parseArgs(args) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split(/=(.*)/s, 2);
    if (inline !== undefined) flags[key] = inline;
    else if (VALUE_FLAGS.has(key) && args[i + 1] !== undefined) flags[key] = args[++i];
    else flags[key] = true;
  }
  return { positional, flags };
}

function intFlag(flags, name) {
  if (flags[name] === undefined) return undefined;
  const value = Number(flags[name]);
  if (!Number.isInteger(value) || value < 0) throw new Error(`--${name} must be a non-negative integer.`);
  return value;
}

function readState(projectRoot) {
  const statePath = join(projectRoot, '.reversa', 'state.json');
  if (!existsSync(statePath)) return null;
  try {
    return readJsonSafe(statePath);
  } catch {
    return null;
  }
}

function readGraphState(projectRoot) {
  return readState(projectRoot)?.graph ?? null;
}

// Pastas do Reversa ficam fora do grafo, inclusive output_folder/forward_folder customizados
function excludesFor(state) {
  const custom = [state?.output_folder, state?.forward_folder]
    .filter(folder => typeof folder === 'string' && folder && !folder.startsWith('_reversa_'))
    .map(folder => `${folder.replace(/\\/g, '/').replace(/\/+$/, '')}/`);
  return [...REVERSA_EXCLUDES, ...custom];
}

function graphPathFrom(projectRoot, flags) {
  const graphPath = flags.graph ? resolve(projectRoot, flags.graph) : graphPathFor(projectRoot);
  if (!existsSync(graphPath)) {
    throw new Error(`No graph at ${graphPath}. Build it first with: reversa-graph build.`);
  }
  return graphPath;
}

function writeOutput(projectRoot, flags, text) {
  if (typeof flags.out === 'string') {
    const outPath = resolve(projectRoot, flags.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
    console.log(`Wrote ${outPath}`);
  } else {
    console.log(text);
  }
}

const nodeName = (node) => node ? `${node.label ?? node.id} (\`${node.id}\`)` : '(unknown node)';
const location = (record) => record?.source_file
  ? `${record.source_file}${record.source_location ? `:${record.source_location}` : ''}`
  : 'no location';
const confidence = (edge) => edge.confidence ?? (edge.confidence_score !== undefined ? `score ${edge.confidence_score}` : 'no confidence');

function bullets(items, render) {
  if (items.length === 0) return ['- none'];
  const lines = items.slice(0, LIST_LIMIT).map(render);
  if (items.length > LIST_LIMIT) lines.push(`- … ${items.length - LIST_LIMIT} more`);
  return lines;
}

// ── build / snapshot / status ────────────────────────────────────────────────

function cmdBuild(projectRoot, positional, flags) {
  const target = resolve(projectRoot, positional[0] ?? '.');
  const state = readState(target);
  const result = run(target, {
    command: state?.graph?.command ?? undefined,
    quiet: Boolean(flags.json),
    excludes: excludesFor(state),
  });
  const latest = snapshot(target, 'latest');
  const baselineExists = existsSync(join(snapshotDir(target), 'baseline.json'));
  const baseline = baselineExists ? null : snapshot(target, 'baseline');
  if (flags.json) {
    console.log(JSON.stringify({ ...result, snapshots: { latest, baseline } }, null, 2));
    return;
  }
  console.log(`Graph: ${result.graphPath} (graphify ${latest.graphify_version}, ${latest.node_count} nodes, ${latest.edge_count} edges)`);
  console.log(`Snapshot "latest" → ${latest.path}`);
  if (baseline) console.log(`Snapshot "baseline" → ${baseline.path} (first build)`);
}

function cmdSnapshot(projectRoot, positional) {
  if (!positional[0]) throw new Error('Usage: npx reversa graph snapshot <name>');
  const meta = snapshot(projectRoot, positional[0]);
  console.log(`Snapshot "${meta.name}" → ${meta.path} (${meta.node_count} nodes, ${meta.edge_count} edges${meta.git_head ? `, git ${meta.git_head.slice(0, 8)}` : ''})`);
}

function cmdStatus(projectRoot, flags) {
  const state = readGraphState(projectRoot);
  const detection = detectGraphify();
  const graphPath = graphPathFor(projectRoot);
  const dir = snapshotDir(projectRoot);
  const snapshots = existsSync(dir)
    ? readdirSync(dir).filter(f => f.endsWith('.json') && !f.endsWith('.meta.json')).map(f => f.replace(/\.json$/, ''))
    : [];
  const status = {
    enabled: state?.enabled ?? false,
    cli: detection.found ? { version: detection.version, command: detection.command.join(' ') } : null,
    graph: existsSync(graphPath) ? graphPath : null,
    snapshots,
  };
  if (flags.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  console.log(`Integration enabled: ${status.enabled ? 'yes' : 'no'}`);
  console.log(`Graphify CLI:        ${status.cli ? `${status.cli.version} (${status.cli.command})` : 'not found'}`);
  console.log(`Graph:               ${status.graph ?? 'not built'}`);
  console.log(`Snapshots:           ${snapshots.length ? snapshots.join(', ') : 'none'}`);
}

// ── context ──────────────────────────────────────────────────────────────────

function renderContext(ctx) {
  const lines = [
    `## Graph context: ${nodeName(ctx.target)}`,
    '',
    `- Location: ${location(ctx.target)}`,
    `- Graph: graphify ${ctx.graph.graphify_version ?? '?'}, ${ctx.graph.node_count} nodes, ${ctx.graph.edge_count} edges`,
    '',
    `### Depends on (${ctx.dependencies.length})`,
    ...bullets(ctx.dependencies, ({ node, edge }) => `- ${edge.relation} → ${nodeName(node)} at ${location(edge)} [${confidence(edge)}]`),
    '',
    `### Callers (${ctx.callers.length})`,
    ...bullets(ctx.callers, ({ node, edge }) => `- ${nodeName(node)} at ${location(edge)} [${confidence(edge)}]`),
    '',
    `### Other direct dependents (${ctx.direct_dependents.length - ctx.callers.length})`,
    ...bullets(ctx.direct_dependents.filter(({ edge }) => edge.relation !== 'calls'),
      ({ node, edge }) => `- ${nodeName(node)} ${edge.relation} at ${location(edge)}`),
    '',
    `### Reverse impact (depth ≤ ${ctx.impact.maxDepth}${ctx.impact.truncated ? ', truncated' : ''})`,
    `Direct (${ctx.impact.direct.length}):`,
    ...bullets(ctx.impact.direct, ({ node, edge }) => `- ${nodeName(node)} via ${edge.relation} — ${location(node)}`),
    `Transitive (${ctx.impact.transitive.length}):`,
    ...bullets(ctx.impact.transitive, ({ node, edge, depth }) => `- [d${depth}] ${nodeName(node)} via ${edge.relation} — ${location(node)}`),
  ];
  if (ctx.warnings.length) {
    lines.push('', '### Warnings', ...ctx.warnings.map(w => `- ${w}`));
  }
  return lines.join('\n');
}

async function cmdContext(projectRoot, positional, flags) {
  const symbol = positional.join(' ');
  if (!symbol) throw new Error('Usage: npx reversa graph context <symbol>');
  const graph = await loadGraph(graphPathFrom(projectRoot, flags));
  const options = {
    maxDepth: intFlag(flags, 'depth'),
    maxNodes: intFlag(flags, 'max-nodes'),
    maxEdges: intFlag(flags, 'max-edges'),
  };
  try {
    const ctx = graph.getMigrationContext(symbol, options);
    console.log(flags.json ? JSON.stringify(ctx, null, 2) : renderContext(ctx));
  } catch (error) {
    if (!(error instanceof GraphContextError)) throw error;
    console.error(error.message);
    for (const candidate of error.details?.candidates ?? []) {
      console.error(`  - ${nodeName(candidate)} — ${location(candidate)}`);
    }
    process.exitCode = error.code === 'AMBIGUOUS_TARGET' ? 3 : error.code === 'NODE_NOT_FOUND' ? 4 : 1;
  }
}

// ── summary ──────────────────────────────────────────────────────────────────

function buildSummary(graph, top) {
  const communities = new Map();
  const files = new Set();
  for (const node of graph.nodes) {
    if (node?.source_file) files.add(node.source_file);
    if (node?.community === undefined || node?.community === null) continue;
    if (!communities.has(node.community)) {
      communities.set(node.community, { id: node.community, name: node.community_name ?? null, nodes: 0, files: new Set() });
    }
    const entry = communities.get(node.community);
    entry.nodes += 1;
    if (node.source_file) entry.files.add(node.source_file);
  }

  const incoming = new Map();
  const outgoing = new Map();
  const relations = {};
  for (const edge of graph.validEdges) {
    relations[edge.relation] = (relations[edge.relation] ?? 0) + 1;
    if (!dependencyRelations.has(edge.relation)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
  }
  const hubs = [...incoming.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, top)
    .map(([id, dependents]) => {
      const node = graph.nodeFor(id);
      return { id, label: node?.label ?? null, source_file: node?.source_file ?? null, source_location: node?.source_location ?? null, dependents, dependencies: outgoing.get(id) ?? 0 };
    });

  return {
    graph: {
      path: graph.graphPath,
      graphify_version: graph.graph.graph?.graphify_version ?? null,
      schema_version: graph.graph.graph?.schema_version ?? null,
      node_count: graph.nodes.length,
      edge_count: graph.edges.length,
      file_count: files.size,
    },
    relations,
    communities: [...communities.values()]
      .sort((a, b) => b.nodes - a.nodes)
      .map(c => ({ id: c.id, name: c.name, nodes: c.nodes, file_count: c.files.size, files: [...c.files].sort().slice(0, 10) })),
    hubs,
    warnings: graph.warnings,
  };
}

function renderSummary(summary) {
  const g = summary.graph;
  const lines = [
    '## Graph summary',
    '',
    `- Graph: ${g.path} (graphify ${g.graphify_version ?? '?'}, schema ${g.schema_version ?? '?'})`,
    `- ${g.node_count} nodes, ${g.edge_count} edges, ${g.file_count} source files`,
    `- Relations: ${Object.entries(summary.relations).map(([r, n]) => `${r} ${n}`).join(', ') || 'none'}`,
    '',
    `### Communities (${summary.communities.length})`,
    ...bullets(summary.communities, c => `- ${c.name ?? `Community ${c.id}`}: ${c.nodes} nodes in ${c.file_count} file(s) — ${c.files.join(', ')}`),
    '',
    '### Hubs (most dependents)',
    ...bullets(summary.hubs, h => `- ${h.label ?? h.id} (\`${h.id}\`): ${h.dependents} dependents, ${h.dependencies} dependencies — ${location(h)}`),
  ];
  if (summary.warnings.length) lines.push('', '### Warnings', ...summary.warnings.map(w => `- ${w}`));
  return lines.join('\n');
}

async function cmdSummary(projectRoot, flags) {
  const graph = await loadGraph(graphPathFrom(projectRoot, flags));
  const summary = buildSummary(graph, intFlag(flags, 'top') ?? 10);
  console.log(flags.json ? JSON.stringify(summary, null, 2) : renderSummary(summary));
}

// ── deps (entrada do reversa-arquitetura-3d) ─────────────────────────────────

function buildDeps(graph, level) {
  const edges = new Map();
  const nodes = new Map();
  for (const edge of graph.validEdges) {
    if (!dependencyRelations.has(edge.relation)) continue;
    const source = graph.nodeFor(edge.source);
    const target = graph.nodeFor(edge.target);
    let from = edge.source;
    let to = edge.target;
    if (level === 'file') {
      // Arestas para módulos externos (sem source_file) e dentro do mesmo arquivo ficam de fora
      if (!source?.source_file || !target?.source_file || source.source_file === target.source_file) continue;
      from = source.source_file;
      to = target.source_file;
    } else {
      nodes.set(edge.source, { id: edge.source, label: source?.label ?? null, file: source?.source_file ?? null });
      nodes.set(edge.target, { id: edge.target, label: target?.label ?? null, file: target?.source_file ?? null });
    }
    if (level === 'file') {
      nodes.set(from, { id: from });
      nodes.set(to, { id: to });
    }
    const key = `${from}\u0000${to}`;
    if (!edges.has(key)) edges.set(key, { from, to, weight: 0, relations: new Set() });
    const entry = edges.get(key);
    entry.weight += 1;
    entry.relations.add(edge.relation);
  }
  return {
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()]
      .map(e => ({ from: e.from, to: e.to, weight: e.weight, relations: [...e.relations].sort() }))
      .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
  };
}

async function cmdDeps(projectRoot, flags) {
  const level = flags.level ?? 'file';
  if (!['file', 'symbol'].includes(level)) throw new Error('--level must be file or symbol.');
  const graph = await loadGraph(graphPathFrom(projectRoot, flags));
  writeOutput(projectRoot, flags, JSON.stringify(buildDeps(graph, level), null, 2));
}

// ── diff ─────────────────────────────────────────────────────────────────────

function renderDiff(diff, names, baseline, after) {
  const label = (id) => {
    const node = after.nodeFor(id) ?? baseline.nodeFor(id);
    return node ? `${node.label ?? id} (\`${id}\`)` : `\`${id}\``;
  };
  const s = diff.summary;
  const edgeLine = ({ identity, edge }) => `- ${label(identity.source)} -${identity.relation}→ ${label(identity.target)} at ${location(edge)}`;
  const lines = [
    `## Graph diff: ${names[0]} → ${names[1]}`,
    '',
    `- Baseline: ${diff.baseline.path} (graphify ${diff.baseline.graphify_version ?? '?'}, ${diff.baseline.node_count} nodes, ${diff.baseline.edge_count} edges)`,
    `- After: ${diff.after.path} (graphify ${diff.after.graphify_version ?? '?'}, ${diff.after.node_count} nodes, ${diff.after.edge_count} edges)`,
    `- Complete: ${s.complete ? 'yes' : 'no, see warnings'}`,
    '',
    '| | Added | Removed | Changed |',
    '|---|---|---|---|',
    `| Nodes | ${s.nodes_added} | ${s.nodes_removed} | ${s.nodes_changed} |`,
    `| Edges | ${s.edges_added} | ${s.edges_removed} | ${s.edges_changed} |`,
    '',
    `Ambiguous node matches: ${s.ambiguous_node_matches}`,
    '',
    `### Nodes added (${diff.nodes.added.length})`,
    ...bullets(diff.nodes.added, ({ node }) => `- ${nodeName(node)} — ${location(node)}`),
    '',
    `### Nodes removed (${diff.nodes.removed.length})`,
    ...bullets(diff.nodes.removed, ({ node }) => `- ${nodeName(node)} — ${location(node)}`),
    '',
    `### Nodes changed (${diff.nodes.changed.length})`,
    ...bullets(diff.nodes.changed, (c) => `- ${nodeName(c.after)}: ${c.metadata_changes.map(m => m.field).join(', ') || 'identity only'}${c.identity_changed ? ` (id ${c.identity_changed.before} → ${c.identity_changed.after})` : ''}`),
    '',
    `### Edges added (${diff.edges.added.length})`,
    ...bullets(diff.edges.added, edgeLine),
    '',
    `### Edges removed (${diff.edges.removed.length})`,
    ...bullets(diff.edges.removed, edgeLine),
    '',
    `### Edges changed (${diff.edges.changed.length})`,
    ...bullets(diff.edges.changed, (c) => `- ${label(c.identity.source)} -${c.identity.relation}→ ${label(c.identity.target)}: ${c.metadata_changes.map(m => m.field).join(', ')}`),
  ];
  if (diff.warnings.length) {
    lines.push('', '### Warnings', ...bullets(diff.warnings, w => `- [${w.side}] ${w.code}: ${w.message}`));
  }
  lines.push('', '### Limitations', ...diff.limitations.map(l => `- ${l}`));
  return lines.join('\n');
}

async function cmdDiff(projectRoot, positional, flags) {
  const names = [positional[0] ?? 'baseline', positional[1] ?? 'latest'];
  const [baseline, after] = await Promise.all(names.map(name => loadGraph(resolveGraphInput(projectRoot, name))));
  const diff = await diffGraphs(baseline, after);
  writeOutput(projectRoot, flags, flags.json ? JSON.stringify(diff, null, 2) : renderDiff(diff, names, baseline, after));
}

export default async function graph(args) {
  const [sub, ...rest] = args;
  const { positional, flags } = parseArgs(rest);
  const projectRoot = resolve(process.cwd());

  try {
    switch (sub) {
      case 'build': return cmdBuild(projectRoot, positional, flags);
      case 'snapshot': return cmdSnapshot(projectRoot, positional);
      case 'status': return cmdStatus(projectRoot, flags);
      case 'context': return await cmdContext(projectRoot, positional, flags);
      case 'summary': return await cmdSummary(projectRoot, flags);
      case 'deps': return await cmdDeps(projectRoot, flags);
      case 'diff': return await cmdDiff(projectRoot, positional, flags);
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        console.log(HELP);
        return;
      default:
        console.error(`\n  Unknown graph command: "${sub}"`);
        console.log(HELP);
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(`reversa graph ${sub}: ${error.message}`);
    process.exitCode = 1;
  }
}
