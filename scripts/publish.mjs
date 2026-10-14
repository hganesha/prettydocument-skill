#!/usr/bin/env node
/**
 * Stage 6 — publish the draft as a standalone page.
 *
 *   node scripts/publish.mjs --draft drafts/<slug> --slug <slug> [--out out]
 *        [--brand-title … --brand-logo … | --brand <file> | --no-brand]
 *        [--format release] [--kind essay] [--revision 1] [--title "…"] [--force]
 *
 * Writes <out>/<slug>/:
 *   index.html     the essay as one self-contained page: open it, host it, or attach it
 *   document.json  the validated PublicationDocument it was drawn from
 *   <slug>.md      the portable paper
 *   release.json   with --format release: { slug, revision, publishedAt, document },
 *                  the envelope FieldNotes Studio and its reader import
 *
 * Validation runs first and blocks publication unless --force is passed.
 * A brand that fails its checks blocks publication too: an essay should not go
 * out under half a logo.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs, requireOption, scriptsDir, workspaceRoot } from './lib/args.mjs';
import { draftFile, readJson, writeJson, writeText } from './lib/fs.mjs';
import { resolveBrand } from './lib/brand.mjs';
import { readReaderCss, renderPage } from './lib/page.mjs';
import { renderDocumentMarkdown } from './lib/markdown.mjs';

const usage = 'Usage: publish.mjs --draft <dir> --slug <slug> [--out <dir>] [--format release] [--kind essay|data-story|infographic] [--revision 1] [--brand-title …] [--no-brand] [--force]';
const options = parseArgs(process.argv.slice(2), { kind: 'essay', revision: '1' });
const draft = requireOption(options, 'draft', usage);
const slug = requireOption(options, 'slug', usage);

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error(`“${slug}” is not a valid slug. Use lowercase words separated by hyphens.`);
  process.exit(1);
}
if (options.format !== undefined && options.format !== 'release') {
  console.error(`Unknown --format “${options.format}”. The only extra format is “release”.`);
  process.exit(1);
}

const documentPath = draftFile(draft, 'document.json');
if (!existsSync(documentPath)) {
  console.error(`No document.json in ${draft}. Run compose.mjs first.`);
  process.exit(1);
}

if (!options.force) {
  const validate = new URL('validate.mjs', scriptsDir());
  const result = spawnSync(process.execPath, [validate.pathname, '--draft', draft, '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    const report = (() => { try { return JSON.parse(result.stdout); } catch { return null; } })();
    console.error('Validation failed; nothing was published.');
    for (const error of report?.errors ?? []) console.error(`  - ${error}`);
    if (!report) console.error(result.stdout || result.stderr);
    console.error('\nFix the draft and recompose, or pass --force to publish an invalid document (it may not render).');
    process.exit(1);
  }
}

const { brand, source, problems } = resolveBrand(options);
if (problems.length) {
  console.error('The brand is not valid; nothing was published:');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('Fix it (brand.mjs check), or pass --no-brand to publish without one.');
  process.exit(1);
}

const document = await readJson(documentPath);
document.status = 'published';
document.kind = String(options.kind);
if (options.title) document.title = String(options.title);

const base = resolve(options.out ? String(options.out) : `${workspaceRoot().pathname}out`, slug);
const { html } = renderPage(document, { css: await readReaderCss(), brand });

const written = [
  await writeText(`${base}/index.html`, html),
  await writeJson(`${base}/document.json`, document),
  await writeText(`${base}/${slug}.md`, renderDocumentMarkdown(document)),
];
if (options.format === 'release') {
  const revision = Number(options.revision) || 1;
  written.push(await writeJson(`${base}/release.json`, { slug, revision, publishedAt: options.publishedAt ?? new Date().toISOString(), document }));
}

console.log(`Published ${slug} · ${document.chapters.length} chapters · ${document.title}`);
console.log(brand ? `Brand: ${brand.title ?? '(logo only)'}${brand.logo ? ' + logo' : ''} (${source}).` : 'Brand: none. The page has no masthead.');
for (const file of written) console.log(`  ${file}`);
console.log(`\nOpen ${base}/index.html in a browser. It is one file with no dependencies,`);
console.log('so it can be hosted anywhere or sent as an attachment.');
