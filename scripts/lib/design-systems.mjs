/**
 * Finding and checking design systems, shared by design.mjs, compose.mjs and
 * preview.mjs. The rules live in the vendored contract (vendor/engine.mjs);
 * this only locates files and calls it.
 *
 * A user's design systems live in <workspace>/design-systems/<id>.json.
 * Worked examples ship with the skill under examples/design-systems/.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { skillRoot, workspaceRoot } from './args.mjs';
import { engine } from './engine.mjs';

export const BASELINE_ID = 'fieldnotes-light';

export const systemsDir = `${workspaceRoot().pathname}design-systems`;
export const examplesDir = `${skillRoot().pathname}examples/design-systems`;

const load = (argument) => (argument === 'baseline' ? engine.designBaseline().system : JSON.parse(readFileSync(argument, 'utf8')));

/**
 * baseline | fonts | check <file> | complete <file> | css <file|baseline>
 * Returns the parsed result, or throws with a message fit to show.
 */
export function runDesignTool(command, argument) {
  if (command === 'baseline') return engine.designBaseline();
  if (command === 'fonts') return engine.designFonts();
  let value;
  try {
    value = load(argument);
  } catch (error) {
    if (command === 'check') return { ok: false, issues: [{ path: '$', message: `Could not read ${argument}: ${error.message}` }], advisories: [] };
    throw new Error(`Could not read ${argument}: ${error.message}`);
  }
  if (command === 'check') return engine.designCheck(value);
  if (command === 'complete') return engine.designComplete(value);
  if (command === 'css') return engine.designCss(value);
  throw new Error(`Unknown design command “${command}”.`);
}

/** { id, path, where } for a design system id, or null. `path` is 'baseline' for the baseline. */
export function locateDesignSystem(id) {
  if (id === BASELINE_ID) return { id, path: 'baseline', where: 'baseline' };
  const own = `${systemsDir}/${id}.json`;
  if (existsSync(own)) return { id, path: own, where: 'design-systems' };
  const example = `${examplesDir}/${id}.json`;
  if (existsSync(example)) return { id, path: example, where: 'skill example' };
  return null;
}

export function knownDesignSystems() {
  const read = (dir, where) => (existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.json')).map((file) => ({ id: file.replace(/\.json$/, ''), path: `${dir}/${file}`, where })) : []);
  return [{ id: BASELINE_ID, path: 'baseline', where: 'baseline' }, ...read(systemsDir, 'design-systems'), ...read(examplesDir, 'skill example')];
}

/**
 * The design system to embed in a document, or null for the baseline.
 * Throws a readable error when the id is unknown or the system is invalid, so
 * compose stops instead of producing something the renderer would reject.
 */
export function resolveDesignSystem(id) {
  const found = locateDesignSystem(id);
  if (!found) throw new Error(`No design system “${id}”. Known: ${knownDesignSystems().map((entry) => entry.id).join(', ')}. Create one with design.mjs init.`);
  if (found.path === 'baseline') return null;
  const result = runDesignTool('check', found.path);
  if (!result.ok) throw new Error(`Design system “${id}” is invalid:\n${result.issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n')}`);
  if (result.isBaseline) return null;
  const system = JSON.parse(readFileSync(found.path, 'utf8'));
  return { system, advisories: result.advisories };
}
