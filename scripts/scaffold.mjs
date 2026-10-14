#!/usr/bin/env node
/**
 * Stage 2 — write plan.json and blocks.json skeletons from the detected structure.
 *
 *   node <skill>/scripts/scaffold.mjs --draft drafts/<slug> [--max-chapters 12]
 *
 * Headings in the source are the default chapter boundaries. This stage only
 * does the arithmetic — merging thin sections, splitting an unstructured
 * document, allocating chunks — and records what it did in `structureNotes`.
 * The editorial fields are left empty on purpose: they are yours to write.
 */
import { numberOption, parseArgs, requireOption } from './lib/args.mjs';
import { draftFile, readJson, writeJson } from './lib/fs.mjs';
import { slugify, uniqueIdentifier } from './lib/ids.mjs';
import { stripSectionPrefix } from './lib/text.mjs';

const usage = 'Usage: scaffold.mjs --draft <dir> [--max-chapters 12] [--min-chapter-words 150]';
const options = parseArgs(process.argv.slice(2), { 'max-chapters': '12', 'min-chapter-words': '150' });
const draft = requireOption(options, 'draft', usage);
const maxChapters = numberOption(options, 'max-chapters', 12);
const minChapterWords = numberOption(options, 'min-chapter-words', 150);

const structure = await readJson(draftFile(draft, 'structure.json'));
const chunks = await readJson(draftFile(draft, 'chunks.json'));
if (!structure || !chunks) {
  console.error('Run ingest.mjs first: structure.json and chunks.json are missing.');
  process.exit(1);
}

const notes = [];
const chunkById = new Map(chunks.chunks.map((chunk) => [chunk.id, chunk]));
const chunkIdsFor = (section) => (section.chunkIds ?? []).filter((id) => chunkById.has(id));
const wordsFor = (ids) => ids.reduce((total, id) => total + (chunkById.get(id)?.words ?? 0), 0);

let sections = structure.sections.map((section) => ({ ...section, chunkIds: chunkIdsFor(section) })).filter((section) => section.chunkIds.length);

// Drop sections that carry no argument: references, thanks, design notes, TOCs.
const boilerplate = /^(references?|bibliography|appendix|acknowledge?ments?|table of contents|further reading|about the author|glossary of terms|thank you|thanks|q&a|questions|timing|timing summary|aesthetic|speaker|credits|footnotes|notes on|slide-by-slide)\b/i;
const isBoilerplate = (section) => boilerplate.test(stripSectionPrefix(section.title));
const dropped = sections.filter(isBoilerplate);
if (dropped.length) {
  sections = sections.filter((section) => !isBoilerplate(section));
  notes.push(`Dropped ${dropped.map((section) => `“${section.title}”`).join(', ')}: scaffolding around the talk, not part of the argument. Restore it if you disagree — the essay is yours.`);
}

// A document with no headings still needs an architecture: cut it by length.
if (!structure.hasStructure || sections.length < 2) {
  const ids = sections.flatMap((section) => section.chunkIds);
  const totalWords = wordsFor(ids);
  const targetChapters = Math.max(4, Math.min(8, Math.round(totalWords / 450) || 4));
  const perChapter = Math.max(1, Math.ceil(ids.length / targetChapters));
  const groups = [];
  for (let index = 0; index < ids.length; index += perChapter) groups.push(ids.slice(index, index + perChapter));
  sections = groups.map((group, index) => ({
    index,
    title: `Section ${index + 1}`,
    chunkIds: group,
    words: wordsFor(group),
  }));
  notes.push('The source has no headings, so the document was cut into even sections by length. Re-cut and re-title them from the argument — this is the real planning work.');
}

// Merge thin sections into a neighbour; they cannot carry a chapter of their own.
let merged = true;
while (merged) {
  merged = false;
  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = sections[index];
    const next = sections[index + 1];
    if (current.words >= minChapterWords) continue;
    // Fold a thin section into its smaller neighbour. A closer absorbs rather
    // than being absorbed, and the earlier title wins — reading order is the
    // argument order.
    const intoPrevious = index > 0 && (sections[index - 1].words <= (next?.words ?? Infinity) || /closing|thank|summary/i.test(next?.title ?? ''));
    const [keep, absorb] = intoPrevious ? [index - 1, index] : [index, index + 1];
    const [earlier, later] = intoPrevious ? [sections[keep], sections[absorb]] : [sections[keep], sections[absorb]];
    notes.push(`Merged “${later.title}” (${later.words} words) ${intoPrevious ? 'into the preceding' : 'with the following section after'} “${earlier.title}”: too thin to stand as a chapter. Check the title still names the argument.`);
    const combined = {
      index: earlier.index,
      title: earlier.title,
      chunkIds: [...earlier.chunkIds, ...later.chunkIds],
      words: earlier.words + later.words,
    };
    sections = [...sections.slice(0, keep), combined, ...sections.slice(absorb + 1)];
    merged = true;
    break;
  }
}

// Merge the shortest adjacent pair until the plan fits the reading budget.
while (sections.length > maxChapters) {
  let shortest = 0;
  let smallest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < sections.length - 1; index += 1) {
    const size = sections[index].words + sections[index + 1].words;
    if (size < smallest) { smallest = size; shortest = index; }
  }
  const [current, next] = [sections[shortest], sections[shortest + 1]];
  notes.push(`Merged “${current.title}” and “${next.title}” to fit ${maxChapters} chapters. Check whether they are really one argument.`);
  const combined = { index: current.index, title: current.title, chunkIds: [...current.chunkIds, ...next.chunkIds], words: current.words + next.words };
  sections = [...sections.slice(0, shortest), combined, ...sections.slice(shortest + 2)];
}

const taken = new Set();
const chapters = sections.map((section, index) => {
  const base = slugify(section.title, `chapter-${index + 1}`).split('-').slice(0, 5).join('-');
  const id = uniqueIdentifier(base || `chapter-${index + 1}`, taken);
  taken.add(id);
  return {
    id,
    // A heading is a label, not a title. Leave it blank when it came from "Section 3".
    title: /^section \d+$/i.test(section.title) ? '' : stripSectionPrefix(section.title),
    purpose: '',
    thesis: '',
    sourceChunkIds: section.chunkIds,
    sourceSections: [section.title],
    estimatedWords: Math.round(section.words * 0.6),
  };
});

const planPath = await writeJson(draftFile(draft, 'plan.json'), {
  documentId: slugify(structure.title, 'document'),
  workingTitle: structure.title,
  centralThesis: '',
  narrativeArc: '',
  sourceWordCount: chunks.wordCount,
  structureNotes: notes,
  chapters,
});

const blocksPath = await writeJson(draftFile(draft, 'blocks.json'), {
  chapters: chapters.map((chapter) => ({ id: chapter.id, blocks: [] })),
});

console.log(`Scaffolded ${chapters.length} chapters from ${structure.sections.length} sections (${chunks.chunkCount} chunks).`);
if (notes.length) {
  console.log('\nStructural decisions to review in plan.json → structureNotes:');
  for (const note of notes) console.log(`  - ${note}`);
}
console.log('\nNext: fill plan.json (centralThesis, narrativeArc, each chapter’s title/purpose/thesis),');
console.log('then write blocks.json. See references/house-style.md and references/block-contracts.md.');
console.log(`  ${planPath}`);
console.log(`  ${blocksPath}`);
