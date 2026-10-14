/**
 * Design systems in the skill: choosing, creating, refusing, and embedding.
 *
 *   npm test
 *
 * These run the real scripts against the vendored contract. Every run gets its
 * own workspace directory, so nothing is written into the skill itself.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

// The scripts read PRETTYDOCUMENT_HOME at import time: point it at a scratch workspace first.
const workspace = mkdtempSync(`${tmpdir()}/pd-workspace-`);
process.env.PRETTYDOCUMENT_HOME = workspace;
const { examplesDir, knownDesignSystems, resolveDesignSystem, runDesignTool, systemsDir } = await import('../scripts/lib/design-systems.mjs');

const skill = fileURLToPath(new URL('..', import.meta.url));
const design = `${skill}scripts/design.mjs`;
const compose = `${skill}scripts/compose.mjs`;
const example = `${skill}examples/discernment-frame`;
const scratch = mkdtempSync(`${tmpdir()}/fn-design-`);
const created = [];

const node = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: workspace, env: { ...process.env, PRETTYDOCUMENT_HOME: workspace } });
const track = (id) => { created.push(`${systemsDir}/${id}.json`); return id; };
after(() => { rmSync(scratch, { recursive: true, force: true }); rmSync(workspace, { recursive: true, force: true }); });

test('the baseline and the shipped examples are known and valid', () => {
  const ids = knownDesignSystems().map((entry) => entry.id);
  assert.ok(ids.includes('fieldnotes-light'));
  assert.ok(ids.includes('harbour'));
  // Only the examples that ship with the skill must be advisory-free; anything in the workspace is the user's own.
  for (const entry of knownDesignSystems().filter((candidate) => candidate.where === 'skill example')) {
    const result = runDesignTool('check', entry.path);
    assert.equal(result.ok, true, `${entry.id}: ${JSON.stringify(result.issues)}`);
    assert.deepEqual(result.advisories, [], `${entry.id} should not trip its own advisories`);
  }
  assert.ok(existsSync(`${examplesDir}/harbour.json`));
});

test('the baseline resolves to no theme, an example resolves to its tokens', () => {
  assert.equal(resolveDesignSystem('fieldnotes-light'), null);
  const harbour = resolveDesignSystem('harbour');
  assert.equal(harbour.system.id, 'harbour');
  assert.equal(harbour.system.tokens.fonts.body, 'source-serif-4');
  assert.throws(() => resolveDesignSystem('no-such-brand'), /No design system “no-such-brand”/);
});

test('init writes a valid system and derives a legible chart palette from the brand colors', () => {
  const id = track('zz-init-test');
  const result = node(design, ['init', '--id', id, '--label', 'Init test', '--accent', '#1d5c7a', '--emphasis', '#b2412e', '--font-body', 'lora']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const written = JSON.parse(readFileSync(`${systemsDir}/${id}.json`, 'utf8'));
  assert.equal(written.tokens.colors.accent, '#1d5c7a');
  assert.equal(written.tokens.fonts.body, 'lora');
  assert.equal(written.tokens.chart.length, 6, 'the derived palette is written out, so it can be edited');
  assert.equal(written.tokens.chart[0], '#b2412e', 'the headline mark follows the emphasis color');
});

test('init refuses invalid input and writes nothing', () => {
  const id = track('zz-bad-test');
  for (const args of [['--ink', '#aaaaaa'], ['--accent', 'red'], ['--font-body', 'Comic Sans'], ['--font-body', 'instrument-serif'], ['--font-mono', 'inter'], ['--canvas', 'url(javascript:alert(1))']]) {
    const result = node(design, ['init', '--id', id, ...args]);
    assert.notEqual(result.status, 0, `${args.join(' ')} should be refused`);
    assert.equal(existsSync(`${systemsDir}/${id}.json`), false, `${args.join(' ')} should write nothing`);
  }
});

test('init will not redefine the baseline or overwrite without --force', () => {
  assert.notEqual(node(design, ['init', '--id', 'fieldnotes-light']).status, 0);
  const id = track('zz-twice-test');
  assert.equal(node(design, ['init', '--id', id]).status, 0);
  assert.notEqual(node(design, ['init', '--id', id, '--accent', '#000000']).status, 0);
  assert.equal(node(design, ['init', '--id', id, '--accent', '#1d5c7a', '--force']).status, 0);
});

test('init derives the surface, muted text and rules from a new canvas and ink, and headings follow the body font', () => {
  const id = track('zz-neutrals-test');
  const result = node(design, ['init', '--id', id, '--canvas', '#f7f1e3', '--ink', '#0b2545', '--accent', '#0b725f', '--emphasis', '#b2412e', '--font-body', 'eb-garamond']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const colors = JSON.parse(readFileSync(`${systemsDir}/${id}.json`, 'utf8')).tokens;
  assert.notEqual(colors.colors.surface, '#eeebe2', 'the baseline surface does not belong on a sand page');
  assert.notEqual(colors.colors.muted, '#64675f');
  assert.equal(colors.fonts.display, 'eb-garamond');
  assert.equal(result.stdout.includes('Advisories'), false, 'a derived system should be clean');
});

test('a colour that fails contrast is refused with a value that passes', () => {
  const id = track('zz-suggest-test');
  const result = node(design, ['init', '--id', id, '--canvas', '#f7f1e3', '--ink', '#0b2545', '--accent', '#13c4a3']);
  assert.notEqual(result.status, 0);
  const fix = result.stdout.match(/accent: #13c4a3 will not read; (#[0-9a-f]{6})/)?.[1];
  assert.ok(fix, result.stdout);
  assert.equal(node(design, ['init', '--id', id, '--canvas', '#f7f1e3', '--ink', '#0b2545', '--accent', fix]).status, 0, `the suggested ${fix} should be accepted`);
});

function draft(name) {
  const dir = `${scratch}/${name}`;
  cpSync(example, dir, { recursive: true });
  for (const file of ['document.json', 'report.md', 'essay.md', 'README.md']) rmSync(`${dir}/${file}`, { force: true });
  return dir;
}

test('compose embeds the chosen design system, records it in the plan, and keeps it on recompose', () => {
  const dir = draft('themed');
  const first = node(compose, ['--draft', dir, '--title', 'T', '--design-system', 'harbour']);
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const document = JSON.parse(readFileSync(`${dir}/document.json`, 'utf8'));
  assert.equal(document.visualLanguage.theme.id, 'harbour');
  assert.equal(JSON.parse(readFileSync(`${dir}/plan.json`, 'utf8')).designSystem, 'harbour');

  assert.equal(node(compose, ['--draft', dir, '--title', 'T']).status, 0);
  assert.equal(JSON.parse(readFileSync(`${dir}/document.json`, 'utf8')).visualLanguage.theme.id, 'harbour', 'the choice survives a recompose without the flag');

  assert.equal(node(compose, ['--draft', dir, '--title', 'T', '--design-system', 'fieldnotes-light']).status, 0);
  assert.equal(JSON.parse(readFileSync(`${dir}/document.json`, 'utf8')).visualLanguage.theme, undefined, 'choosing the baseline removes the theme');
});

test('compose stops on an unknown or invalid design system rather than publishing around it', () => {
  const unknown = node(compose, ['--draft', draft('unknown'), '--title', 'T', '--design-system', 'no-such-brand']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /No design system “no-such-brand”/);
  assert.equal(existsSync(`${scratch}/unknown/document.json`), false);
});

test('a document with no design system chosen has no theme at all', () => {
  const dir = draft('plain');
  assert.equal(node(compose, ['--draft', dir, '--title', 'T']).status, 0);
  assert.equal(JSON.parse(readFileSync(`${dir}/document.json`, 'utf8')).visualLanguage.theme, undefined);
});

test('a borderline brand colour is accepted but flagged, with a value that would clear it', () => {
  const id = track('zz-borderline-test');
  const result = node(design, ['init', '--id', id, '--canvas', '#f7f1e3', '--ink', '#0b2545', '--accent', '#0b725f', '--emphasis', '#e4572e']);
  assert.equal(result.status, 0, 'the orange clears the canvas, so it is accepted');
  assert.match(result.stdout, /Chart color 1 is 2\.9\d:1 on the figure surface.*A value that clears it: #[0-9a-f]{6} \(this is the emphasis colour/);
});
