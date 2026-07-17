// Cover rendering + AI-cover manifest helpers, shared by the gen-covers CLI,
// add-song, and the dev-only covers admin endpoint.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { buildCoverSvg } from './cover-svg.mjs';

export const COVERS_DIR = 'public/covers';
export const PEAKS_DIR = 'public/peaks';
export const AI_MANIFEST = 'src/data/ai-covers.json';

/** Slugs whose cover is custom fal.ai art — never clobbered by the generator. */
export async function loadAiManifest() {
  try {
    return JSON.parse(await readFile(AI_MANIFEST, 'utf8'));
  } catch {
    return {};
  }
}

export async function saveAiManifest(manifest) {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(AI_MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
}

export function coverPath(slug) {
  return path.join(COVERS_DIR, `${slug}.jpg`);
}

/**
 * Render the deterministic waveform cover for one slug from its peaks file.
 * @returns {'written'|'ai-skip'|'no-peaks'}
 */
export async function generateWaveformCover(slug, { force = false } = {}) {
  const manifest = await loadAiManifest();
  if (manifest[slug] && !force) return 'ai-skip';
  let peaks;
  try {
    peaks = JSON.parse(await readFile(path.join(PEAKS_DIR, `${slug}.json`), 'utf8'));
  } catch {
    return 'no-peaks';
  }
  await writeCoverJpeg(slug, Buffer.from(buildCoverSvg({ slug, peaks })));
  if (force && manifest[slug]) {
    delete manifest[slug];
    await saveAiManifest(manifest);
  }
  return 'written';
}

/** Normalize any image buffer (SVG, fal.ai output…) to a 1024² jpg cover. */
export async function writeCoverJpeg(slug, imageBuffer) {
  await mkdir(COVERS_DIR, { recursive: true });
  await sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(coverPath(slug));
  return coverPath(slug);
}
