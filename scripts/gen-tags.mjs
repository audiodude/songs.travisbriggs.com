// Regenerate src/data/tags.ts — the canonical tag list used by the Keystatic
// multiselect. It's the union of tags currently used in songs plus any you've
// added to the file by hand (so you can introduce a new tag before any song
// uses it). Run: pnpm tags:gen
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const DIR = 'src/content/songs';
const OUT = 'src/data/tags.ts';

const used = new Set();

// keep any hand-added tags already in the file
try {
  const cur = await readFile(OUT, 'utf8');
  for (const m of cur.matchAll(/'((?:[^'\\]|\\.)*)'/g)) used.add(m[1].replace(/\\'/g, "'"));
} catch {
  /* first run */
}

for (const f of (await readdir(DIR)).filter((x) => x.endsWith('.yaml'))) {
  const d = parse(await readFile(path.join(DIR, f), 'utf8')) || {};
  for (const t of d.tags || []) used.add(t);
}

// New tags passed as args: `pnpm tags:gen acid.house bebop`
for (const a of process.argv.slice(2)) {
  const t = a.trim();
  if (t) used.add(t);
}

const tags = [...used].sort();
await mkdir('src/data', { recursive: true });
await writeFile(
  OUT,
  `// Canonical tag list for the Keystatic tags multiselect.\n` +
    `// Regenerate after tag changes: pnpm tags:gen  (union of tags used in songs + any added here).\n` +
    `export const TAGS: string[] = [\n${tags.map((t) => `  '${t.replace(/'/g, "\\'")}',`).join('\n')}\n];\n`,
);
console.log(`wrote ${tags.length} tags to ${OUT}`);
