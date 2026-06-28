// Fails if any visible (non-hidden) song is missing its mp3 in R2. Runs in the
// pre-push hook and in CI before deploy, so a song can never ship without audio.
import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const AUDIO_BASE = process.env.PUBLIC_AUDIO_BASE || 'https://audio.songs.travisbriggs.com';
const DIR = 'src/content/songs';
const CONCURRENCY = 16;

const files = (await readdir(DIR)).filter((f) => f.endsWith('.yaml'));
const visible = [];
for (const f of files) {
  const data = parse(await readFile(`${DIR}/${f}`, 'utf8')) || {};
  if (!data.hidden) visible.push(f.replace(/\.yaml$/, ''));
}

const missing = [];
let i = 0;
async function worker() {
  while (i < visible.length) {
    const slug = visible[i++];
    const url = `${AUDIO_BASE}/${encodeURIComponent(slug)}.mp3`;
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (!r.ok) missing.push(slug);
    } catch {
      missing.push(slug);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (missing.length) {
  console.error(`\n✗ ${missing.length} song(s) missing audio at ${AUDIO_BASE}:`);
  for (const s of missing) console.error(`   - ${s}.mp3`);
  console.error('\nUpload with `pnpm add-song <file> --slug <slug>`, or push with --no-verify to bypass.\n');
  process.exit(1);
}
console.log(`✓ all ${visible.length} visible songs have audio in R2`);
