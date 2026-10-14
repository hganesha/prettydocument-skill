/**
 * Branding and standalone publishing: the page is the essay, plus only the
 * masthead an author asked for, and nothing from the host repository.
 *
 *   npm test
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const skill = fileURLToPath(new URL('..', import.meta.url));
const workspace = mkdtempSync(`${tmpdir()}/pd-brand-`);
after(() => rmSync(workspace, { recursive: true, force: true }));

const run = (script, args) => spawnSync(process.execPath, [`${skill}scripts/${script}.mjs`, ...args], { encoding: 'utf8', cwd: workspace, env: { ...process.env, PRETTYDOCUMENT_HOME: workspace } });

mkdirSync(`${workspace}/assets`, { recursive: true });
writeFileSync(`${workspace}/assets/logo.svg`, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#0b5fff"/></svg>');
writeFileSync(`${workspace}/assets/evil.svg`, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
writeFileSync(`${workspace}/assets/handler.svg`, '<svg xmlns="http://www.w3.org/2000/svg"><rect onload="x()" width="1" height="1"/></svg>');
writeFileSync(`${workspace}/assets/external.svg`, '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/t.png"/></svg>');
writeFileSync(`${workspace}/assets/fake.png`, 'not a png');

cpSync(`${skill}examples/discernment-frame`, `${workspace}/drafts/essay`, { recursive: true });
for (const file of ['document.json', 'report.md', 'essay.md', 'README.md']) rmSync(`${workspace}/drafts/essay/${file}`, { force: true });
assert.equal(run('compose', ['--draft', 'drafts/essay', '--title', 'The discernment frame']).status, 0);

const publish = (...extra) => run('publish', ['--draft', 'drafts/essay', '--slug', 'essay', ...extra]);
const page = () => readFileSync(`${workspace}/out/essay/index.html`, 'utf8');

test('with no brand the page has no masthead and no catalog link', () => {
  const result = publish();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const html = page();
  assert.equal(html.includes('pd-masthead"'), false);
  assert.equal(/all (notes|essays)/i.test(html), false);
  assert.equal(/field ?notes/i.test(html.replace(/fieldnotes-(light|editorial)/gi, '')), false, 'no FieldNotes wording should reach the page');
  assert.match(html, /<h1 class="pd-title">The discernment frame<\/h1>/);
});

test('the output is one self-contained page, with the document beside it', () => {
  assert.equal(publish().status, 0);
  for (const file of ['index.html', 'document.json', 'essay.md']) assert.ok(existsSync(`${workspace}/out/essay/${file}`), file);
  assert.equal(existsSync(`${workspace}/out/essay/release.json`), false, 'the release envelope is opt-in');
  assert.equal(/<link[^>]+href="(?!https:\/\/fonts\.googleapis\.com)/.test(page()), false, 'only fonts may be fetched');
  assert.equal(/<script/i.test(page()), false, 'the page runs no script');
  assert.equal(publish('--format', 'release').status, 0);
  assert.equal(JSON.parse(readFileSync(`${workspace}/out/essay/release.json`, 'utf8')).slug, 'essay');
});

test('flags brand the page with a title and an embedded logo', () => {
  const result = publish('--brand-title', 'Acme Research', '--brand-logo', 'assets/logo.svg', '--brand-url', 'https://acme.example', '--brand-tagline', 'Notes from the field', '--brand-footer', '© Acme');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const html = page();
  assert.match(html, /<title>The discernment frame · Acme Research<\/title>/);
  assert.match(html, /<a class="pd-brand" href="https:\/\/acme\.example"[^>]*><img src="data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+" alt="">/, 'the logo is decorative beside a visible title');
  assert.match(html, /<span class="pd-brand-title">Acme Research<\/span>/);
  assert.match(html, /<p class="pd-tagline">Notes from the field<\/p>/);
  assert.match(html, /<footer class="pd-footer">© Acme<\/footer>/);
});

test('brand.mjs init writes a config that every later publish picks up, and --no-brand overrides it', () => {
  assert.equal(run('brand', ['init', '--title', 'Config Co', '--logo', 'assets/logo.svg']).status, 0);
  assert.equal(JSON.parse(readFileSync(`${workspace}/brand.config.json`, 'utf8')).logo, 'assets/logo.svg');
  assert.equal(publish().status, 0);
  assert.match(page(), /Config Co/);
  assert.equal(publish('--no-brand').status, 0);
  assert.equal(page().includes('Config Co'), false);
  assert.equal(run('brand', ['clear']).status, 0);
  assert.equal(existsSync(`${workspace}/brand.config.json`), false);
});

test('a logo with nothing but its image carries alt text', () => {
  assert.notEqual(run('brand', ['init', '--logo', 'assets/logo.svg']).status, 0, 'a logo-only brand needs logoAlt');
  const result = publish('--brand-logo', 'assets/logo.svg', '--brand-logo-alt', 'Acme');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(page(), /<img src="data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+" alt="Acme">/);
});

test('hostile or invalid logos and brands are refused, and nothing is published', () => {
  const cases = [
    [['--brand-title', 'A', '--brand-logo', 'assets/evil.svg'], /<script>/],
    [['--brand-title', 'A', '--brand-logo', 'assets/handler.svg'], /event-handler/],
    [['--brand-title', 'A', '--brand-logo', 'assets/external.svg'], /external file or URL/],
    [['--brand-title', 'A', '--brand-logo', 'assets/fake.png'], /not really a png/],
    [['--brand-title', 'A', '--brand-logo', 'assets/missing.svg'], /not found/],
    [['--brand-title', 'A', '--brand-logo', 'https://evil.example/logo.png'], /is a URL/],
    [['--brand-title', 'A', '--brand-url', 'javascript:alert(1)'], /absolute http\(s\) URL/],
    [['--brand-title', 'x'.repeat(80)], /limit is 60/],
  ];
  rmSync(`${workspace}/out`, { recursive: true, force: true });
  for (const [args, message] of cases) {
    const result = publish(...args);
    assert.notEqual(result.status, 0, args.join(' '));
    assert.match(result.stderr, message, args.join(' '));
  }
  assert.equal(existsSync(`${workspace}/out`), false, 'a refused brand must not leave a page behind');
});

test('a brand title is escaped, not interpreted', () => {
  assert.equal(publish('--brand-title', '<img src=x onerror=alert(1)>').status, 0);
  assert.equal(page().includes('<img src=x'), false);
  assert.match(page(), /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('publishing stops on an invalid document unless forced', () => {
  const dir = `${workspace}/drafts/broken`;
  cpSync(`${workspace}/drafts/essay`, dir, { recursive: true });
  const document = JSON.parse(readFileSync(`${dir}/document.json`, 'utf8'));
  document.chapters = [];
  writeFileSync(`${dir}/document.json`, JSON.stringify(document));
  const result = run('publish', ['--draft', 'drafts/broken', '--slug', 'broken']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Validation failed/);
});

test('running the skill writes nothing inside the skill directory', () => {
  for (const name of ['drafts', 'out', 'design-systems', 'brand.config.json']) assert.equal(existsSync(`${skill}${name}`), false, `${name} must live in the workspace`);
});
