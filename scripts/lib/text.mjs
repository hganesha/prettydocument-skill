/** Text helpers shared by ingest, compose, and the preview renderer. */

export function wordCount(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Splits into paragraphs, preserving the offsets of each block in the source. */
export function paragraphBlocks(text) {
  const blocks = [];
  const pattern = /[^\n][\s\S]*?(?=\n\s*\n|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[0].trim();
    if (value) blocks.push({ text: value, start: match.index, end: match.index + match[0].length });
  }
  return blocks;
}

export function splitSentences(text) {
  return String(text)
    .replace(/([.!?])\s+(?=[A-Z“"'(])/g, '$1\n')
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Trims a title that came from a heading or a filename. */
export function cleanTitle(value, fallback = 'Untitled') {
  const title = String(value ?? '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/\s*#+\s*$/, '')
    .replace(/\s*[-–—:|]\s*(part|chapter|section)\b.*$/i, '')
    .replace(/[*_`]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return title || fallback;
}

/** "Slide 4 — Taste" -> "Taste": a section marker is not part of a title. */
export function stripSectionPrefix(value) {
  return String(value ?? '')
    .replace(/^(?:slide|chapter|section|part|act|step)\s*\d+\s*(?:[:.\-\u2014\u2013]|\s)\s*/i, '')
    .trim();
}

/** Front matter split; returns { meta, body, offset } where offset maps body[0] back to the file. */
export function splitFrontMatter(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---')) return { meta: {}, body: normalized.trim(), offset: 0 };
  const end = normalized.indexOf('\n---', 3);
  if (end < 0) return { meta: {}, body: normalized.trim(), offset: 0 };
  const head = normalized.slice(3, end);
  const meta = {};
  for (const line of head.split('\n')) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (match) meta[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
  }
  const bodyStart = end + 4;
  return { meta, body: normalized.slice(bodyStart).replace(/^\n+/, ''), offset: bodyStart };
}

/**
 * A faithful port of the publication contract's `parseSourceStructure`
 * (source-structure rules). Headings already in the source
 * are the default chapter boundaries; this never invents structure from prose.
 */
export function parseSourceStructure(sourceText) {
  const normalized = String(sourceText ?? '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return { hasStructure: false, sections: [] };
  const lines = normalized.split('\n');

  const writtenNumber = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
  const chapterMarker = new RegExp(`^(?:#{1,6}\\s*)?(chapter|part|section)\\s+(\\d+|[ivxlcdm]+|${writtenNumber})(?:\\s*[:.\\-—–]\\s*|\\s+)?(.*?)\\s*$`, 'i');
  const markdownHeading = /^(#{1,3})\s+(.+?)\s*#*\s*$/;
  const writtenNumbers = new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']);
  const cleanHeading = (value) => value.replace(/^#{1,6}\s*/, '').replace(/\s*#+\s*$/, '').trim();
  const likelyTitleLine = (value) => {
    const line = value.trim();
    return Boolean(line) && line.length <= 90 && !/[.!?;:]$/.test(line) && !/^[-*+]\s/.test(line) && !/^\d+[.)]\s/.test(line) && !markdownHeading.test(line);
  };
  const formatMarker = (value) => {
    if (/^\d+$/.test(value)) return value;
    const lower = value.toLowerCase();
    if (writtenNumbers.has(lower)) return `${lower[0].toUpperCase()}${lower.slice(1)}`;
    return value.toUpperCase();
  };

  const explicit = [];
  lines.forEach((line, index) => {
    const match = line.trim().match(chapterMarker);
    if (!match) return;
    const label = `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${formatMarker(match[2])}`;
    const inlineTitle = match[3]?.trim();
    let title = inlineTitle ? `${label}: ${inlineTitle}` : label;
    let consumeNextLine = false;
    if (!inlineTitle) {
      const nextIndex = lines.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.trim());
      const nextLine = nextIndex >= 0 ? lines[nextIndex] : '';
      if (nextIndex === index + 1 && likelyTitleLine(nextLine)) {
        title = `${label}: ${nextLine.trim()}`;
        consumeNextLine = true;
      }
    }
    explicit.push({ index, title, consumeNextLine });
  });

  const markdown = [];
  lines.forEach((line, index) => {
    const match = line.trim().match(markdownHeading);
    if (match) markdown.push({ index, level: match[1].length, title: cleanHeading(match[2]), consumeNextLine: false });
  });
  let markdownHeadings = markdown;
  if (markdown.length >= 2) {
    const [first, ...rest] = markdown;
    if (first.index === 0 && first.level === 1 && rest.length >= 2 && rest.every((heading) => heading.level > first.level)) markdownHeadings = rest;
  } else {
    markdownHeadings = [];
  }

  const headings = explicit.length ? explicit : markdownHeadings;
  if (!headings.length) return { hasStructure: false, sections: [{ title: 'Untitled section', content: normalized }] };

  const sections = [];
  const preamble = lines.slice(0, headings[0].index).filter((line) => !markdownHeading.test(line.trim())).join('\n').trim();
  if (preamble) sections.push({ title: 'Opening notes', content: preamble });

  headings.forEach((heading, headingIndex) => {
    const nextHeading = headings[headingIndex + 1];
    const contentStart = heading.index + (heading.consumeNextLine ? 2 : 1);
    const content = lines.slice(contentStart, nextHeading?.index ?? lines.length).join('\n').trim();
    sections.push({ title: heading.title, content });
  });

  return { hasStructure: true, sections };
}
