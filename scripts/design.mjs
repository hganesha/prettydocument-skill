#!/usr/bin/env node
/**
 * Choose, create and check a design system: the colors and fonts an essay is
 * drawn with. The baseline (`fieldnotes-light`) is used unless one is chosen.
 *
 *   node scripts/design.mjs list
 *   node scripts/design.mjs fonts [--role body]
 *   node scripts/design.mjs show <id>
 *   node scripts/design.mjs check <id>
 *   node scripts/design.mjs init --id acme --label "Acme" \
 *       [--from fieldnotes-light] [--canvas #fbfaf7] [--surface #…] [--ink #…] [--muted #…] \
 *       [--line #…] [--accent #…] [--emphasis #…] [--chart "#…,#…,#…,#…,#…,#…"] \
 *       [--font-display fraunces] [--font-body source-serif-4] [--font-ui inter] [--font-mono jetbrains-mono] [--force]
 *
 * What init derives for you, so a brand only has to supply what it has:
 *   - Change --canvas or --ink and the surface, muted text and rule colours are
 *     derived from them (unless you pass them), so they sit properly on your page.
 *   - Change any colour without --chart and a six-colour chart palette is derived.
 *   - Give --font-body and no --font-display, and headings use the body font.
 *   - A colour that fails contrast is refused with a suggested value that passes.
 *   - --force replaces an existing system, or keeps an invalid one so you can edit it.
 *
 * A design system is a closed set of semantic tokens, not CSS. Colors are
 * #rrggbb and must clear contrast floors against the canvas; fonts are ids from
 * the approved registry. Everything is validated by the repository contract,
 * through design-tool.ts, so this script never restates a rule.
 *
 * Design systems live in design-systems/<id>.json in your workspace. Worked examples
 * ship with the skill under examples/design-systems/.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { parseArgs, scriptPath, workspaceRoot } from './lib/args.mjs';
import { BASELINE_ID, knownDesignSystems as known, locateDesignSystem as locate, runDesignTool, systemsDir } from './lib/design-systems.mjs';

const root = workspaceRoot().pathname;
const COLOR_FLAGS = ['canvas', 'surface', 'ink', 'muted', 'line', 'accent', 'emphasis'];
const FONT_FLAGS = ['display', 'body', 'ui', 'mono'];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function tool(...args) {
  try { return runDesignTool(...args); } catch (error) { console.error(error.message); process.exit(2); }
}

function need(id) {
  const found = id && locate(id);
  if (!found) {
    console.error(`${id ? `No design system “${id}”.` : 'Name a design system.'} Known: ${known().map((entry) => entry.id).join(', ')}.`);
    process.exit(1);
  }
  return found;
}

function report(id, result) {
  if (!result.ok) {
    console.log(`✗ ${id} is not a valid design system:`);
    for (const issue of result.issues) console.log(`  - ${issue.path}: ${issue.message}`);
    for (const fix of result.suggestions ?? []) console.log(`  → ${fix.role}: ${fix.from} will not read; ${fix.to} is the nearest value of the same hue that does.`);
    return;
  }
  console.log(`✓ ${id} is valid.${result.isBaseline ? ' (Identical to the baseline.)' : ''}`);
  console.log('\n  Contrast (WCAG ratio; hard floors: ink 4.5, muted/accent/emphasis/chart 3, line 1.1):');
  for (const row of result.contrast) console.log(`    ${row.foreground.padEnd(8)} on ${row.background.padEnd(8)} ${String(row.ratio).padStart(5)}:1   ${row.use}`);
  console.log(`\n  Chart palette${result.chartDerived ? ' (derived from your colors)' : ''}: ${result.chart.map((entry) => `${entry.color} ${entry.ratioOnCanvas}:1`).join('  ')}`);
  console.log(`  Fonts to load: ${result.fontStylesheet ? result.fontStylesheet : 'none (system fonts)'}`);
  if (result.advisories.length) {
    console.log('\n  Advisories (not blocking):');
    for (const line of result.advisories) console.log(`    ! ${line}`);
  }
}

const [command, ...rest] = process.argv.slice(2);
const options = parseArgs(rest);
const positional = rest.filter((token) => !token.startsWith('--'))[0];

if (command === 'list') {
  console.log('Design systems (the baseline is used unless one is chosen):\n');
  for (const entry of known()) {
    const result = entry.path === 'baseline' ? { ok: true } : tool('check', entry.path);
    const label = entry.path === 'baseline' ? 'Baseline' : JSON.parse(readFileSync(entry.path, 'utf8')).label ?? '';
    console.log(`  ${entry.id.padEnd(22)} ${String(label).padEnd(22)} ${entry.where.padEnd(24)} ${result.ok ? 'valid' : 'INVALID'}`);
  }
} else if (command === 'fonts') {
  const role = typeof options.role === 'string' ? options.role : null;
  const fonts = tool('fonts').filter((font) => !role || font.roles.includes(role));
  console.log(`Approved fonts${role ? ` for the ${role} role` : ''}. A design system can choose only these; the list is fixed by the publication contract.\n`);
  for (const font of fonts) console.log(`  ${font.id.padEnd(18)} ${font.label.padEnd(26)} ${font.category.padEnd(6)} ${font.roles.join(', ').padEnd(24)} ${font.source === 'system' ? 'system' : 'Google Fonts'}`);
} else if (command === 'show' || command === 'check') {
  const found = need(positional);
  const result = tool('check', found.path);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else {
    if (found.path === 'baseline') {
      const baseline = tool('baseline');
      console.log('The baseline. Documents use it unless a design system is chosen.\n');
      for (const [role, use] of Object.entries(baseline.colorUse)) console.log(`  ${role.padEnd(9)} ${baseline.system.tokens.colors[role]}   ${use}`);
      console.log('');
      for (const [role, use] of Object.entries(baseline.fontUse)) console.log(`  ${role.padEnd(9)} ${baseline.system.tokens.fonts[role].padEnd(14)} ${use}`);
      console.log('');
    }
    report(found.id, result);
  }
  process.exit(result.ok ? 0 : 1);
} else if (command === 'init') {
  const id = options.id;
  if (typeof id !== 'string' || !ID.test(id)) { console.error('Give --id as lowercase words and hyphens, e.g. --id acme-brand.'); process.exit(1); }
  if (id === BASELINE_ID) { console.error(`${BASELINE_ID} is the baseline and cannot be redefined. Choose another id.`); process.exit(1); }
  const target = `${systemsDir}/${id}.json`;
  if (existsSync(target) && !options.force) { console.error(`${target} already exists. Pass --force to replace it, or choose another --id.`); process.exit(1); }

  const from = need(typeof options.from === 'string' ? options.from : BASELINE_ID);
  const source = from.path === 'baseline' ? tool('baseline').system : JSON.parse(readFileSync(from.path, 'utf8'));
  const tokens = JSON.parse(JSON.stringify(source.tokens));
  let colorsChanged = false;
  for (const role of COLOR_FLAGS) if (typeof options[role] === 'string') { tokens.colors[role] = options[role].trim(); colorsChanged = true; }
  for (const role of FONT_FLAGS) if (typeof options[`font-${role}`] === 'string') tokens.fonts[role] = options[`font-${role}`].trim();
  // A new canvas or ink means the old surface, muted and rule colours no longer sit on it: derive them.
  if (typeof options.canvas === 'string' || typeof options.ink === 'string') {
    for (const role of ['surface', 'muted', 'line']) if (typeof options[role] !== 'string') delete tokens.colors[role];
  }
  // Headings follow the body font unless a display font was chosen.
  if (typeof options['font-body'] === 'string' && typeof options['font-display'] !== 'string') tokens.fonts.display = tokens.fonts.body;
  if (typeof options.chart === 'string') tokens.chart = options.chart.split(',').map((color) => color.trim());
  else if (colorsChanged) delete tokens.chart; // derived below, from the new colors
  const system = { id, label: typeof options.label === 'string' ? options.label.trim() : id, tokens };

  mkdirSync(systemsDir, { recursive: true });
  writeFileSync(target, `${JSON.stringify(system, null, 2)}\n`);
  const completed = tool('complete', target);
  writeFileSync(target, `${JSON.stringify(completed, null, 2)}\n`);
  const result = tool('check', target);
  report(id, result);
  if (!result.ok && !options.force) {
    rmSync(target);
    console.error('\nNothing was written. Fix the values above, or pass --force to keep an invalid system for editing.');
    process.exit(1);
  }
  console.log(`\nWrote ${target.replace(root, '')}.\nUse it:  node ${scriptPath('compose.mjs')} --draft drafts/<slug> --title "…" --design-system ${id}`);
  process.exit(result.ok ? 0 : 1);
} else {
  console.error('Usage: design.mjs list | fonts [--role r] | show <id> | check <id>\n       design.mjs init --id <id> [--label …] [--from <id>] [--canvas|--surface|--ink|--muted|--line|--accent|--emphasis #rrggbb] [--chart "#…,×6"] [--font-display|--font-body|--font-ui|--font-mono <id>] [--force]');
  process.exit(1);
}
