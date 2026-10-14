/**
 * The standalone HTML page: masthead (only if branded), the essay as the
 * reader draws it, and an optional footer.
 *
 * The essay itself is the renderer's own output (engine.renderArticle), with
 * the reader's stylesheet inlined, so this page and the reader agree. The
 * shell around it is deliberately thin: no site navigation, no catalog link,
 * and no name other than the one the author gave in the brand.
 */
import { readFile } from 'node:fs/promises';
import { skillRoot } from './args.mjs';
import { engine } from './engine.mjs';
import { escapeHtml, wordCount } from './text.mjs';

const BASE_CSS = `
:root { --pd-canvas: var(--fn-canvas, #f6f4ed); }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body.pd-page { margin: 0; background: var(--pd-canvas); color: var(--fn-ink, #20221c); font-family: var(--fn-font-ui, 'DM Sans', system-ui, sans-serif); }
.pd-skip { position: absolute; left: -9999px; top: 0; padding: 10px 14px; background: var(--fn-ink, #20221c); color: var(--pd-canvas); z-index: 10; }
.pd-skip:focus { left: 8px; top: 8px; }
.pd-masthead { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px clamp(20px, 8vw, 140px); border-bottom: 1px solid var(--fn-line, #d8d5cb); }
.pd-brand { display: inline-flex; align-items: center; gap: 12px; min-width: 0; color: var(--fn-ink, #20221c); text-decoration: none; }
a.pd-brand:focus-visible { outline: 2px solid var(--fn-emphasis, #686926); outline-offset: 4px; }
.pd-brand img { display: block; height: 32px; width: auto; max-width: 160px; object-fit: contain; }
.pd-brand-title { font: 600 15px/1.2 var(--fn-font-ui, 'DM Sans', system-ui, sans-serif); letter-spacing: .02em; overflow-wrap: anywhere; }
.pd-tagline { margin: 0; color: var(--fn-muted, #64675f); font: 400 13px/1.3 var(--fn-font-ui, 'DM Sans', system-ui, sans-serif); text-align: right; }
.pd-main { padding: 48px clamp(20px, 8vw, 140px) 96px; }
.pd-title { max-width: 760px; margin: 0 auto 10px; font: 400 clamp(34px, 5vw, 58px)/1 var(--fn-font-display, Georgia, 'Times New Roman', serif); letter-spacing: -.03em; }
.pd-meta { max-width: 760px; margin: 0 auto 34px; color: var(--fn-muted, #64675f); font: 500 11px/1.2 var(--fn-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); letter-spacing: .12em; text-transform: uppercase; }
.pd-footer { padding: 28px clamp(20px, 8vw, 140px) 48px; border-top: 1px solid var(--fn-line, #d8d5cb); color: var(--fn-muted, #64675f); font: 400 13px/1.5 var(--fn-font-ui, 'DM Sans', system-ui, sans-serif); }
@media (max-width: 560px) { .pd-masthead { flex-direction: column; align-items: flex-start; } .pd-tagline { text-align: left; } }
@media print { .pd-skip { display: none; } .pd-masthead { border-bottom-color: #999; } .fn-chapter { break-inside: avoid-page; } }
`;

function masthead(brand) {
  if (!brand) return '';
  const logo = brand.logo ? `<img src="${brand.logo.dataUri}" alt="${escapeHtml(brand.logo.alt)}">` : '';
  const title = brand.title ? `<span class="pd-brand-title">${escapeHtml(brand.title)}</span>` : '';
  // With a visible title the logo is decoration beside it; a logo alone carries its own alt text.
  const inner = brand.logo && brand.title ? logo.replace(`alt="${escapeHtml(brand.logo.alt)}"`, 'alt=""') + title : logo + title;
  const mark = brand.url ? `<a class="pd-brand" href="${escapeHtml(brand.url)}" rel="noopener">${inner}</a>` : `<span class="pd-brand">${inner}</span>`;
  return `<header class="pd-masthead">${mark}${brand.tagline ? `<p class="pd-tagline">${escapeHtml(brand.tagline)}</p>` : ''}</header>`;
}

/** CSS for the design system the document carries (or the baseline), applied to the whole page. */
function themeCss(document) {
  const system = document.visualLanguage?.theme;
  const resolved = engine.designCss(system ?? engine.designBaseline().system);
  if (!resolved.ok) throw new Error(`The document's design system is invalid: ${resolved.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`);
  const variables = Object.entries(resolved.variables).map(([name, value]) => `${name}: ${value};`).join(' ');
  return { css: `:root { ${variables} }`, fontStylesheet: resolved.fontStylesheet, label: system && !resolved.isBaseline ? `${system.label} (${system.id})` : null };
}

/**
 * @param document  a PublicationDocument
 * @param brand     from resolveBrand(), or null for an unbranded page
 * @returns { html, designSystem }
 */
export function renderPage(document, { css, brand = null }) {
  const words = document.chapters.reduce((total, chapter) => total + chapter.blocks.reduce((sum, block) => sum + (block.kind === 'paragraph' ? wordCount(block.text) : 0), 0), 0);
  const theme = themeCss(document);
  const article = engine.renderArticle(document);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(document.title)}${brand?.title ? ` · ${escapeHtml(brand.title)}` : ''}</title>
<style>${css}</style>
${theme.fontStylesheet ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="${escapeHtml(theme.fontStylesheet)}">\n` : ''}<style id="design-system">${theme.css}</style>
<style id="page">${BASE_CSS}</style>
</head>
<body class="pd-page">
<a class="pd-skip" href="#essay">Skip to the essay</a>
${masthead(brand)}
<main class="pd-main" id="essay">
  <h1 class="pd-title">${escapeHtml(document.title)}</h1>
  <p class="pd-meta">${document.chapters.length} chapters · ${words.toLocaleString()} words · ${Math.max(1, Math.round(words / 220))} min read</p>
  ${article}
</main>
${brand?.footer ? `<footer class="pd-footer">${escapeHtml(brand.footer)}</footer>\n` : ''}</body>
</html>
`;
  return { html, designSystem: theme.label };
}

/** The reader's stylesheet, vendored with its @imports already inlined. */
export function readReaderCss() {
  return readFile(new URL('vendor/reader.css', skillRoot()), 'utf8');
}
