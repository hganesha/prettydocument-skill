#!/usr/bin/env node
/**
 * Prints what the component catalog snapshot in registry/authoring-registry.json
 * contains.
 *
 *   node scripts/registry.mjs [--print]
 *
 * The snapshot is generated from the publication contract when the skill is
 * released (CONTRIBUTING.md), so casting rules always match the vendored
 * renderer. It is not regenerated here.
 */
import { readFile } from 'node:fs/promises';
import { parseArgs, skillRoot } from './lib/args.mjs';
import { readJson } from './lib/fs.mjs';

const options = parseArgs(process.argv.slice(2));
const registryPath = new URL('registry/authoring-registry.json', skillRoot());
const registry = await readJson(registryPath);
console.log(`${registry.templates.length} templates, ${registry.primitives.length} primitives, ${registry.charts.length} charts, ${registry.icons.length} glyphs (snapshot from ${registry.generatedAt}).`);
if (options.print) console.log(await readFile(registryPath, 'utf8'));
