import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function toPath(url) {
  return typeof url === 'string' ? url : fileURLToPath(url);
}

export async function readJson(url, fallback) {
  try {
    return JSON.parse(await readFile(toPath(url), 'utf8'));
  } catch (error) {
    if (fallback !== undefined && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(url, value) {
  const path = toPath(url);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

export async function writeText(url, value) {
  const path = toPath(url);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
  return path;
}

export async function exists(path) {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/** Resolves a file inside a draft directory (relative to the caller's cwd). */
export function draftFile(draft, file = '') {
  const base = draft.replace(/\/+$/, '');
  return resolve(process.cwd(), file ? `${base}/${file}` : base);
}
