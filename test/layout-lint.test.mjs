/**
 * The layout rules in lib/lint.mjs and lib/figure-fit.mjs.
 *
 *   npm test
 *
 * Runs against vendor/layout-families.json, so a vendor build that loses the
 * `flow` or `radial` family fails here instead of silently disabling the fit
 * checks.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadLayoutFamilies } from '../scripts/lib/figure-fit.mjs';
import { lint } from '../scripts/lib/lint.mjs';

const layouts = await loadLayoutFamilies();
const registry = { templates: [], charts: [] };
const chunks = { chunks: [], wordCount: 0 };

const words = (count) => Array.from({ length: count }, (_, index) => `word${index}`).join(' ');
const paragraph = (count = 60) => ({ kind: 'paragraph', text: words(count) });
const quote = () => ({ kind: 'pullquote', text: 'a line', evidence: [{ sourceChunkId: 'c01' }] });
const figure = (overrides = {}) => ({
  kind: 'site-component',
  componentId: 'region-grid',
  altText: 'alt',
  items: [{ label: 'One', detail: 'A short detail.' }],
  evidence: [{ sourceChunkId: 'c01' }],
  ...overrides,
});
const chapter = (id, blocks) => ({ id, title: `Title ${id}`, thesis: 'A thesis.', blocks });
const run = (chapters) => lint({ document: { chapters }, plan: {}, blocks: { chapters: [] }, chunks, registry, layouts }).warnings;
const find = (warnings, pattern) => warnings.filter((warning) => pattern.test(warning));

test('the renderer layout families can be read', () => {
  assert.ok(layouts, 'loadLayoutFamilies() returned null: SiteComponentTemplate.tsx moved or changed shape');
  assert.ok(layouts.flow.has('system-flow'));
  assert.ok(layouts.radial.has('feedback-loop'));
});

test('a flow figure holds four stages, not five', () => {
  const items = (count) => Array.from({ length: count }, (_, index) => ({ label: `Stage ${index}`, detail: 'Detail.' }));
  const warnings = (count) => run([chapter('a', [paragraph(), figure({ componentId: 'system-flow', items: items(count) }), paragraph()])]);
  assert.equal(find(warnings(4), /fits 4 to a row/).length, 0);
  assert.equal(find(warnings(5), /fits 4 to a row/).length, 1);
});

test('a radial figure keeps its text inside the circle', () => {
  const warnings = (label, detail) => run([chapter('a', [paragraph(), figure({ componentId: 'feedback-loop', items: [{ label, detail }] }), paragraph()])]);
  assert.equal(find(warnings('x'.repeat(24), 'y'.repeat(60)), /most a radial|inside its circle/).length, 0);
  assert.equal(find(warnings('x'.repeat(25), 'y'.repeat(10)), /label is 25/).length, 1);
  assert.equal(find(warnings('x', 'y'.repeat(61)), /detail is 61/).length, 1);
});

test('every figure closing its chapter reads as a template', () => {
  const closing = (id) => chapter(id, [paragraph(), paragraph(), paragraph(), figure()]);
  const mid = (id) => chapter(id, [paragraph(), figure(), paragraph(), paragraph()]);
  assert.equal(find(run([closing('a'), closing('b'), mid('c')]), /end on their figure/).length, 0);
  assert.equal(find(run([closing('a'), closing('b'), closing('c')]), /end on their figure/).length, 1);
});

test('a chapter does not open on a figure or stack figures against pullquotes', () => {
  assert.equal(find(run([chapter('a', [figure(), paragraph(), paragraph()])]), /opens on a figure/).length, 1);
  assert.equal(find(run([chapter('a', [paragraph(), figure(), quote(), paragraph()])]), /directly against a pullquote/).length, 1);
  assert.equal(find(run([chapter('a', [paragraph(), figure(), figure(), paragraph()])]), /directly against another figure/).length, 1);
  assert.equal(find(run([chapter('a', [paragraph(), figure(), paragraph(), quote(), paragraph()])]), /directly against/).length, 0);
});

test('a long run of prose needs something to look at', () => {
  const long = chapter('a', [paragraph(120), paragraph(120), paragraph(120), figure(), paragraph(60)]);
  const broken = chapter('a', [paragraph(120), paragraph(120), figure(), paragraph(120), paragraph(60)]);
  assert.equal(find(run([long]), /words of prose in a row/).length, 1);
  assert.equal(find(run([broken]), /words of prose in a row/).length, 0);
});

test('three chapters without a figure is a desert', () => {
  const plain = (id) => chapter(id, [paragraph(), paragraph()]);
  assert.equal(find(run([plain('a'), plain('b'), chapter('c', [paragraph(), figure(), paragraph()])]), /in a row with no figure/).length, 0);
  assert.equal(find(run([plain('a'), plain('b'), plain('c')]), /in a row with no figure/).length, 1);
});

const runFor = (chapters, sourceWords) => lint({ document: { chapters }, plan: { sourceWordCount: sourceWords }, blocks: { chapters: [] }, chunks: { chunks: [], wordCount: sourceWords }, registry, layouts }).warnings;

test('length budgets scale with the source: a short memo is not told its chapters are thin', () => {
  const brief = (id) => chapter(id, [paragraph(70), paragraph(70)]);
  const chapters = ['a', 'b', 'c', 'd', 'e'].map(brief); // 5 chapters, 140 words each: 700 words
  assert.equal(find(runFor(chapters, 775), /short for a chapter/).length, 0, '140 words per chapter is right for a 775-word source');
  assert.equal(find(runFor(chapters, 775), /short for a FieldNotes note/).length, 0, '700 words is 90% of a 775-word source');
  assert.equal(find(runFor(chapters, 3000), /short for a chapter/).length, 5, 'the same chapters are thin for a 3,000-word source');
});

test('the note-length floor never exceeds what the source can supply', () => {
  const chapters = ['a', 'b', 'c', 'd', 'e'].map((id) => chapter(id, [paragraph(60), paragraph(60)]));
  const message = find(runFor(chapters, 775), /short for a FieldNotes note/)[0] ?? '';
  const supported = Number(message.match(/supports about ([\d,]+)/)?.[1]?.replace(',', '') ?? 0);
  assert.ok(supported <= 775, `says the source supports ${supported}, more than its 775 words`);
});

test('a subtitle that repeats the thesis is flagged', () => {
  const twin = { ...chapter('a', [paragraph(), paragraph()]), subtitle: 'The slowdown was broad across most customers, large and small', thesis: 'The slowdown was broad: most customers, large and small, paid later.' };
  assert.equal(find(run([twin]), /subtitle and the thesis say nearly the same/).length, 1);
  assert.equal(find(run([{ ...twin, subtitle: 'Where the time went' }]), /subtitle and the thesis/).length, 0);
});

test('the shipped example demonstrates the layout it teaches', () => {
  const dir = new URL('../examples/discernment-frame/', import.meta.url);
  const read = (name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
  const realRegistry = JSON.parse(readFileSync(new URL('../registry/authoring-registry.json', import.meta.url), 'utf8'));
  const result = lint({ document: read('document.json'), plan: read('plan.json'), blocks: read('blocks.json'), chunks: read('chunks.json'), registry: realRegistry, layouts });
  const flow = find(result.warnings, /end on their figure|words of prose in a row|directly against|opens on a figure|in a row with no figure/);
  assert.deepEqual(flow, [], 'the example should not trip its own flow rules');
});

test('every figure the question-to-figure guide recommends exists in the catalog', () => {
  const guide = readFileSync(new URL('../references/question-to-figure.md', import.meta.url), 'utf8');
  const catalog = JSON.parse(readFileSync(new URL('../registry/authoring-registry.json', import.meta.url), 'utf8'));
  const problems = [];
  let rows = 0;
  for (const line of guide.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const cast = line.split('|')[2]?.trim() ?? '';
    const id = cast.match(/^`([a-z-]+)`/)?.[1];
    if (!id) continue;
    rows += 1;
    const known = cast.startsWith('chart') ? catalog.charts.some((chart) => chart.id === id) : catalog.templates.find((template) => template.id === id);
    if (!known) { problems.push(`unknown component “${id}”`); continue; }
    for (const [, variant] of (cast.match(/\(([^)]*)\)/)?.[1] ?? '').matchAll(/`([a-z-]+)`/g)) {
      if (!known.variants?.includes(variant)) problems.push(`${id}: unknown variant “${variant}”`);
    }
    const generic = /\*\*generic\*\*/.test(cast);
    if (known.readiness && generic !== (known.readiness !== 'implemented')) problems.push(`${id}: marked ${generic ? 'generic' : 'implemented'} but the registry says ${known.readiness}`);
  }
  assert.ok(rows >= 30, `expected to find the recipe rows, found ${rows}`);
  assert.deepEqual(problems, []);
});
