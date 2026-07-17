// fal.ai FLUX.2 cover generation.
//
// Shared by the dev-only "Generate cover" button (see integrations/cover-admin.mjs)
// and usable straight from the terminal for testing:
//
//   FAL_KEY=... node scripts/fal-cover.mjs <slug> "a prompt describing the art"
//
// Writes public/covers/<slug>.jpg and records the slug in src/data/ai-covers.json
// so the deterministic waveform generator never overwrites it.
import { readFile } from 'node:fs/promises';
import { fal } from '@fal-ai/client';
import { loadAiManifest, saveAiManifest, writeCoverJpeg } from './covers.mjs';

const MODEL = 'fal-ai/flux-2';

/** FAL_KEY from the environment, falling back to a FAL_KEY= line in .env. */
export async function resolveFalKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  try {
    const env = await readFile('.env', 'utf8');
    const m = env.match(/^\s*FAL_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  } catch {
    /* no .env — fall through */
  }
  return null;
}

/**
 * Generate a fal.ai cover for one song and persist it.
 * @param {string} slug
 * @param {string} prompt free-text art direction
 * @param {{ seed?: number }} [opts]
 * @returns {Promise<{ slug: string, prompt: string, seed: number, path: string, imageUrl: string }>}
 */
export async function generateAiCover(slug, prompt, opts = {}) {
  if (!slug) throw new Error('slug is required');
  if (!prompt || !prompt.trim()) throw new Error('a non-empty prompt is required');

  const key = await resolveFalKey();
  if (!key) throw new Error('FAL_KEY not set (export it or add FAL_KEY=... to .env)');
  fal.config({ credentials: key });

  const input = {
    prompt: prompt.trim(),
    image_size: 'square_hd', // 1024×1024 — matches the square cover slot
    num_images: 1,
    output_format: 'jpeg',
    enable_safety_checker: true,
  };
  if (Number.isInteger(opts.seed)) input.seed = opts.seed;

  const result = await fal.subscribe(MODEL, { input });
  const image = result?.data?.images?.[0];
  if (!image?.url) throw new Error('fal.ai returned no image');

  const res = await fetch(image.url);
  if (!res.ok) throw new Error(`could not download generated image (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = await writeCoverJpeg(slug, buf);

  const seed = result?.data?.seed ?? opts.seed ?? null;
  const manifest = await loadAiManifest();
  manifest[slug] = { prompt: prompt.trim(), seed, at: new Date().toISOString() };
  await saveAiManifest(manifest);

  return { slug, prompt: prompt.trim(), seed, path: outPath, imageUrl: image.url };
}

// CLI entry — only when run directly, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [slug, ...rest] = process.argv.slice(2);
  const prompt = rest.join(' ');
  if (!slug || !prompt) {
    console.error('Usage: node scripts/fal-cover.mjs <slug> "<prompt>"');
    process.exit(1);
  }
  generateAiCover(slug, prompt)
    .then((r) => console.log(`✓ fal.ai cover → ${r.path} (seed ${r.seed})`))
    .catch((e) => {
      console.error(e.message || e);
      process.exit(1);
    });
}
