#!/usr/bin/env node
/**
 * Set up and check the brand a published page carries: a logo and a title.
 *
 *   node scripts/brand.mjs init --title "Acme Research" [--logo assets/logo.svg] [--logo-alt "Acme"]
 *                               [--tagline "…"] [--url https://…] [--footer "…"] [--force]
 *   node scripts/brand.mjs check [--brand <file>]
 *   node scripts/brand.mjs show
 *   node scripts/brand.mjs clear
 *
 * `init` writes ./brand.config.json (in the workspace), after validating
 * everything, and refuses to write something that would later block publishing.
 * Without a brand the published page has no masthead at all.
 */
import { existsSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArgs, workspaceRoot } from './lib/args.mjs';
import { BRAND_FILE, LIMITS, resolveBrand } from './lib/brand.mjs';

const [command = 'show', ...rest] = process.argv.slice(2);
const options = parseArgs(rest);
const target = resolve(workspaceRoot().pathname, BRAND_FILE);

function describe(brand, source) {
  console.log(`Brand (${source}):`);
  if (brand.title) console.log(`  title    ${brand.title}`);
  if (brand.logo) console.log(`  logo     ${relative(process.cwd(), brand.logo.file) || brand.logo.file}  (alt: “${brand.logo.alt}”)`);
  if (brand.tagline) console.log(`  tagline  ${brand.tagline}`);
  if (brand.url) console.log(`  url      ${brand.url}`);
  if (brand.footer) console.log(`  footer   ${brand.footer}`);
}

if (command === 'init') {
  const config = {};
  if (typeof options.title === 'string') config.title = options.title;
  if (typeof options.logo === 'string') config.logo = /^[a-z][a-z0-9+.-]+:/i.test(options.logo) ? options.logo : relative(workspaceRoot().pathname, existsSync(options.logo) ? realpathSync(options.logo) : resolve(options.logo));
  if (typeof options['logo-alt'] === 'string') config.logoAlt = options['logo-alt'];
  if (typeof options.tagline === 'string') config.tagline = options.tagline;
  if (typeof options.url === 'string') config.url = options.url;
  if (typeof options.footer === 'string') config.footer = options.footer;
  if (!Object.keys(config).length) {
    console.error('Give at least --title or --logo. See: brand.mjs --help');
    process.exit(1);
  }
  if (existsSync(target) && !options.force) {
    console.error(`${target} already exists. Pass --force to replace it.`);
    process.exit(1);
  }
  // Validate exactly as publish will, using the flags this file would replace.
  const flags = Object.fromEntries(Object.entries({ 'brand-title': config.title, 'brand-logo': config.logo, 'brand-logo-alt': config.logoAlt, 'brand-tagline': config.tagline, 'brand-url': config.url, 'brand-footer': config.footer }).filter(([, value]) => value !== undefined));
  const { brand, problems } = resolveBrand(flags, { skipFile: true });
  if (problems.length || !brand) {
    console.error('Nothing was written:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Wrote ${target}`);
  describe(brand, 'new');
  console.log('\nEvery preview and publish from this directory now carries it. Override per run with --brand-title / --brand-logo, or --no-brand.');
} else if (command === 'check' || command === 'show') {
  const { brand, source, problems } = resolveBrand(options);
  if (problems.length) {
    console.log('✗ The brand is not valid:');
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exit(1);
  }
  if (!brand) {
    console.log(`No brand is set. Published pages have no masthead.\nSet one with: brand.mjs init --title "Your name" [--logo path/to/logo.svg]`);
    process.exit(0);
  }
  console.log('✓ The brand is valid.');
  describe(brand, source);
} else if (command === 'clear') {
  if (existsSync(target)) { rmSync(target); console.log(`Removed ${target}. Pages will publish without a masthead.`); } else console.log('No brand.config.json to remove.');
} else {
  console.error(`Usage: brand.mjs init --title "…" [--logo file] [--logo-alt "…"] [--tagline "…"] [--url https://…] [--footer "…"] [--force]
       brand.mjs check [--brand file]   brand.mjs show   brand.mjs clear
Limits: title ${LIMITS.title}, tagline ${LIMITS.tagline}, footer ${LIMITS.footer} characters; logo .svg/.png/.jpg/.webp up to ${LIMITS.logoBytes / 1024} KB. Remote logo URLs are not allowed.`);
  process.exit(command === '--help' || command === 'help' ? 0 : 1);
}
