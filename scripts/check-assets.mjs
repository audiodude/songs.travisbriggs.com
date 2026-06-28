// Fails if any visible (non-hidden) song is missing its mp3 in R2. Runs in the
// pre-push hook and in CI before deploy, so a song can never ship without audio.
// Robust against transient throttling: per-request timeout + retries; only a real
// 404 counts as missing.
import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const AUDIO_BASE = process.env.PUBLIC_AUDIO_BASE || 'https://audio.songs.travisbriggs.com';
const DIR = 'src/content/songs';
const CONCURRENCY = 8;
const ATTEMPTS = 4;
const TIMEOUT_MS = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @returns {Promise<'ok'|'missing'>} */
async function checkOne(url) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const r = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) return 'ok';
      if (r.status === 404) return 'missing'; // definitively absent — don't retry
      // 429/5xx etc. — transient, retry
    } catch {
      // network error / timeout — transient, retry
    }
    if (attempt < ATTEMPTS) await sleep(400 * attempt);
  }
  return 'missing';
}

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
    const res = await checkOne(`${AUDIO_BASE}/${encodeURIComponent(slug)}.mp3`);
    if (res === 'missing') missing.push(slug);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (missing.length) {
  console.error(`\n✗ ${missing.length} song(s) missing audio at ${AUDIO_BASE}:`);
  for (const s of missing.sort()) console.error(`   - ${s}.mp3`);
  console.error('\nUpload with `pnpm add-song <file> --slug <slug>`, or push with --no-verify to bypass.\n');
  process.exit(1);
}
console.log(`✓ all ${visible.length} visible songs have audio in R2`);
