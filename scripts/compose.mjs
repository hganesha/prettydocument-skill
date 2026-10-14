#!/usr/bin/env node
/**
 * Stage 3 — compose plan.json + blocks.json into a PublicationDocument.
 *
 *   node <skill>/scripts/compose.mjs \
 *     --draft drafts/<slug> --title "Title of the essay" [--kind essay] [--category system-design]
 *
 * Everything deterministic happens here: block ids, evidence references, claim
 * character ranges, data snapshots and their content hashes, visual language,
 * word counts. Never hand-edit document.json — fix the inputs and recompose.
 */
import { createHash } from 'node:crypto';
import { parseArgs, requireOption, scriptPath, skillRoot } from './lib/args.mjs';
import { draftFile, readJson, writeJson } from './lib/fs.mjs';
import { pad, slugify } from './lib/ids.mjs';
import { resolveDesignSystem } from './lib/design-systems.mjs';
import { wordCount } from './lib/text.mjs';

const usage = 'Usage: compose.mjs --draft <dir> --title "Title" [--kind essay|data-story|infographic] [--category <id>] [--organization <id>] [--status ready] [--design-system <id>]';
const options = parseArgs(process.argv.slice(2), { kind: 'essay', status: 'ready', organization: 'fieldnotes', 'template-version': '1.0.0' });
const draft = requireOption(options, 'draft', usage);

const plan = await readJson(draftFile(draft, 'plan.json'));
const authored = await readJson(draftFile(draft, 'blocks.json'));
const chunks = await readJson(draftFile(draft, 'chunks.json'));
const registry = await readJson(new URL('registry/authoring-registry.json', skillRoot()));
if (!plan || !authored) {
  console.error('plan.json and blocks.json are required. Run scaffold.mjs first.');
  process.exit(1);
}

const title = options.title?.trim() || plan.workingTitle;
if (!title) {
  console.error('A title is required: pass --title or set plan.workingTitle.');
  process.exit(1);
}

// The design system is an authored decision, so it lives in plan.json: a recompose keeps it,
// and --design-system changes it. `fieldnotes-light` (or none) is the baseline.
const designSystemId = typeof options['design-system'] === 'string' ? options['design-system'].trim() : plan.designSystem;
let design = null;
if (designSystemId) {
  try {
    design = resolveDesignSystem(designSystemId);
  } catch (error) {
    console.error(`Compose failed: ${error.message}`);
    process.exit(1);
  }
  if (typeof options['design-system'] === 'string' && plan.designSystem !== designSystemId) {
    plan.designSystem = designSystemId;
    await writeJson(draftFile(draft, 'plan.json'), plan);
  }
}

const errors = [];
const warnings = [];
const chunkIds = new Set((chunks?.chunks ?? []).map((chunk) => chunk.id));
const templateById = new Map(registry.templates.map((template) => [template.id, template]));
const primitiveById = new Map(registry.primitives.map((primitive) => [primitive.id, primitive]));
const chartById = new Map(registry.charts.map((chart) => [chart.id, chart]));

const evidenceFor = (block, path) => {
  const source = block?.source;
  const ids = Array.isArray(source) ? source : source ? [source] : [];
  if (!ids.length) {
    errors.push(`${path}: no source chunks cited. Every block must rest on the document.`);
    return [];
  }
  const unknown = ids.filter((id) => !chunkIds.has(id));
  if (unknown.length) errors.push(`${path}: unknown chunk id(s) ${unknown.join(', ')}.`);
  return ids.filter((id) => chunkIds.has(id)).map((sourceChunkId) => ({ sourceChunkId }));
};

const planChapters = new Map((plan.chapters ?? []).map((chapter) => [chapter.id, chapter]));
const dataSnapshots = {};
const usedPrimitives = new Set();
let figureCount = 0;

