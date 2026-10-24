import fs from 'node:fs';
import path from 'node:path';

const SEVERITY_RISK = { CRITICAL: 100, HIGH: 80, MEDIUM: 55, LOW: 30, INFO: 10 };
const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const AGENTS = ['paradigm_advisor', 'curator', 'strategist', 'designer', 'screen_translator', 'inspector'];

export function scoreToGrade(score) {
  if (score === null || score === undefined || !Number.isFinite(score)) return '—';
  if (score <= 5) return 'A+';
  if (score <= 15) return 'A';
  if (score <= 28) return 'B';
  if (score <= 45) return 'C';
  if (score <= 68) return 'D';
  return 'F';
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function resolveConfiguredPath(root, value) {
  if (!value || typeof value !== 'string') return null;
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

export function loadProjectGraph(projectRoot) {
  const state = readJson(path.join(projectRoot, '.reversa', 'context', 'graph-index.json')) || {};
  const candidates = [
    resolveConfiguredPath(projectRoot, state.graph_path),
    path.join(projectRoot, '.reversa', 'graphify-out', 'graph.json'),
    path.join(projectRoot, 'graphify-out', 'graph.json')
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    const raw = readJson(candidate);
    if (raw && Array.isArray(raw.nodes) && (Array.isArray(raw.edges) || Array.isArray(raw.links))) {
      return { graph: normalizeGraph(raw, state.god_nodes || []), sourcePath: candidate, status: 'available' };
    }
  }
  return { graph: { nodes: [], edges: [] }, sourcePath: null, status: 'unavailable' };
}

function normalizeGraph(raw, godNodes = []) {
  const godNodeIds = new Set(godNodes.map((node) => String(node.id ?? node.node_id ?? node.label ?? '')));
  const nodes = raw.nodes.map((node, index) => {
    const id = String(node.id ?? node.name ?? `node-${index}`);
    return {
      id,
      label: String(node.label ?? node.name ?? id),
      file: String(node.source_file ?? node.file ?? node.path ?? ''),
      line: node.source_location ?? node.line ?? null,
      community: node.community_name ?? node.community ?? null,
      isGodNode: Boolean(node.isGodNode || node.is_god_node || godNodeIds.has(id)),
      raw: node
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = (raw.edges || raw.links || []).flatMap((edge, index) => {
    const source = typeof edge.source === 'object' ? edge.source?.id : edge.source;
    const target = typeof edge.target === 'object' ? edge.target?.id : edge.target;
    if (!nodeIds.has(String(source)) || !nodeIds.has(String(target))) return [];
    return [{
      id: String(edge.id ?? `edge-${index}`), source: String(source), target: String(target),
      relation: String(edge.relation ?? edge.type ?? 'related'),
      confidence: String(edge.confidence ?? (edge.inferred ? 'INFERRED' : 'EXTRACTED')).toUpperCase()
    }];
  });
  const degree = new Map(nodes.map((node) => [node.id, { inDegree: 0, outDegree: 0, uncertainEdges: 0, totalEdges: 0 }]));
  for (const edge of edges) {
    const source = degree.get(edge.source);
    const target = degree.get(edge.target);
    source.outDegree += 1;
    target.inDegree += 1;
    source.totalEdges += 1;
    target.totalEdges += 1;
    if (['INFERRED', 'AMBIGUOUS'].includes(edge.confidence)) {
      source.uncertainEdges += 1;
      target.uncertainEdges += 1;
    }
  }
  for (const node of nodes) {
    node.metrics = degree.get(node.id);
  }
  return { nodes, edges };
}

function normalizedPath(root, file) {
  const raw = String(file || '').replace(/\\/g, '/');
  if (!raw || raw === 'unknown') return '';
  const absolute = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(root, raw);
  const relative = path.relative(root, absolute).replace(/\\/g, '/');
  if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) return '';
  return relative.toLowerCase();
}

function migrationStatus(root) {
  const migration = readJson(path.join(root, '_reversa_sdd', 'migration', '.state.json'));
  if (migration) {
    const completed = Array.isArray(migration.completedAgents) ? migration.completedAgents : [];
    const pending = Array.isArray(migration.pendingAgents) ? migration.pendingAgents : AGENTS;
    const progress = Math.min(100, Math.round((completed.length / Math.max(1, completed.length + pending.length)) * 100));
    const complete = pending.length === 0 && !migration.currentAgent?.agent;
    return { source: '_reversa_sdd/migration/.state.json', status: complete ? 'complete' : (migration.currentAgent?.status || 'in_progress'), progress, completed, pending, nodeStatuses: migration.nodes || [] };
  }
  const state = readJson(path.join(root, '.reversa', 'state.json'));
  if (!state) return { source: null, status: 'unavailable', progress: 0, completed: [], pending: [], nodeStatuses: [] };
  const completed = Array.isArray(state.completed) ? state.completed : [];
  const pending = Array.isArray(state.pending) ? state.pending : [];
  const progress = Math.min(100, Math.round((completed.length / Math.max(1, completed.length + pending.length)) * 100));
  return { source: '.reversa/state.json', status: pending.length === 0 && completed.length > 0 ? 'complete' : (state.phase || 'not_started'), progress, completed, pending, nodeStatuses: state.nodes || [] };
}

function graphTokenSavings(root) {
  const index = readJson(path.join(root, '.reversa', 'context', 'graph-index.json')) || {};
  const explicit = Number(index.token_savings_percent ?? index.tokenSavingsPercent);
  if (Number.isFinite(explicit) && explicit >= 0 && explicit <= 100) return explicit;
  const reduction = String(index.benchmark?.reduction || '').match(/([\d.]+)\s*x/i);
  if (!reduction) return null;
  const ratio = Number(reduction[1]);
  return ratio >= 1 ? Math.round((1 - 1 / ratio) * 1000) / 10 : null;
}

function loadScan(root, phase) {
  return readJson(path.join(root, '.reversa', 'security', `security-${phase}.json`));
}

function findingMap(findings) {
  const map = new Map();
  for (const finding of findings || []) {
    const key = finding.fingerprint || [finding.file, finding.cwe, String(finding.title).toLowerCase().replace(/\s+/g, ' ')].join('|').toLowerCase();
    const list = map.get(key) || [];
    list.push(finding);
    map.set(key, list);
  }
  return map;
}

function scanTime(scan) {
  const value = Date.parse(scan?.completedAt || scan?.startedAt || '');
  return Number.isFinite(value) ? value : 0;
}

function comparison(pre, post) {
  const preItems = Array.isArray(pre?.findings) ? pre.findings : [];
  const postItems = Array.isArray(post?.findings) ? post.findings : [];
  const preComplete = pre?.status === 'complete' && pre.coverage?.complete === true;
  const postFinished = post?.status === 'complete' && post.coverage?.complete === true;
  const postAttempted = Boolean(post);
  const latestScan = post && (!pre || scanTime(post) >= scanTime(pre)) ? post : pre;
  const postComplete = Boolean(postFinished && latestScan === post);
  const comparable = Boolean(preComplete && postFinished && scanTime(pre) > 0 && scanTime(post) >= scanTime(pre));
  const preMap = findingMap(preItems);
  const postMap = findingMap(postItems);
  const findings = [];
  if (comparable) {
    for (const [key, list] of postMap) {
      for (const finding of list) findings.push({ ...finding, status: preMap.has(key) ? 'OPEN' : 'NEW' });
    }
  } else if (postComplete) {
    for (const finding of postItems) findings.push({ ...finding, status: 'OPEN' });
  } else if (preComplete && latestScan === pre) {
    for (const finding of preItems) findings.push({ ...finding, status: 'OPEN' });
  } else {
    const union = new Map();
    for (const finding of [...preItems, ...postItems]) {
      const key = finding.fingerprint || [finding.file, finding.cwe, finding.title].join('|').toLowerCase();
      if (!union.has(key)) union.set(key, finding);
    }
    for (const finding of union.values()) findings.push({ ...finding, status: postAttempted ? 'UNVERIFIED' : 'OPEN' });
  }
  const remediated = comparable
    ? [...preMap.entries()].filter(([key]) => !postMap.has(key)).flatMap(([, list]) => list.map((finding) => ({ ...finding, status: 'REMEDIATED' })))
    : [];
  return { findings, remediated, postComplete, currentScan: latestScan };
}

function aggregateSeverity(findings) {
  if (!findings.length) return 0;
  const complement = findings.reduce((value, finding) => value * (1 - (SEVERITY_RISK[String(finding.severity).toUpperCase()] || 55) / 100), 1);
  return Math.round((1 - complement) * 100);
}

function scanPosture(scan) {
  if (!scan) return { status: 'not_run', coverage: null, findings: null };
  return { status: scan.status || 'unknown', coverage: scan.coverage || null, findings: scan.totalFindings ?? scan.findings?.length ?? null };
}

export function buildSecurityScorecard(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  const { graph, sourcePath, status: graphStatus } = loadProjectGraph(root);
  const pre = loadScan(root, 'pre');
  const post = loadScan(root, 'post');
  const comparisonResult = comparison(pre, post);
  const currentScan = comparisonResult.currentScan;
  const currentScanComplete = currentScan?.status === 'complete' && currentScan.coverage?.complete === true;
  const { findings: currentFindings, remediated, postComplete } = comparisonResult;
  const migration = migrationStatus(root);
  const nodeStatuses = new Map((Array.isArray(migration.nodeStatuses) ? migration.nodeStatuses : []).map((node) => [String(node.id), node.status || node.migrationStatus || null]));
  const maxDegree = graph.nodes.reduce((max, node) => Math.max(max, node.metrics.inDegree + node.metrics.outDegree), 1);
  const findingByFile = new Map();
  const graphNodesByFile = new Map();
  for (const node of graph.nodes) {
    const key = normalizedPath(root, node.file);
    if (!key) continue;
    const list = graphNodesByFile.get(key) || [];
    list.push(node);
    graphNodesByFile.set(key, list);
  }
  const unmatched = [];
  const unmatchedRemediated = [];
  for (const finding of currentFindings) {
    const key = normalizedPath(root, finding.file);
    const matches = key ? (graphNodesByFile.get(key) || []) : [];
    if (!matches.length) unmatched.push(finding);
    for (const node of matches) {
      const list = findingByFile.get(node.id) || [];
      list.push(finding);
      findingByFile.set(node.id, list);
    }
  }
  const remediatedByNode = new Map();
  for (const finding of remediated) {
    const key = normalizedPath(root, finding.file);
    const matches = key ? (graphNodesByFile.get(key) || []) : [];
    if (!matches.length) unmatchedRemediated.push(finding);
    for (const node of matches) {
      const list = remediatedByNode.get(node.id) || [];
      list.push(finding);
      remediatedByNode.set(node.id, list);
    }
  }
  const nodeRows = graph.nodes.map((node) => {
    const findings = findingByFile.get(node.id) || [];
    const degree = node.metrics.inDegree + node.metrics.outDegree;
    const blast = Math.round(Math.min(100, (Math.log1p(degree) / Math.log1p(maxDegree)) * 75 + (node.isGodNode ? 25 : 0)));
    const uncertainty = node.metrics.totalEdges ? Math.round((node.metrics.uncertainEdges / node.metrics.totalEdges) * 100) : 0;
    const verifiedClean = postComplete && migration.status === 'complete' && findings.length === 0;
    const verificationDeficit = verifiedClean ? 0 : 100;
    const vulnerability = aggregateSeverity(findings);
    const score = graphStatus === 'available' && currentScanComplete
      ? Math.round(vulnerability * 0.45 + blast * 0.30 + uncertainty * 0.15 + verificationDeficit * 0.10)
      : null;
    const listedFindings = [...findings, ...(remediatedByNode.get(node.id) || [])];
    const painPoints = listedFindings.map((finding) => ({
      ...finding,
      nodeId: node.id,
      nodeLabel: node.label,
      category: node.isGodNode && ['CRITICAL', 'HIGH'].includes(String(finding.severity).toUpperCase()) ? 'COMPOUND_GOD_NODE_VULN' : 'CODEX_SECURITY_FINDING',
      riskContribution: score
    }));
    return {
      id: node.id, label: node.label, file: node.file, line: node.line, community: node.community,
      metrics: { ...node.metrics, isGodNode: node.isGodNode },
      migrationStatus: nodeStatuses.get(node.id) || null,
      riskScore: score,
      grade: scoreToGrade(score),
      pillars: { vulnerability, blastRadius: graphStatus === 'available' ? blast : null, uncertainty: graphStatus === 'available' ? uncertainty : null, verificationDeficit },
      findings: listedFindings, painPoints
    };
  });
  const nodeScores = nodeRows.map((node) => node.riskScore).filter((score) => score !== null);
  const securityRiskScore = currentScanComplete ? aggregateSeverity(currentFindings) : null;
  const meanBlastRadius = graph.nodes.length ? Math.round(nodeRows.reduce((sum, node) => sum + (node.pillars.blastRadius || 0), 0) / graph.nodes.length) : 0;
  const meanUncertainty = graph.nodes.length ? Math.round(nodeRows.reduce((sum, node) => sum + (node.pillars.uncertainty || 0), 0) / graph.nodes.length) : 0;
  const postClean = postComplete && currentFindings.length === 0;
  const verificationDeficit = postClean && migration.status === 'complete' ? 0 : 100;
  const overallRiskScore = graphStatus === 'available' && nodeScores.length && currentScanComplete
    ? Math.round(securityRiskScore * 0.45 + meanBlastRadius * 0.30 + meanUncertainty * 0.15 + verificationDeficit * 0.10)
    : null;
  const painPoints = [...nodeRows.flatMap((node) => node.painPoints), ...unmatched.map((finding) => ({
    ...finding, nodeId: null, nodeLabel: 'Unmapped finding', category: 'UNMAPPED_CODEX_SECURITY_FINDING', riskContribution: null
  })), ...unmatchedRemediated.map((finding) => ({
    ...finding, nodeId: null, nodeLabel: 'Unmapped finding', category: 'UNMAPPED_CODEX_SECURITY_FINDING', riskContribution: null
  }))].sort((a, b) => (SEVERITY_ORDER[String(a.severity).toUpperCase()] ?? 9) - (SEVERITY_ORDER[String(b.severity).toUpperCase()] ?? 9) || (b.riskContribution || 0) - (a.riskContribution || 0));
  return {
    schemaVersion: '2.0',
    updatedAt: new Date().toISOString(),
    projectRoot: root,
    graph: { status: graphStatus, sourcePath, nodeCount: graph.nodes.length, edgeCount: graph.edges.length },
    migration,
    scans: { pre: scanPosture(pre), post: scanPosture(post) },
    summary: {
      overallRiskScore,
      overallGrade: scoreToGrade(overallRiskScore),
      securityRiskScore,
      securityGrade: scoreToGrade(securityRiskScore),
      preRiskScore: pre?.status === 'complete' && pre.coverage?.complete === true ? aggregateSeverity(pre.findings || []) : null,
      postRiskScore: postComplete ? securityRiskScore : null,
      pillars: {
        vulnerability: securityRiskScore,
        blastRadius: graphStatus === 'available' ? meanBlastRadius : null,
        uncertainty: graphStatus === 'available' ? meanUncertainty : null,
        verificationDeficit
      },
      totalFindings: currentFindings.length,
      openFindings: currentFindings.filter((finding) => ['OPEN', 'NEW'].includes(finding.status)).length,
      unverifiedFindings: currentFindings.filter((finding) => finding.status === 'UNVERIFIED').length,
      remediatedFindings: remediated.length,
      unmappedFindings: unmatched.length,
      postMigrationVerifiedClean: postClean,
      tokenSavingsPercent: graphTokenSavings(root)
    },
    nodes: nodeRows,
    edges: graph.edges,
    painPoints
  };
}

export function renderSecurityReport(scorecard) {
  const { summary, scans, migration } = scorecard;
  const rows = scorecard.painPoints.map((point) => `| ${point.severity} | ${point.cwe} | ${point.file}:${point.line ?? '?'} | ${point.title.replace(/\|/g, '\\|')} | ${point.status} |`).join('\n');
  return `# Repository Security Risk Report\n\nGenerated: ${scorecard.updatedAt}\n\n## Posture\n\n- Composite risk: ${summary.overallRiskScore ?? 'Unavailable'} / 100 (${summary.overallGrade})\n- Security risk: ${summary.securityRiskScore} / 100 (${summary.securityGrade})\n- Findings: ${summary.openFindings} open, ${summary.remediatedFindings} remediated, ${summary.unverifiedFindings} unverified\n- Pre scan: ${scans.pre.status}; post scan: ${scans.post.status}\n- Graph: ${scorecard.graph.status}${scorecard.graph.sourcePath ? ` (${scorecard.graph.sourcePath})` : ''}\n- Reversa migration: ${migration.status} (${migration.progress}%)\n\n## Ranked Findings\n\n| Severity | CWE | File | Finding | Status |\n|---|---|---|---|---|\n${rows || '| — | — | — | No findings reported | — |'}\n\n> A missing or incomplete scan is not evidence that the repository is secure. Findings without a Graphify path match remain listed as unmapped.\n`;
}

export function writeSecurityScorecard(projectRoot, scorecard) {
  const outputDir = path.join(path.resolve(projectRoot), '.reversa', 'security');
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(outputDir, 0o700); } catch { /* Windows ACLs are managed by the OS. */ }
  const jsonPath = path.join(outputDir, 'security-scorecard.json');
  const markdownPath = path.join(outputDir, 'security-risk-report.md');
  fs.writeFileSync(jsonPath, JSON.stringify(scorecard, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.writeFileSync(markdownPath, renderSecurityReport(scorecard), { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(jsonPath, 0o600); fs.chmodSync(markdownPath, 0o600); } catch { /* Windows ACLs are managed by the OS. */ }
  return { jsonPath, markdownPath };
}

export function calculateSecurityAndGraphRisk(projectRoot = process.cwd()) {
  const scorecard = buildSecurityScorecard(projectRoot);
  scorecard.reports = writeSecurityScorecard(projectRoot, scorecard);
  return scorecard;
}
