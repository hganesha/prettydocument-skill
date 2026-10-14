#!/usr/bin/env node
/**
 * Stage 4 — validate a draft before it is previewed or published.
 *
 *   node scripts/validate.mjs --draft drafts/<slug> [--json]
 *
 * Two gates in one report:
 *
 *   contract  the publication contract's validatePublicationDocument(),
 *             vendored in vendor/engine.mjs. A document that fails this will
 *             not render.
 *   editorial the lint in lib/lint.mjs: budgets, casting repetition, prose
 *             length, evidence coverage.
 *
 * Writes report.md and report.json. Exits non-zero when either gate fails.
 */
import { existsSync } from 'node:fs';
import { parseArgs, requireOption, scriptPath, skillRoot } from './lib/args.mjs';
import { engine } from './lib/engine.mjs';
import { draftFile, readJson, writeJson, writeText } from './lib/fs.mjs';
import { lint } from './lib/lint.mjs';
import { loadLayoutFamilies } from './lib/figure-fit.mjs';

const usage = 'Usage: validate.mjs --draft <dir> [--json]';
const options = parseArgs(process.argv.slice(2));
const draft = requireOption(options, 'draft', usage);

const documentPath = draftFile(draft, 'document.json');
if (!existsSync(documentPath)) {
  console.error(`No document.json in ${draft}. Run compose.mjs first.`);
  process.exit(1);
}
const document = await readJson(documentPath);
const plan = await readJson(draftFile(draft, 'plan.json'), {});
const blocks = await readJson(draftFile(draft, 'blocks.json'), { chapters: [] });
const chunks = await readJson(draftFile(draft, 'chunks.json'), { chunks: [] });
const registry = await readJson(new URL('registry/authoring-registry.json', skillRoot()));

// Gate 1: the contract, run in-process from the vendored copy of the reader's own validator.
const contract = engine.validateDocument(document);
const contractSkipped = null;

// Gate 2: editorial lint.
const layouts = await loadLayoutFamilies();
const result = lint({ document, plan, blocks, chunks, registry, layouts });
if (!layouts) result.warnings.push('Could not read the renderer layout families (vendor/layout-families.json), so figure-fit limits were not checked.');
const errors = [...(contract.ok ? [] : contract.issues.map((issue) => `contract ${issue.path}: ${issue.message}`)), ...result.errors];
const warnings = [...result.warnings, ...(contract.advisories ?? []).map((advice) => `design system: ${advice}`), ...(contractSkipped ? [`contract gate skipped: ${contractSkipped}`] : [])];
const passed = errors.length === 0;

const lines = [
  `# Validation report — ${document.title}`,
  '',
  `- **Contract**: ${contract.ok ? 'pass' : `fail — ${contract.issues.length} issue(s)`}${contractSkipped ? ' — skipped' : ''}`,
  `- **Editorial lint**: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`,
  `- **Verdict**: ${passed ? (result.warnings.length ? 'ready with warnings' : 'ready') : 'not ready'}`,
  '',
  `| measure | value |`,
  `| --- | --- |`,
  `| chapters | ${result.stats.chapters} |`,
  `| words | ${result.stats.words.toLocaleString()} |`,
  `| reading time | ${result.stats.readingMinutes} min |`,
  `| figures | ${result.stats.figures} |`,
  `| pullquotes | ${result.stats.pullquotes} |`,
  `| chunks cited | ${result.stats.chunksCited}/${result.stats.chunksTotal} |`,
  '',
];

if (errors.length) {
  lines.push('## Errors', '');
  for (const error of errors) lines.push(`- ${error}`);
  lines.push('');
}
if (warnings.length) {
  lines.push('## Warnings', '');
  for (const warning of warnings) lines.push(`- ${warning}`);
  lines.push('');
}
if (result.stats.uncitedChunks.length) {
  lines.push('## Uncited source', '', `No block cites ${result.stats.uncitedChunks.join(', ')}. Either use the material or record in plan.json → structureNotes why it was dropped.`, '');
}
if (Object.keys(result.stats.componentCounts).length) {
  lines.push('## Casting', '');
  for (const [component, count] of Object.entries(result.stats.componentCounts)) lines.push(`- ${component}: ${count}`);
  lines.push('');
}
lines.push('## Fixing this', '', 'Edit plan.json or blocks.json, then:', '', '```bash', `node ${scriptPath('compose.mjs')} --draft ${draft}`, `node ${scriptPath('validate.mjs')} --draft ${draft}`, '```', '');

const reportPath = await writeText(draftFile(draft, 'report.md'), lines.join('\n'));
const jsonPath = await writeJson(draftFile(draft, 'report.json'), { passed, contract, contractSkipped, ...result });

if (options.json) {
  console.log(JSON.stringify({ passed, contract, contractSkipped, ...result }, null, 2));
} else {
  console.log(lines.join('\n'));
  console.log(`Report: ${reportPath}`);
  console.log(`        ${jsonPath}`);
}

process.exit(passed ? 0 : 1);