function composeChapter(entry, chapterIndex) {
  const chapterId = entry?.id;
  const planChapter = planChapters.get(chapterId);
  if (!planChapter) {
    errors.push(`blocks.json chapter “${chapterId}” has no matching chapter in plan.json.`);
    return null;
  }
  const path = `chapters[${chapterIndex}] (${chapterId})`;
  const blocks = [];
  let paragraphIndex = 0;
  let figureIndex = 0;

  (entry.blocks ?? []).forEach((block, blockIndex) => {
    const blockPath = `${path}.blocks[${blockIndex}]`;
    const kind = block?.kind;

    if (kind === 'paragraph') {
      paragraphIndex += 1;
      const text = String(block.text ?? '').trim();
      if (!text) { errors.push(`${blockPath}: paragraph text is empty.`); return; }
      if (!(Array.isArray(block.source) ? block.source.length : Boolean(block.source))) {
        errors.push(`${blockPath}: no source chunks cited. Every paragraph must rest on the document.`);
      }
      for (const id of [].concat(block.source ?? [])) if (!chunkIds.has(id)) errors.push(`${blockPath}: unknown chunk id “${id}”.`);
      const claims = [];
      for (const [claimIndex, claim] of (block.claims ?? []).entries()) {
        const quote = String(claim?.quote ?? '');
        const start = quote ? text.indexOf(quote) : -1;
        if (start < 0) {
          errors.push(`${blockPath}.claims[${claimIndex}]: the quote is not in the paragraph verbatim — copy the sentence exactly.`);
          continue;
        }
        claims.push({ start, end: start + quote.length, evidence: evidenceFor(claim, `${blockPath}.claims[${claimIndex}]`) });
      }
      blocks.push({
        kind: 'paragraph',
        id: `${chapterId}-p${pad(paragraphIndex)}`,
        text,
        claims,
      });
      return;
    }

    if (kind === 'pullquote') {
      const quote = String(block.quote ?? '').trim();
      if (!quote) { errors.push(`${blockPath}: pullquote has no quote.`); return; }
      blocks.push({
        kind: 'pullquote',
        id: `${chapterId}-quote${blocks.filter((candidate) => candidate.kind === 'pullquote').length + 1}`,
        quote,
        ...(block.attribution ? { attribution: String(block.attribution) } : {}),
        evidence: evidenceFor(block, blockPath),
      });
      return;
    }

    if (kind === 'figure') {
      const template = templateById.get(block.componentId);
      if (!template) {
        errors.push(`${blockPath}: “${block.componentId}” is not an authoring template. See references/casting-table.md.`);
        return;
      }
      if (block.variant && !template.variants.includes(block.variant)) {
        errors.push(`${blockPath}: variant “${block.variant}” is not one of ${template.variants.join(', ') || '(none)'}.`);
      }
      const rule = template.regions.variantGroups?.[block.variant] ?? template.regions;
      const groups = block.groups;
      if (rule.mode === 'required' && (!Array.isArray(groups) || groups.length < rule.min || groups.length > rule.max)) {
        errors.push(`${blockPath}: ${block.componentId}${block.variant ? ` (${block.variant})` : ''} needs ${rule.min === rule.max ? rule.min : `${rule.min}-${rule.max}`} regions.`);
      }
      const itemLimit = groups?.length ? registry.limits.groupedItems : registry.limits.items;
      const items = (block.items ?? []).map((item, itemIndex) => {
        const itemPath = `${blockPath}.items[${itemIndex}]`;
        if (!item?.label) errors.push(`${itemPath}: every item needs a label.`);
        if (item?.meta && String(item.meta).length > registry.limits.meta) errors.push(`${itemPath}: meta annotations are at most ${registry.limits.meta} characters.`);
        if (item?.icon && !registry.icons.includes(item.icon)) errors.push(`${itemPath}: icon “${item.icon}” is outside the glyph set.`);
        const value = {
          label: String(item?.label ?? '').trim(),
          ...(item?.detail ? { detail: String(item.detail) } : {}),
          ...(groups?.length ? { group: Math.min(Math.max(0, Number(item?.group ?? 0)), groups.length - 1) } : {}),
          ...(item?.meta ? { meta: String(item.meta) } : {}),
          ...(item?.icon ? { icon: item.icon } : {}),
        };
        if (groups?.length && !Number.isInteger(item?.group)) {
          warnings.push(`${itemPath}: no region assigned; placed in the first one.`);
        }
        return value;
      });
      if (!items.length || items.length > itemLimit) errors.push(`${blockPath}: a figure needs 1-${itemLimit} items (${items.length} given).`);
      if (!String(block.altText ?? '').trim()) errors.push(`${blockPath}: figures need altText — one sentence naming the structure and the takeaway.`);
      figureIndex += 1;
      figureCount += 1;
      blocks.push({
        kind: 'site-component',
        id: `${chapterId}-fig${pad(figureIndex)}`,
        componentId: block.componentId,
        title: String(block.title ?? '').trim(),
        ...(block.variant ? { variant: block.variant } : {}),
        ...(groups?.length ? { groups: groups.map((group) => String(group)) } : {}),
        items,
        evidence: evidenceFor(block, blockPath),
        altText: String(block.altText ?? '').trim(),
      });
      return;
    }

    if (kind === 'data') {
      const chart = chartById.get(block.chart);
      if (!chart) {
        errors.push(`${blockPath}: unknown chart “${block.chart}”. See references/casting-table.md.`);
        return;
      }
      const declared = block.tables ?? {};
      const tableNames = Object.keys(declared);
      if (!tableNames.length) { errors.push(`${blockPath}: a chart needs at least one table.`); return; }
      const roles = {};
      for (const [channel, binding] of Object.entries(block.roles ?? {})) {
        const [tableName, fieldName] = String(binding).includes('.') ? String(binding).split('.') : [tableNames.length === 1 ? tableNames[0] : undefined, String(binding)];
        if (!tableName) { errors.push(`${blockPath}.roles.${channel}: name the table as “table.field” when a chart uses more than one.`); continue; }
        roles[channel] = { table: tableName, field: fieldName };
      }
      const requiredRoles = (chart.authoring?.roles ?? []).filter((role) => role.required).map((role) => role.id);
      for (const channel of requiredRoles) if (!roles[channel]) errors.push(`${blockPath}.roles: ${chart.id} requires the “${channel}” channel.`);
      for (const [channel, binding] of Object.entries(roles)) {
        const role = (chart.authoring?.roles ?? []).find((candidate) => candidate.id === channel);
        const fieldType = declared[binding.table]?.fields?.find((field) => field.name === binding.field)?.type;
        if (role && fieldType && !role.types.includes(fieldType)) {
          warnings.push(`${blockPath}.roles.${channel}: field “${binding.field}” is ${fieldType}; this channel accepts ${role.types.join(' or ')}.`);
        }
      }
      if (!String(block.altText ?? '').trim()) errors.push(`${blockPath}: charts need altText describing the shape of the data.`);

      // Only the tables and fields a chart actually binds travel with the release.
      const usedFields = new Map();
      for (const binding of Object.values(roles)) {
        const fields = usedFields.get(binding.table) ?? new Set();
        fields.add(binding.field);
        usedFields.set(binding.table, fields);
      }
      const snapshotTables = [...usedFields.entries()].map(([name, fields]) => {
        const source = declared[name];
        return {
          name,
          fields: (source?.fields ?? []).filter((field) => fields.has(field.name)).map((field) => ({
            name: field.name,
            type: field.type,
            ...(field.label ? { label: field.label } : {}),
            ...(field.unit ? { unit: field.unit } : {}),
          })),
          rows: source?.rows ?? [],
        };
      }).filter((table) => table.fields.length);
      if (!snapshotTables.length) { errors.push(`${blockPath}: no table fields survived binding — check roles against table field names.`); return; }
      const hash = createHash('sha256').update(JSON.stringify(snapshotTables)).digest('hex');
      const snapshotId = `snapshot-${hash}`;
      dataSnapshots[snapshotId] = { id: snapshotId, contentHash: hash, tables: snapshotTables };
      figureIndex += 1;
      figureCount += 1;
      blocks.push({
        kind: 'data-visualization',
        id: `${chapterId}-fig${pad(figureIndex)}`,
        spec: {
          chart: block.chart,
          title: String(block.title ?? '').trim(),
          ...(block.deck ? { deck: String(block.deck) } : {}),
          roles,
          ...(block.guides ? { guides: block.guides } : {}),
          ...(block.format ? { format: block.format } : {}),
          ...(block.interaction ? { interaction: block.interaction } : {}),
          ...(block.options ? { options: block.options } : {}),
        },
        snapshotId,
        ...(block.caption ? { caption: String(block.caption) } : {}),
        altText: String(block.altText ?? '').trim(),
      });
      return;
    }

    if (kind === 'model') {
      const concepts = block.concepts ?? [];
      if (!concepts.length || concepts.length > registry.limits.concepts) errors.push(`${blockPath}: a concept model needs 1-${registry.limits.concepts} concepts.`);
      if ((block.relationships ?? []).length > registry.limits.relationships) errors.push(`${blockPath}: at most ${registry.limits.relationships} relationships.`);
      if (!String(block.altText ?? '').trim()) errors.push(`${blockPath}: a concept model needs altText.`);
      figureIndex += 1;
      figureCount += 1;
      blocks.push({
        kind: 'concept-model',
        id: `${chapterId}-fig${pad(figureIndex)}`,
        title: String(block.title ?? '').trim(),
        ...(block.variant ? { variant: block.variant } : {}),
        concepts: concepts.map((concept) => ({
          id: slugify(concept.id ?? concept.label, 'concept'),
          label: String(concept.label ?? '').trim(),
          ...(concept.detail ? { detail: String(concept.detail) } : {}),
          ...(concept.domain ? { domain: String(concept.domain) } : {}),
          ...(Number.isInteger(concept.column) ? { column: concept.column } : {}),
          properties: (concept.properties ?? []).map((property) => ({
            id: slugify(property.id ?? property.label, 'property'),
            label: String(property.label ?? '').trim(),
            valueType: property.valueType ?? 'text',
            ...(property.detail ? { detail: String(property.detail) } : {}),
            ...(property.required ? { required: true } : {}),
            ...(property.identifier ? { identifier: true } : {}),
          })),
        })),
        relationships: (block.relationships ?? []).map((relationship, index) => ({
          id: slugify(relationship.id ?? `relation-${index + 1}`, 'relation'),
          label: String(relationship.label ?? '').trim(),
          sourceId: slugify(relationship.sourceId, 'concept'),
          targetId: slugify(relationship.targetId, 'concept'),
          cardinality: relationship.cardinality ?? 'one-to-many',
          ...(relationship.detail ? { detail: String(relationship.detail) } : {}),
        })),
        evidence: evidenceFor(block, blockPath),
        altText: String(block.altText ?? '').trim(),
      });
      return;
    }

    if (kind === 'visual') {
      const primitive = primitiveById.get(block.primitiveId);
      if (!primitive || primitive.status !== 'enabled') {
        errors.push(`${blockPath}: primitive “${block.primitiveId}” is not enabled. Use timeline, layered-stack (isometric-callouts), or semantic-infographic.`);
        return;
      }
      if (!primitive.variants.includes(block.variant)) errors.push(`${blockPath}: variant must be one of ${primitive.variants.join(', ')}.`);
      if (!String(block.purpose ?? '').trim()) errors.push(`${blockPath}: a visual needs a semantic purpose — say what it lets the reader see.`);
      if (!String(block.altText ?? '').trim()) errors.push(`${blockPath}: a visual needs altText.`);
      usedPrimitives.add(block.primitiveId);
      figureIndex += 1;
      figureCount += 1;
      blocks.push({
        kind: 'visual',
        id: `${chapterId}-fig${pad(figureIndex)}`,
        plan: {
          state: 'selected',
          purpose: String(block.purpose ?? '').trim(),
          candidates: [],
          primitiveId: block.primitiveId,
          primitiveVersion: primitiveById.get(block.primitiveId)?.version ?? '1.0.0',
          ...(block.variant ? { variant: block.variant } : {}),
          config: block.config ?? {},
          evidence: evidenceFor(block, blockPath),
          ...(block.caption ? { caption: String(block.caption) } : {}),
          altText: String(block.altText ?? '').trim(),
          confidence: Number.isFinite(Number(block.confidence)) ? Number(block.confidence) : 0.8,
        },
      });
      return;
    }

    errors.push(`${blockPath}: unknown block kind “${kind}”.`);
  });

  if (!blocks.length) errors.push(`${path}: no blocks were written.`);
  return {
    id: chapterId,
    title: String(planChapter.title ?? '').trim(),
    ...(entry.subtitle ? { subtitle: String(entry.subtitle) } : {}),
    thesis: String(planChapter.thesis ?? '').trim(),
    blocks,
    editorialState: { userModified: true, locked: false, stale: false },
  };
}

