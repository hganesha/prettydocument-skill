import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Minimal flag parsing: `--key value`, `--key=value`, `--flag`. */
export function parseArgs(argv, defaults = {}) {
  const options = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const body = token.slice(2);
    const equals = body.indexOf('=');
    if (equals >= 0) {
      options[body.slice(0, equals)] = body.slice(equals + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[body] = next;
      index += 1;
    } else {
      options[body] = true;
    }
  }
  return options;
}

export function requireOption(options, name, usage) {
  const value = options[name];
  if (typeof value !== 'string' || !value.trim()) {
    console.error(`Missing --${name}. ${usage}`);
    process.exit(1);
  }
  return value.trim();
}

export function numberOption(options, name, fallback) {
  const value = Number(options[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Where the user's own files live: drafts/, design-systems/, brand.config.json, out/.
 * The directory the command is run from, unless PRETTYDOCUMENT_HOME says otherwise.
 * The skill's own files (scripts, references, vendor/) never move with it.
 */
export function workspaceRoot() {
  const dir = resolve(process.env.PRETTYDOCUMENT_HOME || process.cwd());
  // Real path, so a symlinked home (macOS /var -> /private/var) compares equal to process.cwd().
  let real = dir;
  try { real = realpathSync(dir); } catch { /* not created yet */ }
  return pathToFileURL(`${real}/`);
}

export function skillRoot() {
  // scripts/lib/args.mjs -> ../../ is the skill directory
  return new URL('../../', import.meta.url);
}

export function scriptsDir() {
  return new URL('../', import.meta.url);
}

/** Absolute path of a sibling script, for the "next step" lines the scripts print. */
export function scriptPath(name) {
  return new URL(name, scriptsDir()).pathname;
}
