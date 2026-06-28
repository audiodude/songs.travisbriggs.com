// CLI to ingest a new song: upload the mp3 to R2, read its duration, generate
// waveform peaks, and scaffold the content file. Then edit notes/tags/date in
// the Keystatic admin (pnpm dev -> /keystatic/).
//
// Usage:
//   pnpm add-song <file.mp3> [--slug s] [--title t] [--date YYYY-MM-DD] [--no-upload]
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { parse, stringify } from 'yaml';
import { generatePeaks } from './peaks.mjs';
import { uploadToR2 } from './r2.mjs';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-upload') args.noUpload = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
    else args._.push(a);
  }
  return args;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleize(s) {
  return s
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fileExists(p) {
  return access(p).then(() => true).catch(() => false);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mp3 = args._[0];
  if (!mp3) {
    console.error('Usage: pnpm add-song <file.mp3> [--slug s] [--title t] [--date YYYY-MM-DD] [--no-upload]');
    process.exit(1);
  }
  if (!(await fileExists(mp3))) {
    console.error(`File not found: ${mp3}`);
    process.exit(1);
  }

  const base = path.basename(mp3);
  const slug = args.slug ? slugify(args.slug) : slugify(base);
  const title = args.title ?? titleize(base);
  const date = args.date ?? new Date().toISOString().slice(0, 10);

  const meta = await parseFile(mp3);
  const duration = Math.round((meta.format.duration || 0) * 1000);

  await mkdir('public/peaks', { recursive: true });
  const peaks = await generatePeaks(mp3, 72);
  await writeFile(path.join('public/peaks', `${slug}.json`), JSON.stringify(peaks));

  // Idempotent: if the song already exists, preserve its metadata (title, date,
  // tags, hidden, note) and only refresh the duration. Explicit --title/--date
  // still override. New songs get a fresh scaffold.
  await mkdir('src/content/songs', { recursive: true });
  const yamlPath = path.join('src/content/songs', `${slug}.yaml`);
  const existed = await fileExists(yamlPath);
  let data;
  if (existed) {
    data = parse(await readFile(yamlPath, 'utf8')) || {};
    data.duration = duration;
    if (args.title) data.title = title;
    if (args.date) data.date = date;
    data.tags ??= [];
    data.hidden ??= false;
    data.note ??= '';
  } else {
    data = { title, date, duration, tags: [], hidden: false, note: '' };
  }
  await writeFile(yamlPath, stringify(data));

  if (args.noUpload) {
    console.log('• skipped R2 upload (--no-upload)');
  } else {
    await uploadToR2(mp3, `${slug}.mp3`);
    console.log(`↑ uploaded ${slug}.mp3 to R2`);
  }

  console.log(`✓ ${existed ? 'updated' : 'added'} "${data.title}" [${slug}] — ${Math.round(duration / 1000)}s, ${peaks.length} peaks`);
  if (existed) console.log('  (existing note/tags/date preserved)');
  console.log('  next: pnpm dev → http://localhost:4321/keystatic/ to write the note + tags');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
