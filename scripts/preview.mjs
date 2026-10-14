#!/usr/bin/env node
/**
 * Stage 5 — build a standalone reading page and a markdown export.
 *
 *   node scripts/preview.mjs --draft drafts/<slug> [--out <dir>]
 *                            [--brand-title … --brand-logo … --brand-url … --brand-tagline … | --brand <file> | --no-brand]
 *
 * Writes:
 *   preview/index.html   the essay exactly as it will publish (one file, no network except fonts)
 *   export/<slug>.md     the portable paper, for print-to-PDF and sharing
 *
 * The page is the real renderer's output, charts and figures included. Read it
 * end to end before publishing, at desktop width and at a narrow one. Branding
 * is applied here too, so what you review is what ships.
 */
import { existsSync } from 'node:fs';
import { parseArgs, requireOption } from './lib/args.mjs';
import { draftFile, readJson, writeText } from './lib/fs.mjs';
import { resolveBrand } from './lib/brand.mjs';
import { renderPage, readReaderCss } from './lib/page.mjs';
import { renderDocumentMarkdown } from './lib/markdown.mjs';
import { slugify } from './lib/ids.mjs';

const usage = 'Usage: preview.mjs --draft <dir> [--out <dir>] [--brand-title …] [--brand-logo …] [--no-brand]';
const options = parseArgs(process.argv.slice(2));
const draft = requireOption(options, 'draft', usage);

const documentPath = draftFile(draft, 'document.json');
if (!existsSync(documentPath)) {
  console.error(`No document.json in ${draft}. Run compose.mjs first.`);
  process.exit(1);
}
const document = await readJson(documentPath);

const { brand, source, problems } = resolveBrand(options);
if (problems.length) {
  console.error('The brand is not valid, so the page would publish unbranded:');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('Fix it (brand.mjs check), or pass --no-brand.');
  process.exit(1);
}

const { html, designSystem } = renderPage(document, { css: await readReaderCss(), brand });
if (designSystem) console.log(`Design system: ${designSystem}${html.includes('fonts.googleapis.com') ? ', loading its fonts from Google Fonts' : ''}.`);
console.log(brand ? `Brand: ${brand.title ?? '(logo only)'}${brand.logo ? ' + logo' : ''} (${source}).` : 'Brand: none. The page has no masthead.');

const slug = options.slug ?? slugify(document.title, 'essay');
const outBase = options.out ?? `${draft.replace(/\/+$/, '')}/preview`;
const htmlPath = await writeText(`${outBase}/index.html`, html);
const markdownPath = await writeText(`${draft.replace(/\/+$/, '')}/export/${slug}.md`, renderDocumentMarkdown(document));

console.log(`Preview:  ${htmlPath}`);
console.log(`Markdown: ${markdownPath}`);
console.log('\nOpen the HTML in a browser.');
