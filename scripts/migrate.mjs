// One-time migration: original Flask-FlatPages site -> Astro content + peaks.
// Source of truth is the original songs/*.md (ALL of them, including hidden) and
// static/mp3/*.mp3 from the sibling repo. Preserves slugs verbatim.
import { readdir, readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { parseFrontmatter } from './parse-frontmatter.mjs';
import { generatePeaks } from './peaks.mjs';

const SRC = path.resolve(process.cwd(), '..', 'songs.travisbriggs.com');
const SONGS_DIR = path.join(SRC, 'songs');
const MP3_DIR = path.join(SRC, 'static', 'mp3');
const OUT_CONTENT = path.resolve('src/content/songs');
const OUT_PEAKS = path.resolve('src/data/peaks');

const exists = (p) => access(p).then(() => true).catch(() => false);

/** run `tasks` with at most `n` in flight */
async function pool(items, n, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

async function main() {
  await rm(OUT_CONTENT, { recursive: true, force: true });
  await rm(OUT_PEAKS, { recursive: true, force: true });
  await mkdir(OUT_CONTENT, { recursive: true });
  await mkdir(OUT_PEAKS, { recursive: true });

  const files = (await readdir(SONGS_DIR)).filter((f) => f.endsWith('.md')).sort();
  const allTags = new Set();
  const missingMp3 = [];
  let hidden = 0;

  await pool(files, 8, async (file) => {
    const slug = path.basename(file, '.md');
    const raw = await readFile(path.join(SONGS_DIR, file), 'utf8');
    const { meta, note } = parseFrontmatter(raw);
    meta.tags.forEach((t) => allTags.add(t));
    if (meta.hidden) hidden++;

    const data = {
      title: meta.title,
      date: meta.date,
      duration: meta.duration,
      tags: meta.tags,
      hidden: meta.hidden,
      note,
    };
    await writeFile(path.join(OUT_CONTENT, `${slug}.yaml`), stringify(data), 'utf8');

    const mp3 = path.join(MP3_DIR, `${slug}.mp3`);
    if (await exists(mp3)) {
      const peaks = await generatePeaks(mp3, 72);
      await writeFile(path.join(OUT_PEAKS, `${slug}.json`), JSON.stringify(peaks), 'utf8');
    } else {
      missingMp3.push(slug);
    }
    process.stdout.write('.');
  });

  console.log('\n\n=== migration report ===');
  console.log(`songs:    ${files.length}/${files.length} written to src/content/songs/`);
  console.log(`hidden:   ${hidden}`);
  console.log(`tags:     ${allTags.size} unique`);
  console.log(`peaks:    ${files.length - missingMp3.length} generated`);
  console.log(`missing mp3 (${missingMp3.length}): ${missingMp3.join(', ') || 'none'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
