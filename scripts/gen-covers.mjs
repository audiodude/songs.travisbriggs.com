// CLI for the deterministic waveform cover art.
//
// Usage:
//   pnpm covers:gen                 # generate covers that are missing (visible songs)
//   pnpm covers:gen --all           # regenerate every non-AI cover
//   pnpm covers:gen <slug> [...]    # (re)generate specific slugs
//   pnpm covers:gen <slug> --force  # ...even if the slug has a fal.ai cover
//                                   # (clears its ai-covers.json entry)
//
// Covers land in public/covers/<slug>.jpg and are committed to git. Slugs
// listed in src/data/ai-covers.json hold custom fal.ai art and are skipped
// unless --force.
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { coverPath, generateWaveformCover } from './covers.mjs';

const SONGS_DIR = 'src/content/songs';

function parseArgs(argv) {
  const args = { _: [] };
  for (const a of argv) {
    if (a === '--all') args.all = true;
    else if (a === '--force') args.force = true;
    else args._.push(a);
  }
  return args;
}

async function fileExists(p) {
  return access(p).then(() => true).catch(() => false);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let slugs;
  if (args._.length > 0) {
    slugs = args._;
  } else {
    const files = await readdir(SONGS_DIR);
    const all = files.filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, ''));
    const visible = [];
    for (const slug of all) {
      const data = parse(await readFile(path.join(SONGS_DIR, `${slug}.yaml`), 'utf8')) || {};
      if (!data.hidden) visible.push(slug);
    }
    slugs = args.all ? visible : (await Promise.all(visible.map(async (s) => ((await fileExists(coverPath(s))) ? null : s)))).filter(Boolean);
  }

  const counts = { written: 0, 'ai-skip': 0, 'no-peaks': 0 };
  for (const slug of slugs.sort()) {
    const status = await generateWaveformCover(slug, { force: args.force });
    counts[status]++;
    if (status === 'ai-skip') console.log(`• ${slug}: has a fal.ai cover — skipped (use --force to replace)`);
    if (status === 'no-peaks') console.log(`! ${slug}: no peaks file — skipped`);
  }
  console.log(
    `✓ ${counts.written} cover(s) written` +
      (counts['ai-skip'] ? `, ${counts['ai-skip']} AI-art skipped` : '') +
      (counts['no-peaks'] ? `, ${counts['no-peaks']} missing peaks` : '')
  );
  if (slugs.length === 0) console.log('  (nothing to do — every visible song already has a cover)');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
