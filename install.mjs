#!/usr/bin/env node
/**
 * Installs the skill where your coding agents look for it.
 *
 *   node install.mjs                      into ./.claude/skills and ./.codex/skills (this project)
 *   node install.mjs --global             into ~/.claude/skills and ~/.codex/skills (every project)
 *   node install.mjs --claude | --codex   only one agent
 *   node install.mjs --target <dir>       any directory a SKILL.md agent reads, e.g. ~/.agents/skills
 *   node install.mjs --copy               copy instead of symlinking (use when you will delete this checkout)
 *   node install.mjs --uninstall          remove what this script installed
 *
 * The skill is a directory with a SKILL.md. Claude Code and Codex both read
 * that format. A symlink keeps one copy up to date; a copy is self-contained.
 */
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const NAME = 'prettydocument';
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const at = args.indexOf(`--${name}`); return at >= 0 ? args[at + 1] : undefined; };

if (!existsSync(join(here, 'SKILL.md')) || !existsSync(join(here, 'vendor/engine.mjs'))) {
  console.error('This directory is missing SKILL.md or vendor/engine.mjs. Download a complete release of the skill and run install.mjs from it.');
  process.exit(1);
}

const base = flag('global') ? homedir() : process.cwd();
const targets = [];
if (value('target')) targets.push(resolve(value('target'), NAME));
else {
  if (!flag('codex')) targets.push(join(base, '.claude/skills', NAME));
  if (!flag('claude')) targets.push(join(base, '.codex/skills', NAME));
}

const ours = (target) => {
  try { return lstatSync(target).isSymbolicLink() ? resolve(dirname(target), readlinkSync(target)) === here : readFileSync(join(target, '.prettydocument-install'), 'utf8').trim() === 'prettydocument-skill'; } catch { return false; }
};

let failed = false;
for (const target of targets) {
  try {
    const existing = lstatSync(target, { throwIfNoEntry: false });
    if (flag('uninstall')) {
      if (!existing) console.log(`absent     ${target}`);
      else if (ours(target)) { rmSync(target, { recursive: true, force: true }); console.log(`removed    ${target}`); }
      else console.log(`skipped    ${target} (not installed by this script)`);
      continue;
    }
    if (existing && !ours(target)) { console.error(`skipped    ${target} already exists and was not installed by this script. Remove it first.`); failed = true; continue; }
    if (existing) rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    if (!flag('copy')) {
      try { symlinkSync(relative(dirname(target), here), target, 'dir'); console.log(`linked     ${target}`); continue; } catch { /* fall through to a copy */ }
    }
    cpSync(here, target, { recursive: true, filter: (path) => !/(^|\/)(\.git|node_modules|drafts|out)(\/|$)/.test(relative(here, path)) });
    writeMarker(target);
    console.log(`copied     ${target}`);
  } catch (error) {
    failed = true;
    console.error(`failed     ${target}: ${error.message}`);
  }
}

function writeMarker(target) {
  writeFileSync(join(target, '.prettydocument-install'), 'prettydocument-skill\n');
}

if (!flag('uninstall') && !failed) {
  console.log(`\nInstalled as “${NAME}”. In your agent, ask: “Turn report.md into a visual essay with my logo.”`);
  console.log('Work in any folder you like: drafts/, design-systems/, brand.config.json and out/ are created there, not in the skill.');
}
process.exit(failed ? 1 : 0);
