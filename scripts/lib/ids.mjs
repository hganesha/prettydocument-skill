/** Stable identifiers shared by every stage, so ids survive recomposition. */

export function slugify(value, fallback = 'item') {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export function uniqueIdentifier(base, taken) {
  const existing = new Set(taken);
  const slug = slugify(base);
  if (!existing.has(slug)) return slug;
  let suffix = 2;
  while (existing.has(`${slug}-${suffix}`)) suffix += 1;
  return `${slug}-${suffix}`;
}

export function pad(value, width = 2) {
  return String(value).padStart(width, '0');
}

/** The identifier the contract requires: lowercase, hyphen separated. */
export const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
