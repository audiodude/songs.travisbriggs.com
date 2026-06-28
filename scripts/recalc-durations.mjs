// Recompute each song's duration from its actual mp3 (the frontmatter durations
// migrated from the old site don't always match the audio). Reads the local
// mp3s from the sibling repo (same files that are in R2). Songs without a local
// mp3 (e.g. CLI-added songs, hidden drafts) are left untouched.
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { parseFile } from 'music-metadata';

const DIR = 'src/content/songs';
const MP3 = path.resolve(process.cwd(), '..', 'songs.travisbriggs.com', 'static', 'mp3');
const exists = (p) => access(p).then(() => true).catch(() => false);

const files = (await readdir(DIR)).filter((f) => f.endsWith('.yaml')).sort();
let changed = 0;
const noMp3 = [];

for (const f of files) {
  const slug = f.replace(/\.yaml$/, '');
  const mp3 = path.join(MP3, `${slug}.mp3`);
  if (!(await exists(mp3))) {
    noMp3.push(slug);
    continue;
  }
  const p = path.join(DIR, f);
  const data = parse(await readFile(p, 'utf8')) || {};
  const meta = await parseFile(mp3);
  const dur = Math.round((meta.format.duration || 0) * 1000);
  if (dur > 0 && data.duration !== dur) {
    console.log(`${slug}: ${data.duration} -> ${dur}`);
    data.duration = dur;
    await writeFile(p, stringify(data));
    changed++;
  }
}

console.log(`\nupdated ${changed} duration(s); ${noMp3.length} song(s) without a local mp3 (left as-is): ${noMp3.join(', ') || 'none'}`);
