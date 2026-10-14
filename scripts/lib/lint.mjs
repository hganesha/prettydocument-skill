/**
 * Editorial lint for a composed document.
 *
 * These are the rules the repository's contract does not — and should not —
 * own: reading budgets, casting repetition, prose length, and evidence
 * coverage. Contract failures are reported separately by validate.mjs.
 */
import { wordCount } from './text.mjs';
import { fitWarnings } from './figure-fit.mjs';

const FIGURE_KINDS = new Set(['site-component', 'visual', 'data-visualization', 'concept-model']);
// Prose a reader will take in one go before they want something to look at.
const MAX_PROSE_RUN_WORDS = 350;
const DESERT_CHAPTERS = 3;

const PLACEHOLDER_TITLE = /^(section|chapter|part)\s*\d+$/i;

export function lint({ document, plan, blocks, chunks, registry, layouts = null }) {
  const errors = [];
  const warnings = [];
  const chunkIds = new Set((chunks?.chunks ?? []).map((chunk) => chunk.id));
  const cited = new Set();
  const planById = new Map((plan?.chapters ?? []).map((chapter) => [chapter.id, chapter]));
  const templateById = new Map(registry.templates.map((template) => [template.id, template]));

  const chapters = document.chapters ?? [];
  if (chapters.length < 3 || chapters.length > 16) errors.push(`The essay has ${chapters.length} chapters; a FieldNotes note runs 5-12.`);
  else if (chapters.length < 5 || chapters.length > 12) warnings.push(`The essay has ${chapters.length} chapters; 5-12 reads better.`);

  // Budgets scale with the source: a 775-word memo cannot make a 2,500-word note, and padding it would break the no-invention rule.
  const knownSourceWords = Number(plan?.sourceWordCount ?? chunks?.wordCount ?? 0) || 0;
  const shortChapterWords = knownSourceWords ? Math.min(250, Math.max(60, Math.round((knownSourceWords / Math.max(1, chapters.length)) * 0.5))) : 250;
  let words = 0;
  let figures = 0;
  let pullquotes = 0;
  const componentCounts = new Map();
  let previousComponent = '';
  const chapterHasFigure = [];
  let chaptersEndingOnFigure = 0;

  chapters.forEach((chapter, chapterIndex) => {
    const path = `chapters[${chapterIndex}] (${chapter.id})`;
    const planChapter = planById.get(chapter.id);
    if (!PLACEHOLDER_TITLE.test(chapter.title ?? '') && !(chapter.title ?? '').trim()) errors.push(`${path}: the chapter has no title.`);
    else if (PLACEHOLDER_TITLE.test(chapter.title ?? '')) errors.push(`${path}: title “${chapter.title}” is a placeholder. Name the chapter after its argument.`);
    if (!(chapter.thesis ?? '').trim()) errors.push(`${path}: no thesis. One arguable sentence.`);
    if (planChapter && !(planChapter.purpose ?? '').trim()) errors.push(`${path}: plan.json has no purpose for this chapter.`);

    // The reader shows a chapter's subtitle and thesis together, so one that repeats the other reads as a stutter.
    const wordSet = (text) => new Set(String(text ?? '').toLowerCase().match(/[a-z0-9']+/g) ?? []);
    const [subtitleWords, thesisWords] = [wordSet(chapter.subtitle), wordSet(chapter.thesis)];
    if (subtitleWords.size >= 4 && thesisWords.size) {
      const shared = [...subtitleWords].filter((word) => thesisWords.has(word)).length;
      if (shared / Math.min(subtitleWords.size, thesisWords.size) >= 0.7) warnings.push(`${path}: the subtitle and the thesis say nearly the same thing. Cut the subtitle, or make it a different sentence.`);
    }

    const blocks = chapter.blocks ?? [];
    const paragraphs = blocks.filter((block) => block.kind === 'paragraph');
    if (!paragraphs.length) errors.push(`${path}: no prose. Every chapter needs paragraphs.`);
    else if (paragraphs.length < 2 || paragraphs.length > 8) warnings.push(`${path}: ${paragraphs.length} paragraphs; 3-6 is the house rhythm.`);

    let chapterWords = 0;
    let chapterFigures = 0;

    blocks.forEach((block, blockIndex) => {
      const blockPath = `${path}.blocks[${blockIndex}]`;
      if (block.kind === 'paragraph') {
        const count = wordCount(block.text);
        chapterWords += count;
        words += count;
        if (count < 15) errors.push(`${blockPath}: ${count} words is a fragment, not a paragraph.`);
        else if (count < 25) warnings.push(`${blockPath}: ${count} words is thin.`);
        if (count > 200) errors.push(`${blockPath}: ${count} words. Split it.`);
        else if (count > 130) warnings.push(`${blockPath}: ${count} words. Check that it is one idea.`);
        for (const [claimIndex, claim] of (block.claims ?? []).entries()) {
          if (!Number.isInteger(claim.start) || claim.start < 0 || claim.end > block.text.length) errors.push(`${blockPath}.claims[${claimIndex}]: claim range falls outside the paragraph.`);
          for (const reference of claim.evidence ?? []) cited.add(reference.sourceChunkId);
        }
      }

      if (block.kind === 'pullquote') {
        pullquotes += 1;
        for (const reference of block.evidence ?? []) cited.add(reference.sourceChunkId);
      }

      if (block.kind === 'site-component') {
        figures += 1;
        chapterFigures += 1;
        const template = templateById.get(block.componentId);
        const count = (componentCounts.get(block.componentId) ?? 0) + 1;
        componentCounts.set(block.componentId, count);
        if (previousComponent === block.componentId) warnings.push(`${blockPath}: ${block.componentId} is carried over from the previous chapter. Vary the casting.`);
        previousComponent = block.componentId;
        if (!(block.altText ?? '').trim()) errors.push(`${blockPath}: no altText.`);
        if (template?.readiness !== 'implemented') warnings.push(`${blockPath}: ${block.componentId} renders through its generic family arrangement, not a purpose-built figure.`);
        for (const [itemIndex, item] of (block.items ?? []).entries()) {
          if (!(item.detail ?? '').trim()) warnings.push(`${blockPath}.items[${itemIndex}]: “${item.label}” has no detail. One sourced sentence.`);
        }
        warnings.push(...fitWarnings(block, layouts, blockPath));
        for (const reference of block.evidence ?? []) cited.add(reference.sourceChunkId);
      }

      if (block.kind === 'visual') {
        figures += 1;
        chapterFigures += 1;
        const primitive = block.plan?.primitiveId;
        const count = (componentCounts.get(primitive) ?? 0) + 1;
        componentCounts.set(primitive, count);
        previousComponent = primitive;
        if (!(block.plan?.altText ?? '').trim()) errors.push(`${blockPath}: no altText.`);
        for (const reference of block.plan?.evidence ?? []) cited.add(reference.sourceChunkId);
      }

      if (block.kind === 'data-visualization') {
        figures += 1;
        chapterFigures += 1;
        previousComponent = '';
        if (!(block.altText ?? '').trim()) errors.push(`${blockPath}: no altText.`);
        if (!(block.caption ?? '').trim()) warnings.push(`${blockPath}: a chart caption should say what the data cannot show.`);
      }

      if (block.kind === 'concept-model') {
        figures += 1;
        chapterFigures += 1;
        previousComponent = '';
        if (!(block.altText ?? '').trim()) errors.push(`${blockPath}: no altText.`);
        for (const reference of block.evidence ?? []) cited.add(reference.sourceChunkId);
      }

      const evidence = block.evidence ?? block.plan?.evidence ?? [];
      if (block.kind !== 'paragraph' && block.kind !== 'data-visualization' && !evidence.length) errors.push(`${blockPath}: no source chunks cited.`);
      for (const reference of evidence) {
        if (!chunkIds.has(reference.sourceChunkId)) errors.push(`${blockPath}: unknown chunk “${reference.sourceChunkId}”.`);
      }
    });

    // Flow: where the figure lands matters as much as which figure it is.
    chapterHasFigure.push(chapterFigures > 0);
    const isFigure = (block) => Boolean(block) && FIGURE_KINDS.has(block.kind);
    if (isFigure(blocks[blocks.length - 1]) && paragraphs.length >= 3) chaptersEndingOnFigure += 1;
    if (isFigure(blocks[0])) warnings.push(`${path}: the chapter opens on a figure. Give the reader a paragraph that sets it up first.`);
    blocks.forEach((block, blockIndex) => {
      const next = blocks[blockIndex + 1];
      if (isFigure(block) && (isFigure(next) || next?.kind === 'pullquote')) warnings.push(`${path}.blocks[${blockIndex}]: a figure sits directly against ${isFigure(next) ? 'another figure' : 'a pullquote'}. Put a paragraph between them.`);
      if (block.kind === 'pullquote' && isFigure(next)) warnings.push(`${path}.blocks[${blockIndex}]: a pullquote sits directly against a figure. Put a paragraph between them.`);
    });
    let run = 0;
    let longestRun = 0;
    for (const block of blocks) {
      run = block.kind === 'paragraph' ? run + wordCount(block.text) : 0;
      longestRun = Math.max(longestRun, run);
    }
    if (longestRun > MAX_PROSE_RUN_WORDS) warnings.push(`${path}: ${longestRun} words of prose in a row with nothing to look at. Place the figure after the paragraph that introduces it, or break the run with a pullquote.`);

    if (chapterFigures > 2) errors.push(`${path}: ${chapterFigures} figures in one chapter. At most two, and only when the second carries evidence.`);
    if (!chapterFigures && chapterWords > 450) warnings.push(`${path}: ${chapterWords} words with no figure. Either cast one or split the chapter.`);
    if (chapterWords < shortChapterWords) warnings.push(`${path}: ${chapterWords} words is short for a chapter${knownSourceWords ? ' of this source' : ''}. Merge or develop it.`);
    else if (chapterWords > 650) warnings.push(`${path}: ${chapterWords} words. Consider splitting.`);
  });

  if (chaptersEndingOnFigure >= 3) warnings.push(`${chaptersEndingOnFigure} chapters end on their figure. When every figure closes its chapter the essay reads as prose-then-picture, repeated. Place each figure after the paragraph that introduces its subject, and let some chapters end on a sentence.`);
  let barren = 0;
  for (const [chapterIndex, hasFigure] of chapterHasFigure.entries()) {
    barren = hasFigure ? 0 : barren + 1;
    if (barren === DESERT_CHAPTERS) warnings.push(`chapters[${chapterIndex - DESERT_CHAPTERS + 1}..${chapterIndex}]: ${DESERT_CHAPTERS} chapters in a row with no figure. Cast one, or merge them.`);
  }
  for (const [componentId, count] of componentCounts) {
    if (count > 3) errors.push(`${componentId} is used ${count} times. The essay reads as a template; vary the casting.`);
  }
  if (pullquotes > 2) errors.push(`${pullquotes} pullquotes. At most two in one essay.`);
  // A conversion is measured against its source, not against an ideal length.
  const sourceWords = Number(plan?.sourceWordCount ?? chunks?.wordCount ?? 0) || words;
  if (words < sourceWords * 0.8) errors.push(`${words.toLocaleString()} words from ${sourceWords.toLocaleString()} in the source: this is a summary, not a conversion. Restore the argument.`);
  const floor = Math.min(2500, Math.round(sourceWords * 0.9));
  if (words < floor) warnings.push(`${words.toLocaleString()} words is short for a FieldNotes note; the house range is 2,500-6,000 and this source supports about ${floor.toLocaleString()}.`);
  else if (words > 6000) warnings.push(`${words.toLocaleString()} words runs long for one note (2,500-6,000). Consider splitting it.`);

  // Coverage is measured on the authoring surface: a paragraph's `source` never
  // reaches the published document (the contract carries claims, not citations).
  for (const chapter of blocks?.chapters ?? []) {
    for (const block of chapter.blocks ?? []) {
      for (const id of [].concat(block.source ?? [])) cited.add(id);
      for (const claim of block.claims ?? []) for (const id of [].concat(claim.source ?? [])) cited.add(id);
    }
  }
  const unknown = [...cited].filter((id) => !chunkIds.has(id) && Boolean(id));
  for (const id of unknown) errors.push(`Cited chunk “${id}” does not exist.`);
  const uncited = [...chunkIds].filter((id) => !cited.has(id));

  return {
    errors,
    warnings,
    stats: {
      chapters: chapters.length,
      words,
      readingMinutes: Math.max(1, Math.round(words / 220)),
      figures,
      pullquotes,
      chunksCited: cited.size,
      chunksTotal: chunkIds.size,
      uncitedChunks: uncited,
      componentCounts: Object.fromEntries(componentCounts),
    },
  };
}
