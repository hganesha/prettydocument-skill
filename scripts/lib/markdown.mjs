/** Portable markdown export of a PublicationDocument, for sharing and print-to-PDF. */

export function renderDocumentMarkdown(document) {
  const lines = [`# ${document.title}`, ''];
  if (document.kind && document.kind !== 'essay') lines.push(`_${document.kind.replace('-', ' ')}._`, '');
  for (const [index, chapter] of document.chapters.entries()) {
    lines.push(`## ${String(index + 1).padStart(2, '0')} · ${chapter.title}`, '');
    if (chapter.subtitle) lines.push(`*${chapter.subtitle}*`, '');
    if (chapter.thesis) lines.push(`**${chapter.thesis}**`, '');
    for (const block of chapter.blocks) {
      if (block.kind === 'paragraph') {
        lines.push(block.text, '');
      } else if (block.kind === 'pullquote') {
        lines.push(`> ${block.quote}`);
        if (block.attribution) lines.push(`> — ${block.attribution}`);
        lines.push('');
      } else if (block.kind === 'site-component') {
        lines.push(`**${block.title}** — _${block.componentId}${block.variant ? ` · ${block.variant}` : ''}_`, '');
        if (block.groups?.length) {
          for (const [groupIndex, group] of block.groups.entries()) {
            lines.push(`**${group}**`, '');
            for (const item of block.items.filter((candidate) => (candidate.group ?? 0) === groupIndex)) {
              lines.push(`- **${item.label}**${item.meta ? ` (${item.meta})` : ''}${item.detail ? ` — ${item.detail}` : ''}`);
            }
            lines.push('');
          }
        } else {
          for (const item of block.items) lines.push(`- **${item.label}**${item.meta ? ` (${item.meta})` : ''}${item.detail ? ` — ${item.detail}` : ''}`);
          lines.push('');
        }
        lines.push(`_Figure: ${block.altText}_`, '');
      } else if (block.kind === 'concept-model') {
        lines.push(`**${block.title}** — _concept model_`, '');
        for (const concept of block.concepts ?? []) lines.push(`- **${concept.label}**${concept.detail ? ` — ${concept.detail}` : ''}`);
        lines.push('');
        for (const relationship of block.relationships ?? []) {
          const label = (id) => (block.concepts ?? []).find((concept) => concept.id === id)?.label ?? id;
          lines.push(`- ${label(relationship.sourceId)} → ${relationship.label} → ${label(relationship.targetId)} (${relationship.cardinality})`);
        }
        lines.push('');
      } else if (block.kind === 'data-visualization') {
        const snapshot = document.dataSnapshots?.[block.snapshotId];
        lines.push(`**${block.spec?.title ?? 'Chart'}** — _${block.spec?.chart}_`, '');
        for (const table of snapshot?.tables ?? []) {
          lines.push(`| ${table.fields.map((field) => field.label ?? field.name).join(' | ')} |`, `| ${table.fields.map(() => '---').join(' | ')} |`);
          for (const row of table.rows ?? []) lines.push(`| ${table.fields.map((field) => String(row[field.name] ?? '')).join(' | ')} |`);
          lines.push('');
        }
        if (block.caption) lines.push(`_${block.caption}_`, '');
      } else if (block.kind === 'visual') {
        lines.push(`**${block.plan?.purpose ?? 'Figure'}**`, '', `_Figure: ${block.plan?.altText ?? ''}_`, '');
        if (Array.isArray(block.plan?.config?.events)) for (const event of block.plan.config.events) lines.push(`- **${event.title}** — ${event.detail}`);
        if (Array.isArray(block.plan?.config?.events)) lines.push('');
      }
    }
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
