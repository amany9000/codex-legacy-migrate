#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCodexSecurityScan } from './codex-security-runner.js';
import { calculateSecurityAndGraphRisk } from './risk-scorer.js';

function parseArgs(argv) {
  const options = { target: process.cwd(), phase: 'pre', dryRun: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--target') options.target = argv[++index];
    else if (value.startsWith('--target=')) options.target = value.slice(9);
    else if (value === '--phase') options.phase = argv[++index];
    else if (value.startsWith('--phase=')) options.phase = value.slice(8);
    else if (value === '--max-cost-usd') options.maxCostUsd = Number(argv[++index]);
    else if (value === '--dry-run') options.dryRun = true;
    else if (value === '--help' || value === '-h') options.help = true;
    else if (!value.startsWith('-')) positional.push(value);
    else throw new Error(`Unknown option: ${value}`);
  }
  if (positional.length && options.target === process.cwd()) options.target = positional.shift();
  if (positional.length && ['pre', 'post'].includes(positional[0])) options.phase = positional[0];
  if (positional.length > 1 || (positional.length === 1 && !['pre', 'post'].includes(positional[0]))) {
    throw new Error('Use at most a target path followed by an optional pre or post phase.');
  }
  return options;
}

function printScorecard(scorecard, scan) {
  const summary = scorecard.summary;
  console.log('\nReversa Full-Repository Security Audit');
  console.log(`Target: ${scorecard.projectRoot}`);
  console.log(`Scan: ${scan.phase} (${scan.status}) via ${scan.engine}`);
  console.log(`Coverage complete: ${scan.coverage?.complete === true ? 'yes' : 'no'}`);
  console.log(`Repository risk: ${summary.overallRiskScore ?? 'unavailable'}/100 (${summary.overallGrade})`);
  console.log(`Security posture: ${summary.securityRiskScore == null ? 'unavailable' : `${summary.securityRiskScore}/100 (${summary.securityGrade})`}`);
  console.log(`Findings: ${summary.openFindings} open, ${summary.remediatedFindings} remediated, ${summary.unverifiedFindings} unverified, ${summary.unmappedFindings} unmapped`);
  console.log(`Graph: ${scorecard.graph.status}; Reversa migration: ${scorecard.migration.status} (${scorecard.migration.progress}%)`);
  const top = scorecard.painPoints.slice(0, 5);
  if (top.length) {
    console.log('\nTop pain points:');
    for (const [index, point] of top.entries()) {
      console.log(`${index + 1}. [${point.severity}] ${point.title} — ${point.file}:${point.line ?? '?'}`);
    }
  } else if (scan.status === 'complete') {
    console.log('\nNo findings in the available scan results.');
  } else {
    console.log('\nNo trustworthy completed finding set is available.');
  }
  if (scorecard.reports) console.log(`\nReports: ${scorecard.reports.jsonPath}\n         ${scorecard.reports.markdownPath}`);
  console.log();
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: reversa security-scan [target] [--phase pre|post] [--max-cost-usd amount] [--dry-run]');
    return;
  }
  if (!['pre', 'post'].includes(options.phase)) throw new Error('--phase must be pre or post.');
  if (options.maxCostUsd !== undefined && (!Number.isFinite(options.maxCostUsd) || options.maxCostUsd <= 0)) {
    throw new Error('--max-cost-usd must be a positive number.');
  }
  const target = path.resolve(options.target);
  if (options.dryRun) {
    console.log(`Security scan dry run: target=${target}; phase=${options.phase}; scope=full repository; engine=@openai/codex-security; Graphify risk mapping enabled when graph data is available`);
    return 0;
  }
  let scan;
  let failure = null;
  try {
    scan = await runCodexSecurityScan(target, options.phase, {
      scanOptions: options.maxCostUsd ? { maxCostUsd: options.maxCostUsd } : {}
    });
  } catch (error) {
    failure = error;
    scan = error.report || {
      phase: options.phase, status: 'failed', engine: '@openai/codex-security',
      coverage: { complete: false }, error: { message: error.message }
    };
  }
  const scorecard = calculateSecurityAndGraphRisk(target);
  printScorecard(scorecard, scan);
  if (failure) {
    console.error(`Security scan did not complete: ${failure.message}`);
    return 1;
  }
  return 0;
}

export async function runCli(argv = process.argv.slice(2)) {
  try { return await main(argv); }
  catch (error) { console.error(`Security audit failed: ${error.message}`); return 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli();
}
