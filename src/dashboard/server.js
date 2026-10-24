#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCodexSecurityScan } from '../security/codex-security-runner.js';
import { calculateSecurityAndGraphRisk, buildSecurityScorecard } from '../security/risk-scorer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(here, 'public', 'index.html');
const MAX_BODY_BYTES = 4096;

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:"
  });
  res.end(body);
}

function requestIsLocal(req, port) {
  const host = String(req.headers.host || '').toLowerCase();
  if (![ `127.0.0.1:${port}`, `localhost:${port}`, `127.0.0.1`, `localhost` ].includes(host)) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ['127.0.0.1', 'localhost'].includes(parsed.hostname) && (!parsed.port || Number(parsed.port) === port);
  } catch { return false; }
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body too large.');
    chunks.push(chunk);
  }
  if (!total) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createDashboardServer({ projectRoot = process.cwd(), port = Number(process.env.PORT || 4400), scan = runCodexSecurityScan } = {}) {
  const root = path.resolve(projectRoot);
  const server = http.createServer(async (req, res) => {
    const effectivePort = port || Number(server.address()?.port || 0);
    if (!requestIsLocal(req, effectivePort)) return send(res, 403, JSON.stringify({ error: 'Local dashboard requests only.' }));
    const url = new URL(req.url || '/', `http://127.0.0.1:${effectivePort}`);
    try {
      if (req.method === 'GET' && ['/', '/index.html'].includes(url.pathname)) {
        if (!fs.existsSync(HTML_PATH)) return send(res, 404, 'Dashboard UI is missing.', 'text/plain; charset=utf-8');
        return send(res, 200, fs.readFileSync(HTML_PATH, 'utf8'), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && url.pathname === '/api/scorecard') {
        return send(res, 200, JSON.stringify(buildSecurityScorecard(root)));
      }
      if (req.method === 'GET' && url.pathname === '/api/graph') {
        const scorecard = buildSecurityScorecard(root);
        return send(res, 200, JSON.stringify({ graph: scorecard.graph, migration: scorecard.migration, nodes: scorecard.nodes, edges: scorecard.edges }));
      }
      if (req.method === 'POST' && url.pathname === '/api/security/scan') {
        const body = await readBody(req);
        const phase = body.phase || 'post';
        if (!['pre', 'post'].includes(phase)) return send(res, 400, JSON.stringify({ error: 'phase must be pre or post.' }));
        let scanResult;
        try {
          scanResult = await scan(root, phase);
        } catch (error) {
          const scorecard = calculateSecurityAndGraphRisk(root);
          return send(res, 502, JSON.stringify({ error: error.message, scan: error.report || null, scorecard }));
        }
        const scorecard = calculateSecurityAndGraphRisk(root);
        return send(res, 200, JSON.stringify({ scan: scanResult, scorecard }));
      }
      return send(res, 404, JSON.stringify({ error: 'Not found.' }));
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : 500;
      return send(res, status, JSON.stringify({ error: error.message || 'Request failed.' }));
    }
  });
  return server;
}

const args = process.argv.slice(2);
const targetAt = args.indexOf('--target');
const targetArg = targetAt >= 0 ? args[targetAt + 1] : args.find((arg) => !arg.startsWith('-'));
const root = path.resolve(targetArg || process.cwd());
const port = Number(process.env.PORT || 4400);
export function startDashboardServer(projectRoot = root, selectedPort = port) {
  const server = createDashboardServer({ projectRoot, port: selectedPort });
  server.listen(selectedPort, '127.0.0.1', () => {
    console.log(`Reversa security dashboard: http://127.0.0.1:${selectedPort}`);
    console.log(`Project: ${path.resolve(projectRoot)}`);
    console.log('Dashboard status controls are read-only; security scans write private reports only.');
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startDashboardServer(root, port);
}
