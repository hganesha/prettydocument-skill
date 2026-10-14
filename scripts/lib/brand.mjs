/**
 * Branding for the published page: the logo and title in the masthead.
 *
 * Branding is a publish-time choice, like the design system. It is never part
 * of the document, so the same document.json can be published under any brand
 * (or none). By default there is no brand and no masthead at all: the page is
 * the essay and nothing else.
 *
 * Sources, strongest first:
 *   1. flags      --brand-title --brand-logo --brand-url --brand-tagline   (--no-brand turns it off)
 *   2. a file     --brand <file>, else ./brand.config.json in the workspace
 *
 *   {
 *     "title": "Acme Research",
 *     "logo": "assets/acme-logo.svg",     // svg, png, jpg or webp, relative to this file
 *     "logoAlt": "Acme",                  // optional; defaults to the title
 *     "tagline": "Notes from the field",  // optional, shown beside the title
 *     "url": "https://acme.example",      // optional; the masthead links here
 *     "footer": "© Acme 2026"             // optional, plain text
 *   }
 *
 * The logo is embedded in the page as a data URI inside an <img>, so a page
 * never makes a request for it and an SVG cannot run script. Anything that
 * could still be hostile in an SVG is refused up front rather than cleaned.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { workspaceRoot } from './args.mjs';

export const BRAND_FILE = 'brand.config.json';
export const LIMITS = { title: 60, tagline: 120, footer: 160, alt: 120, logoBytes: 256 * 1024 };

const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const KEYS = new Set(['title', 'logo', 'logoAlt', 'tagline', 'url', 'footer']);

/** Problems with an SVG that make it unsafe to embed. Returns a list of reasons; empty means acceptable. */
export function svgProblems(source) {
  const problems = [];
  if (!/<svg[\s>]/i.test(source)) problems.push('it is not an SVG document');
  if (/<\s*script/i.test(source)) problems.push('it contains a <script>');
  if (/<\s*foreignObject/i.test(source)) problems.push('it contains <foreignObject>');
  if (/<\s*(iframe|embed|object|audio|video|link|meta|animate|set)\b/i.test(source)) problems.push('it contains an element that can load or script content');
  if (/\son[a-z]+\s*=/i.test(source)) problems.push('it has an event-handler attribute');
  if (/javascript:/i.test(source)) problems.push('it contains a javascript: URL');
  if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(source)) problems.push('it declares XML entities');
  if (/(?:href|src)\s*=\s*["']\s*(?!#|data:image\/(?:png|jpe?g|webp);)/i.test(source)) problems.push('it references an external file or URL (only #fragments are allowed)');
  if (/url\(\s*["']?\s*(?!#)/i.test(source)) problems.push('it uses url() to something other than a #fragment');
  if (/@import/i.test(source)) problems.push('it uses @import');
  return problems;
}

function allowedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Loads and checks a logo file. Returns { dataUri, bytes, type } or throws with a message fit to show. */
export function readLogo(file) {
  const type = MIME[extname(file).toLowerCase()];
  if (!type) throw new Error(`Logo “${file}” must be .svg, .png, .jpg or .webp.`);
  if (!existsSync(file)) throw new Error(`Logo file not found: ${file}`);
  const size = statSync(file).size;
  if (size > LIMITS.logoBytes) throw new Error(`Logo is ${Math.round(size / 1024)} KB; the limit is ${LIMITS.logoBytes / 1024} KB. Export a smaller image.`);
  const bytes = readFileSync(file);
  if (type === 'image/svg+xml') {
    const problems = svgProblems(bytes.toString('utf8'));
    if (problems.length) throw new Error(`Logo SVG was refused because ${problems.join('; ')}. Export a plain SVG with paths and shapes only.`);
  } else {
    const head = bytes.subarray(0, 12);
    const ok = type === 'image/png' ? head[0] === 0x89 && head[1] === 0x50
      : type === 'image/jpeg' ? head[0] === 0xff && head[1] === 0xd8
        : head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
    if (!ok) throw new Error(`Logo “${file}” is not really a ${type.split('/')[1]} file.`);
  }
  return { dataUri: `data:${type};base64,${bytes.toString('base64')}`, bytes: size, type };
}

/**
 * The brand to publish under, or null for none.
 * Returns { brand, source, problems }: `brand` is null when there is no brand or
 * when problems stop it from being valid. Callers decide whether problems are fatal.
 */
export function resolveBrand(options = {}, { workspace = workspaceRoot().pathname, skipFile = false } = {}) {
  if (options['no-brand']) return { brand: null, source: 'disabled', problems: [] };
  const problems = [];
  let raw = {};
  let base = workspace;
  let source = 'none';

  const filePath = typeof options.brand === 'string' ? resolve(options.brand) : resolve(workspace, BRAND_FILE);
  if (skipFile) {
    // flags only (brand.mjs init validates what it is about to write)
  } else if (existsSync(filePath)) {
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf8'));
      base = dirname(filePath);
      source = filePath;
    } catch (error) {
      problems.push(`${filePath} is not valid JSON: ${error.message}`);
    }
  } else if (typeof options.brand === 'string') {
    problems.push(`Brand file not found: ${filePath}`);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push(`${filePath} must contain a JSON object.`);
    raw = {};
  }
  for (const key of Object.keys(raw)) if (!KEYS.has(key)) problems.push(`Unknown brand setting “${key}”. Allowed: ${[...KEYS].join(', ')}.`);

  const remote = (value) => typeof value === 'string' && /^[a-z][a-z0-9+.-]+:/i.test(value);
  for (const value of [options['brand-logo'], raw.logo]) {
    if (remote(value)) problems.push(`Logo “${value}” is a URL. Logos are embedded in the page, so download the file and give its path.`);
  }
  const flag = (name) => (typeof options[name] === 'string' ? options[name] : undefined);
  const merged = {
    title: flag('brand-title') ?? raw.title,
    logo: remote(flag('brand-logo')) || remote(raw.logo) ? undefined : flag('brand-logo') !== undefined ? resolve(flag('brand-logo')) : raw.logo !== undefined && typeof raw.logo === 'string' ? (isAbsolute(raw.logo) ? raw.logo : resolve(base, raw.logo)) : undefined,
    logoAlt: flag('brand-logo-alt') ?? raw.logoAlt,
    tagline: flag('brand-tagline') ?? raw.tagline,
    url: flag('brand-url') ?? raw.url,
    footer: flag('brand-footer') ?? raw.footer,
  };
  if (['brand-title', 'brand-logo', 'brand-url', 'brand-tagline', 'brand-footer', 'brand-logo-alt'].some((name) => options[name] !== undefined)) source = source === 'none' ? 'flags' : `${source} + flags`;

  if (Object.values(merged).every((value) => value === undefined)) return { brand: null, source: 'none', problems };

  const text = (name, limit) => {
    const value = merged[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim()) { problems.push(`${name} must be a non-empty string.`); return undefined; }
    if (value.trim().length > limit) problems.push(`${name} is ${value.trim().length} characters; the limit is ${limit}.`);
    return value.trim();
  };
  const brand = {
    title: text('title', LIMITS.title),
    tagline: text('tagline', LIMITS.tagline),
    footer: text('footer', LIMITS.footer),
    logoAlt: text('logoAlt', LIMITS.alt),
  };
  if (merged.url !== undefined) {
    if (typeof merged.url !== 'string' || !allowedUrl(merged.url)) problems.push('url must be an absolute http(s) URL.');
    else brand.url = merged.url;
  }
  if (merged.logo !== undefined) {
    try {
      const logo = readLogo(merged.logo);
      brand.logo = { dataUri: logo.dataUri, alt: brand.logoAlt ?? brand.title ?? '', file: merged.logo };
    } catch (error) {
      problems.push(error.message);
    }
  }
  if (!brand.title && !brand.logo) problems.push('A brand needs a title or a logo.');
  if (brand.logo && !brand.logo.alt) problems.push('A logo without a title needs logoAlt (--brand-logo-alt): it is the only name the brand has for a screen reader.');
  delete brand.logoAlt;
  return { brand: problems.length ? null : brand, source, problems };
}
