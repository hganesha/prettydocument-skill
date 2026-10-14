/**
 * What a figure can hold before the reader's layout breaks.
 *
 * Which layout a component gets (flow, radial, …) is decided in the renderer;
 * vendor/layout-families.json is read from it at build time, so the lint cannot
 * disagree with what is drawn. The limits are measured against the reader's own
 * CSS (vendor/reader.css) at the 760px column:
 *
 *   flow    four items share a row; a fifth wraps and leaves its arrow
 *           pointing off the end of the row above.
 *   radial  210px circles, two to a row. The copy box inside a circle is about
 *           148px wide; a 24-character label and a 60-character detail are
 *           the most that stay inside the circle.
 */
import { readFile } from 'node:fs/promises';
import { skillRoot } from './args.mjs';

export const FIT = {
  flow: { maxItems: 4 },
  radial: { maxItems: 6, maxLabel: 24, maxDetail: 60 },
  any: { maxLabel: 40, maxDetail: 140 },
};

/** { flow: Set, grid: Set, stack: Set, network: Set, radial: Set }, read from vendor/layout-families.json; null if absent. */
export async function loadLayoutFamilies() {
  let families;
  try {
    families = JSON.parse(await readFile(new URL('vendor/layout-families.json', skillRoot()), 'utf8'));
  } catch {
    return null;
  }
  const sets = Object.fromEntries(Object.entries(families).map(([name, ids]) => [name, new Set(ids)]));
  return sets.flow && sets.radial ? sets : null;
}

/** Warnings for one site-component block; `layouts` comes from loadLayoutFamilies(). */
export function fitWarnings(block, layouts, blockPath) {
  const warnings = [];
  const items = block.items ?? [];
  const id = block.componentId;
  const family = layouts?.flow?.has(id) ? 'flow' : layouts?.radial?.has(id) ? 'radial' : null;

  if (family === 'flow' && items.length > FIT.flow.maxItems) {
    warnings.push(`${blockPath}: ${items.length} items in a ${id}. The reader fits ${FIT.flow.maxItems} to a row, so the rest wrap and the last arrow points at nothing. Merge stages, or cast a different component.`);
  }
  if (family === 'radial' && items.length > FIT.radial.maxItems) {
    warnings.push(`${blockPath}: ${items.length} items in a ${id}. More than ${FIT.radial.maxItems} circles stops reading as one loop.`);
  }

  items.forEach((item, index) => {
    const label = item.label ?? '';
    const detail = item.detail ?? '';
    const itemPath = `${blockPath}.items[${index}]`;
    const maxLabel = family === 'radial' ? FIT.radial.maxLabel : FIT.any.maxLabel;
    const maxDetail = family === 'radial' ? FIT.radial.maxDetail : FIT.any.maxDetail;
    if (label.length > maxLabel) warnings.push(`${itemPath}: label is ${label.length} characters; ${maxLabel} is the most a ${family ?? 'figure'} item holds.`);
    if (detail.length > maxDetail) warnings.push(`${itemPath}: detail is ${detail.length} characters; ${maxDetail} is the most a ${family ?? 'figure'} item holds${family === 'radial' ? ' inside its circle' : ''}. Cut it to the clause the figure needs.`);
  });
  return warnings;
}
