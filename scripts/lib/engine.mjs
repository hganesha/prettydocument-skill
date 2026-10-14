/**
 * The vendored validator, design-system tools and renderer.
 *
 * vendor/engine.mjs is built from the FieldNotes contracts and renderer packages
 * (see CONTRIBUTING.md) and bundles React, so nothing needs installing: this
 * is a plain ES module that Node loads directly.
 */
import { existsSync } from 'node:fs';
import { skillRoot } from './args.mjs';

const path = new URL('vendor/engine.mjs', skillRoot());
if (!existsSync(path)) {
  console.error('vendor/engine.mjs is missing. Re-download the skill: the vendor directory is part of the release.');
  process.exit(1);
}

export const engine = await import(path.href);
