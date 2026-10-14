#!/usr/bin/env node
/**
 * Stage 1 — ingest a source document.
 *
 *   node <skill>/scripts/ingest.mjs \
 *     --source path/to/document.md --draft drafts/<slug> [--target-chars 1100]
 *
 * Writes into the draft directory:
 *   source.md       normalized text, the canonical evidence copy
 *   chunks.json     numbered chunks (c01, c02, …) that never cross a heading
 *   structure.json  detected chapter boundaries + front matter
 *
 * Chunk ids are the evidence vocabulary for the whole pipeline: every later
 * citation is a reference to one of these ids.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { numberOption, parseArgs, requireOption } from './lib/args.mjs';
import { draftFile, writeJson, writeText } from './lib/fs.mjs';
import { cleanTitle, paragraphBlocks, parseSourceStructure, splitFrontMatter, splitSentences, wordCount } from './lib/text.mjs';
import { pad } from './lib/ids.mjs';

const usage = 'Usage: ingest.mjs --source <file> --draft <dir> [--target-chars 1100] [--max-chars 1700]';
const options = parseArgs(process.argv.slice(2), { 'target-chars': '1100', 'max-chars': '1700' });

const source = requireOption(options, 'source', usage);
const draft = requireOption(options, 'draft', usage);
const targetChars = numberOption(options, 'target-chars', 1100);
const maxChars = numberOption(options, 'max-chars', 1700);

/** HTML is a common "existing document"; keep its headings and lists as text. */
function htmlToText(value) {
  return value
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '')
    .replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level, body) => `\n\n${'#'.repeat(Number(level))} ${body.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<(li|tr)[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag, body) => `\n- ${body.replace(/<[^>]+>/g, '').trim()}`)
    .replace(/<\/(p|div|section|ul|ol|table)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+\n/g, '\n');
}

let raw = await readFile(source, 'utf8');
if (/\.html?$/i.test(source)) raw = htmlToText(raw);

const { meta, body } = splitFrontMatter(raw);
const normalized = body.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
if (!normalized) {
  console.error('The source document is empty after normalization.');
  process.exit(1);
}

const parsed = parseSourceStructure(normalized);

// Chunk inside sections: a chunk never crosses a heading, so a citation always
// points at one part of the argument.
const chunks = [];
let ordinal = 0;
parsed.sections.forEach((section, sectionIndex) => {
  let buffer = '';
  const flush = () => {
    const text = buffer.trim();
    buffer = '';
    if (!text) return;
    ordinal += 1;
    chunks.push({
      id: `c${pad(ordinal)}`,
      ordinal,
      sectionIndex,
      heading: section.title,
      text,
      words: wordCount(text),
      location: { heading: section.title },
    });
  };
  for (const block of paragraphBlocks(section.content)) {
    if (block.text.length > maxChars) {
      flush();
      let current = '';
      for (const sentence of splitSentences(block.text)) {
        if (current && current.length + sentence.length + 1 > targetChars) {
          buffer = current;
          flush();
          current = '';
        }
        current = current ? `${current} ${sentence}` : sentence;
      }
      buffer = current;
      flush();
      continue;
    }
    if (buffer && buffer.length + block.text.length + 2 > targetChars) flush();
    buffer = buffer ? `${buffer}\n\n${block.text}` : block.text;
  }
  flush();
  void sectionIndex;
});

const heading = /^#\s+(.+?)\s*$/m.exec(normalized)?.[1];
const title = cleanTitle(meta.title ?? heading ?? basename(source).replace(/\.[a-z0-9]+$/i, ''), 'Untitled source');

const sourcePath = await writeText(draftFile(draft, 'source.md'), `${normalized}\n`);
const chunksPath = await writeJson(draftFile(draft, 'chunks.json'), {
  sourceId: `src-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'source'}`,
  title,
  sourcePath,
  contentHash: `sha256:${createHash('sha256').update(normalized).digest('hex')}`,
  chunkCount: chunks.length,
  wordCount: wordCount(normalized),
  chunks,
});
const structurePath = await writeJson(draftFile(draft, 'structure.json'), {
  title,
  frontMatter: meta,
  hasStructure: parsed.hasStructure,
  sections: parsed.sections.map((section, index) => ({
    index,
    title: cleanTitle(section.title, `Section ${index + 1}`),
    words: wordCount(section.content),
    chunkIds: chunks.filter((chunk) => chunk.sectionIndex === index).map((chunk) => chunk.id),
  })),
});

console.log(`Ingested ${wordCount(normalized).toLocaleString()} words → ${chunks.length} chunks across ${parsed.sections.length} sections.`);
console.log(parsed.hasStructure
  ? 'Structure: the document has explicit headings; they are the default chapter boundaries.'
  : 'Structure: no headings found. Scaffold will cut by length; expect to re-cut the plan yourself.');
for (const path of [sourcePath, chunksPath, structurePath]) console.log(`  ${path}`);