const chapters = (authored.chapters ?? []).map(composeChapter).filter(Boolean);
if (chapters.length !== (plan.chapters ?? []).length) {
  errors.push(`blocks.json covers ${chapters.length} chapters; plan.json declares ${(plan.chapters ?? []).length}.`);
}

const words = chapters.reduce((total, chapter) => total + chapter.blocks.reduce((sum, block) => sum + (block.kind === 'paragraph' ? wordCount(block.text) : 0), 0), 0);
const document = {
  id: options.id ?? slugify(title, 'document'),
  organizationId: String(options.organization),
  title,
  status: String(options.status),
  templateVersion: String(options['template-version']),
  sourceIds: chunks?.sourceId ? [chunks.sourceId] : [],
  kind: String(options.kind),
  ...(options.category ? { categoryId: String(options.category) } : {}),
  visualLanguage: {
    family: 'fieldnotes-editorial',
    density: figureCount > chapters.length / 2 ? 'medium' : 'low',
    motion: 'restrained',
    preferredPrimitiveIds: [...usedPrimitives],
    ...(design ? { theme: design.system } : {}),
  },
  chapters,
  ...(Object.keys(dataSnapshots).length ? { dataSnapshots } : {}),
};

if (errors.length) {
  console.error(`Compose failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const documentPath = await writeJson(draftFile(draft, 'document.json'), document);
const statsPath = await writeJson(draftFile(draft, 'compose-report.json'), {
  title,
  chapters: chapters.length,
  words,
  readingMinutes: Math.max(1, Math.round(words / 220)),
  figures: figureCount,
  snapshots: Object.keys(dataSnapshots).length,
  warnings,
});

console.log(`Composed ${chapters.length} chapters · ${words.toLocaleString()} words · ${figureCount} figures · ${Object.keys(dataSnapshots).length} data snapshots.`);
console.log(design ? `Design system: ${design.system.label} (${design.system.id}).` : 'Design system: the baseline (fieldnotes-light).');
for (const advice of design?.advisories ?? []) console.log(`  advisory: ${advice}`);
for (const warning of warnings) console.log(`  warning: ${warning}`);
console.log(`  ${documentPath}`);
console.log(`  ${statsPath}`);
console.log(`\nNext: node ${scriptPath('validate.mjs')} --draft ${draft}`);
