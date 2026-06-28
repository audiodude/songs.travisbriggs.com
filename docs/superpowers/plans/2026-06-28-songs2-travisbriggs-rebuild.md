# songs2.travisbriggs.com Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Travis Briggs' song catalog as an Astro static site with the Rainfall redesign, a global persistent player, Keystatic local-mode CMS, a CLI audio pipeline to Cloudflare R2, deployed on Cloudflare Pages — preserving all original data.

**Architecture:** Astro (`output: 'static'`) renders an index and per-song pages from a Keystatic-managed markdown collection (`src/content/songs/<slug>.md`). Audio lives in R2 (`audio.songs.travisbriggs.com/<slug>.mp3`), out of git; waveform peaks are precomputed and committed. A single React player island persists across client-side navigation via Astro `<ClientRouter />` + `transition:persist`. New songs are ingested by an `add-song` CLI (upload to R2, read duration, generate peaks, scaffold content).

**Tech Stack:** Astro 5, React 19 (islands + Keystatic), `@keystatic/astro`, `@keystatic/core`, nanostores + `@nanostores/react` (player state), `@fontsource` (Bricolage Grotesque / Hanken Grotesk / Space Mono), Vitest (logic tests), `music-metadata` + ffmpeg (duration/peaks), `@aws-sdk/client-s3` (R2 via S3 API), `wrangler` (Pages/R2). Node 22.22.2, pnpm 10.33.2.

## Global Constraints

- **Static output only.** Production build (`dist/`) is 100% static; Keystatic admin runs only under `astro dev`, never in the production build.
- **mp3 files never enter git or the build.** `.gitignore` excludes `*.mp3`. Audio is served from `audio.songs.travisbriggs.com/<slug>.mp3`.
- **Preserve all original data:** all 170 songs including the 2 hidden (`dear_april_side_a`, `dear_april_side_b_remix`); preserve title, note, tags, date, duration, hidden flag.
- **Slugs come from the original `.md` filenames verbatim** (underscores and all) — NOT from the redesign `songs.json` (which normalized some). Keep per-song URLs at `/<slug>/`.
- **No `TB-###` catalog labels** anywhere.
- **Tag filter is OR/any.**
- **Fonts self-hosted** via `@fontsource`; no Google Fonts CDN requests.
- **Rainfall palette tokens** (exact values in `docs/design-reference/design_handoff_travis_briggs_site/README.md`): bg `#475569`, card `#1f2937`, player `#111827`, chip/rest `#374151`, borders `#374151`/`#4b5563`, text `#ffffff`/`#9ca3af`/`#cbd5e1`/`#6b7280`, accent `#3b82f6`/`#2563eb`/`#60a5fa`. Card radius 7px, content max-width 1000px, 44px inner padding.
- **Analytics:** Matomo (`rainfalldev.matomo.cloud`), site id from `PUBLIC_MATOMO_SITE_ID`; omit snippet entirely when the env var is unset.
- **Deploy `dist/` only** (never the repo root); verify no secret/source files are URL-reachable after deploy.
- **Design references** (read for exact layout/CSS/copy; do NOT port the `<x-dc>` runtime): index = `docs/design-reference/design_handoff_travis_briggs_site/Travis Briggs - Rainfall.dc.html` + its `README.md`; detail = `docs/design-reference/Song Detail.dc.html`.

## File Structure

```
astro.config.mjs          # astro + @astrojs/react + @keystatic/astro; output:'static'
keystatic.config.ts       # songs collection (local mode)
package.json              # engines>=22, packageManager pnpm@10.33.2, scripts
tsconfig.json  vitest.config.ts  .nvmrc  .node-version  .tool-versions  .gitignore
src/
  content.config.ts        # Astro content collection (glob loader) reading content/songs
  content/songs/<slug>.md   # migrated song content (Keystatic-managed)
  data/peaks/<slug>.json    # committed waveform peaks (array of 0..1 floats)
  lib/
    format.ts              # fmtDuration(ms), fmtMonthYear(date), fmtLongDate(date)
    songs.ts               # loadSongs(): SongData[] with derived fields
    related.ts             # relatedByTag(song, all), neighbors(song, ordered)
    tags.ts                # tagIndex(songs): {tags[], freq{}}
  stores/player.ts         # nanostores: $current, $isPlaying, $time, actions
  layouts/Base.astro       # shell: fonts, tokens, ClientRouter, Matomo, <Player> mount
  components/
    Nav.astro  Hero.astro  Controls.tsx  SongRow.astro
    Waveform.tsx           # interactive scrubber (shared)
    Player.tsx             # global persistent island
  pages/
    index.astro            # All Songs
    [slug].astro           # song detail (getStaticPaths over all songs incl hidden)
  styles/global.css        # tokens + base + keyframes
scripts/
  peaks.mjs                # mp3 -> peaks (ffmpeg); exported fn + used by migrate/add-song
  r2.mjs                   # uploadToR2(localPath, key)
  migrate.mjs              # one-time: original md -> content/songs + peaks + report
  add-song.mjs             # CLI ingest
```

---

### Task 1: Scaffold Astro project + tooling + version pins

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.nvmrc`, `.node-version`, `vitest.config.ts`, `src/env.d.ts`
- Already present: `.tool-versions` (nodejs 22.22.2)

**Interfaces:**
- Produces: a buildable Astro app with React + Keystatic integrations installed; `pnpm build` succeeds; `pnpm test` runs Vitest.

- [ ] **Step 1: Init git + package.json**

```bash
cd /home/tmoney/code/starred/songs2.travisbriggs.com
git init -b main
printf '22.22.2\n' > .nvmrc && cp .nvmrc .node-version
```

- [ ] **Step 2: Create `.gitignore`** (secrets + audio + build never committed)

```
node_modules
dist
.astro
.wrangler
# audio is never in git
*.mp3
# secrets — never commit or deploy
.env
.env.*
!.env.example
.dev.vars
.secrets
*.pem
*.key
credentials*
.DS_Store
```

- [ ] **Step 3: Install deps**

```bash
pnpm init
pnpm pkg set packageManager="pnpm@10.33.2" engines.node=">=22"
pnpm add astro @astrojs/react react react-dom @keystatic/core @keystatic/astro @nanostores/react nanostores
pnpm add @fontsource-variable/bricolage-grotesque @fontsource-variable/hanken-grotesk @fontsource/space-mono
pnpm add -D vitest @types/react @types/react-dom typescript
pnpm add -D @aws-sdk/client-s3 music-metadata   # used by scripts
```

- [ ] **Step 4: `astro.config.mjs`** — static output, React, Keystatic (dev-only admin)

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// Keystatic admin routes are needed only under `astro dev`. In a static
// production build we omit the integration so output stays fully static.
const dev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://songs.travisbriggs.com',
  output: 'static',
  integrations: [react(), ...(dev ? [keystatic()] : [])],
  trailingSlash: 'always', // preserve /<slug>/ URLs
});
```

- [ ] **Step 5: `tsconfig.json`** extends Astro strict; `vitest.config.ts` with `environment: 'node'`.

```jsonc
// tsconfig.json
{ "extends": "astro/tsconfigs/strict", "include": [".astro", "src", "scripts"], "compilerOptions": { "jsx": "react-jsx" } }
```

```js
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] } });
```

- [ ] **Step 6: Add scripts to package.json**

```bash
pnpm pkg set scripts.dev="astro dev" scripts.build="astro build" scripts.preview="astro preview" scripts.test="vitest run" scripts.migrate="node scripts/migrate.mjs" scripts.add-song="node scripts/add-song.mjs"
```

- [ ] **Step 7: Verify build + test scaffolding**

Run: `pnpm build` → Expected: builds an empty/placeholder site with no errors. `pnpm test` → Expected: "no test files" (exit 0) or passes.

- [ ] **Step 8: Commit** (local only — no push)

```bash
git add -A && git commit -m "chore: scaffold Astro + React + Keystatic project"
```

---

### Task 2: Self-hosted fonts + design tokens + base layout

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`

**Interfaces:**
- Produces: `Base.astro` (props: `title?`, `description?`) that imports fonts + tokens, renders `<ClientRouter />`, the Matomo snippet, a `<slot/>`, and mounts the persistent `<Player client:load transition:persist />` (added in Task 9 — leave a commented mount until then).

- [ ] **Step 1: `global.css`** — `:root` CSS variables for the full Rainfall palette + the `pulseDot`/`eqbar`/`nr-bar` keyframes (copy exact values from the design-reference README §Color and the detail file `<style>`). Set `body{background:var(--bg);color:var(--text)}`.

- [ ] **Step 2: Font imports** at top of `global.css`:

```css
@import '@fontsource-variable/bricolage-grotesque';
@import '@fontsource-variable/hanken-grotesk';
@import '@fontsource/space-mono/400.css';
@import '@fontsource/space-mono/700.css';
```

- [ ] **Step 3: `Base.astro`** shell with `<head>` (title pattern `Songs and Sounds by Travis Briggs{ - title}`), `import '../styles/global.css'`, `<ClientRouter />` from `astro:transitions`, and the Matomo snippet guarded by `import.meta.env.PUBLIC_MATOMO_SITE_ID`.

```astro
---
import { ClientRouter } from 'astro:transitions';
import '../styles/global.css';
const { title, description } = Astro.props;
const matomoId = import.meta.env.PUBLIC_MATOMO_SITE_ID;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{`Songs and Sounds by Travis Briggs${title ? ' - ' + title : ''}`}</title>
    {description && <meta name="description" content={description} />}
    {matomoId && <script is:inline set:html={`var _paq=window._paq=window._paq||[];_paq.push(['trackPageView']);_paq.push(['enableLinkTracking']);(function(){var u='https://rainfalldev.matomo.cloud/';_paq.push(['setTrackerUrl',u+'matomo.php']);_paq.push(['setSiteId','${matomoId}']);var d=document,g=d.createElement('script'),s=d.getElementsByTagName('script')[0];g.async=true;g.src='https://cdn.matomo.cloud/rainfalldev.matomo.cloud/matomo.js';s.parentNode.insertBefore(g,s);})();`} />}
    <ClientRouter />
  </head>
  <body>
    <slot />
    <!-- <Player client:load transition:persist /> added in Task 9 -->
  </body>
</html>
```

- [ ] **Step 4: Verify** `pnpm build` succeeds and no Google Fonts URL appears in `dist/`:

Run: `pnpm build && ! grep -rq 'fonts.googleapis.com' dist`
Expected: exit 0 (no CDN font references).

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: base layout, self-hosted fonts, Rainfall tokens, Matomo"`

---

### Task 3: Keystatic config + Astro content collection

**Files:**
- Create: `keystatic.config.ts`, `src/content.config.ts`

**Interfaces:**
- Produces: a `songs` collection with fields `title` (text), `date` (date), `tags` (array of text), `duration` (number, integer), `hidden` (checkbox), and the note as the markdown `content` body. Slug field = filename. Astro `getCollection('songs')` returns entries with `data.{title,date,tags,duration,hidden}` and `body`/rendered content.

- [ ] **Step 1: `keystatic.config.ts`** (local storage)

```ts
import { config, collection, fields } from '@keystatic/core';
export default config({
  storage: { kind: 'local' },
  collections: {
    songs: collection({
      label: 'Songs',
      slugField: 'title',
      path: 'src/content/songs/*',
      format: { contentField: 'note' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date', validation: { isRequired: true } }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (p) => p.value }),
        duration: fields.integer({ label: 'Duration (ms)' }),
        hidden: fields.checkbox({ label: 'Hidden', defaultValue: false }),
        note: fields.markdoc({ label: 'Note', options: { /* prose */ } }),
      },
    }),
  },
});
```

> Note: `slugField: 'title'` makes Keystatic derive the slug from the title for NEW songs. Migrated songs keep their original filename slug regardless. Confirm in Task 5 that migration writes files named `<original-slug>.md` and that Keystatic lists/edits them correctly; if `fields.slug` fights the preserved slugs, switch the note format to `format: { contentField: 'note' }` with `path` only and store the slug implicitly via filename.

- [ ] **Step 2: `src/content.config.ts`** — Astro glob loader over the same files

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const songs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/songs' }),
  schema: z.object({
    title: z.string(),
    date: z.string(), // ISO yyyy-mm-dd
    tags: z.array(z.string()).default([]),
    duration: z.number().int().default(0),
    hidden: z.boolean().default(false),
  }),
});
export const collections = { songs };
```

- [ ] **Step 3:** Add one hand-written sample `src/content/songs/_sample.md` to verify the schema, run `pnpm build`, then delete it. (Migration replaces it.)

Run: `pnpm build` → Expected: success; `getCollection` typing resolves.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat: Keystatic + Astro content schema for songs"`

---

### Task 4: Formatting + derived-data libs (pure, TDD)

**Files:**
- Create: `src/lib/format.ts`, `src/lib/related.ts`, `src/lib/tags.ts`
- Test: `src/lib/format.test.ts`, `src/lib/related.test.ts`, `src/lib/tags.test.ts`

**Interfaces:**
- Produces:
  - `fmtDuration(ms: number): string` → `m:ss`
  - `fmtMonthYear(iso: string): string` → `May 2026`
  - `fmtLongDate(iso: string): string` → `January 26, 2025`
  - `type Song = { slug:string; title:string; date:string; tags:string[]; duration:number; hidden:boolean; note:string; src:string; peaks:number[] }`
  - `relatedByTag(song: Song, all: Song[], limit=5): { song: Song; shared: string[] }[]` (exclude self + hidden; rank by shared-tag count desc, then date desc; top `limit`)
  - `neighbors(song: Song, orderedNewestFirst: Song[]): { older?: Song; newer?: Song }` (older = next index, newer = prev index)
  - `tagIndex(songs: Song[]): { tags: string[]; freq: Record<string,number> }` (sorted tags; freq over non-hidden)

- [ ] **Step 1: Write failing tests** for each function with concrete cases, e.g.:

```ts
// format.test.ts
import { expect, test } from 'vitest';
import { fmtDuration, fmtMonthYear, fmtLongDate } from './format';
test('fmtDuration', () => { expect(fmtDuration(100649)).toBe('1:41'); expect(fmtDuration(245000)).toBe('4:05'); });
test('fmtMonthYear', () => expect(fmtMonthYear('2026-05-28')).toBe('May 2026'));
test('fmtLongDate', () => expect(fmtLongDate('2025-01-26')).toBe('January 26, 2025'));
```

```ts
// related.test.ts — relatedByTag ranks by shared count, excludes self+hidden; neighbors by order
```

- [ ] **Step 2: Run** `pnpm test` → Expected: FAIL (functions undefined).
- [ ] **Step 3: Implement** the three lib files (pure functions; no I/O).
- [ ] **Step 4: Run** `pnpm test` → Expected: PASS.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: formatting + related/neighbors/tags libs (tested)"`

---

### Task 5: Peaks generation lib (TDD) + run later

**Files:**
- Create: `scripts/peaks.mjs`
- Test: `scripts/peaks.test.mjs`

**Interfaces:**
- Produces: `export async function generatePeaks(mp3Path: string, buckets=72): Promise<number[]>` — decodes mp3 to mono PCM via ffmpeg, returns `buckets` normalized amplitudes in `[0,1]` (max abs per bucket, normalized to the track's peak). Used by migrate + add-song; output stored as `src/data/peaks/<slug>.json`.

- [ ] **Step 1: Write failing test** using a real source mp3:

```js
import { expect, test } from 'vitest';
import { generatePeaks } from './peaks.mjs';
test('generatePeaks returns normalized buckets', async () => {
  const p = await generatePeaks('/home/tmoney/code/starred/songs.travisbriggs.com/static/mp3/monthly.mp3', 72);
  expect(p).toHaveLength(72);
  expect(Math.max(...p)).toBeLessThanOrEqual(1);
  expect(Math.min(...p)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...p)).toBeGreaterThan(0.5); // some signal, normalized
}, 30000);
```

- [ ] **Step 2: Run** `pnpm test scripts/peaks.test.mjs` → FAIL.
- [ ] **Step 3: Implement** using ffmpeg to raw PCM (`ffmpeg -i in.mp3 -ac 1 -ar 8000 -f s16le -`), bucket the samples, take max abs per bucket, normalize by global max.
- [ ] **Step 4: Run** test → PASS.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: ffmpeg waveform peaks generator (tested)"`

---

### Task 6: Migration script — original md → content/songs + peaks + report

**Files:**
- Create: `scripts/migrate.mjs`, `scripts/parse-frontmatter.mjs`
- Test: `scripts/parse-frontmatter.test.mjs`

**Interfaces:**
- Consumes: `generatePeaks` (Task 5); original files at `../songs.travisbriggs.com/songs/*.md` and `../songs.travisbriggs.com/static/mp3/*.mp3`.
- Produces: `parseFrontmatter(raw: string): { meta:{title,date,duration,tags,hidden}, note:string }` handling the legacy format (`key: value` lines incl. Python-list `tags: ['a','b']`, `date: YYYY/MM/DD`, optional `hidden: true`, blank line, then note body). Writes `src/content/songs/<slug>.md` (date→ISO, tags as YAML list, note as body) and `src/data/peaks/<slug>.json`. Prints a report: total in/out, missing mp3s, tag count.

- [ ] **Step 1: Write failing test** for `parseFrontmatter` with the real legacy shape:

```js
import { expect, test } from 'vitest';
import { parseFrontmatter } from './parse-frontmatter.mjs';
const raw = "title: Monthly\ndate: 2026/05/28\nduration: 245000\ntags: ['electronic', 'breakbeat']\n\nYes, this track...";
test('parses legacy frontmatter', () => {
  const { meta, note } = parseFrontmatter(raw);
  expect(meta.title).toBe('Monthly');
  expect(meta.date).toBe('2026-05-28');
  expect(meta.duration).toBe(245000);
  expect(meta.tags).toEqual(['electronic','breakbeat']);
  expect(meta.hidden).toBe(false);
  expect(note.trim()).toBe('Yes, this track...');
});
test('parses hidden flag', () => {
  expect(parseFrontmatter("title: X\ndate: 2020/01/01\nduration: 0\ntags: []\nhidden: true\n\n").meta.hidden).toBe(true);
});
```

- [ ] **Step 2: Run** test → FAIL.
- [ ] **Step 3: Implement** `parse-frontmatter.mjs` (split on first blank line; parse the Python list via a safe JSON-ish transform: replace single quotes, `JSON.parse`; convert date).
- [ ] **Step 4: Run** test → PASS.
- [ ] **Step 5: Implement `migrate.mjs`** — iterate all 170 md, write content files + peaks, collect report; assert 170 written.
- [ ] **Step 6: Run migration**

Run: `pnpm migrate`
Expected: report prints `songs: 170/170`, lists the 1 missing mp3, `tags: <N> unique`; `src/content/songs/` has 170 files; `src/data/peaks/` has 169 (the missing-mp3 song gets an empty/placeholder peaks entry — note it in the report).

- [ ] **Step 7: Data-integrity assertions**

Run: `ls src/content/songs/*.md | wc -l` → `170`; `grep -l 'hidden: true' src/content/songs/*.md | wc -l` → `2`.

- [ ] **Step 8: Commit** `git add -A && git commit -m "feat: migrate 170 songs + peaks from original site (data preserved)"`

---

### Task 7: Song data layer

**Files:**
- Create: `src/lib/songs.ts`
- Test: `src/lib/songs.test.ts` (unit-test the pure assembly given fixture entries)

**Interfaces:**
- Consumes: `getCollection('songs')`, peaks JSON imports, `src/lib/{format,related,tags}`.
- Produces: `loadSongs(): Promise<Song[]>` newest-first, each with `src` (`${AUDIO_BASE}/${slug}.mp3`), `peaks` (from `src/data/peaks/<slug>.json`, default synthetic if missing), `note` (rendered/raw). `AUDIO_BASE = import.meta.env.PUBLIC_AUDIO_BASE ?? 'https://audio.songs.travisbriggs.com'`. Also `visibleSongs(all)` (exclude hidden), and re-export `tagIndex`, `relatedByTag`, `neighbors`.

- [ ] **Step 1–4 (TDD):** test that `loadSongs` sorts newest-first, builds correct `src`, excludes hidden from `visibleSongs`, and attaches peaks. Implement; pass.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: song data layer (src/peaks/derived fields)"`

---

### Task 8: Player store + global persistent Player island

**Files:**
- Create: `src/stores/player.ts`, `src/components/Player.tsx`, `src/components/Waveform.tsx`
- Modify: `src/layouts/Base.astro` (mount `<Player client:load transition:persist />`)

**Interfaces:**
- Produces:
  - store: `$current: Track|null`, `$isPlaying: boolean`, `$time:{cur:number,dur:number}`; actions `playTrack(track)`, `toggle()`, `seek(frac)`. `type Track = { slug,title,src,tags:string[],peaks:number[] }`.
  - `Waveform.tsx` props `{ peaks:number[]; progress:number; onSeek(frac):void; height?:number; variant:'mini'|'big' }` — renders bars; played vs unplayed coloring (`#3b82f6`/`#4b5563` for big; gradient for mini); click/drag seeks.
  - `Player.tsx` — owns the single `<audio>`, subscribes to store, renders the bottom bar (play/pause, title + tag sub-line **without TB-###**, `<Waveform variant='mini'>`, `cur / dur` timecode). Persists `{slug, time}` to `localStorage` and restores on mount.

- [ ] **Step 1:** Implement `player.ts` with nanostores; unit-test `seek`/`toggle` reducers.
- [ ] **Step 2:** Implement `Waveform.tsx` (pointer events → fraction; keyboard a11y: arrows seek).
- [ ] **Step 3:** Implement `Player.tsx`; wire `<audio>` events (`timeupdate`, `ended`, `loadedmetadata`) to the store; `transition:persist` keeps it mounted across nav.
- [ ] **Step 4:** Mount in `Base.astro`.
- [ ] **Step 5: Verify** `pnpm dev`, load home, play a track, navigate to a detail page → audio keeps playing without restart. (Manual checkpoint.)
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: global persistent player + waveform scrubber"`

---

### Task 9: Shared components — Nav, Hero, SongRow

**Files:**
- Create: `src/components/Nav.astro`, `src/components/Hero.astro`, `src/components/SongRow.astro`

**Interfaces:**
- Produces: `Nav.astro` (the floating/back nav links — props `active?`, `back?`); `Hero.astro` (eyebrow, TRAVIS/**BRIGGS**, blurb, photo slot); `SongRow.astro` (props `{ song, shared?: string[] }`) rendering one row exactly per the index/detail row spec (note `♪`, title, tag chips, date `Mon YYYY`, duration accent, 34px play button). Play button carries `data-slug`/`data-src`/peaks for the client island to wire into the player.

- [ ] **Step 1–3:** Build each component to the exact styles in the design references (copy CSS values verbatim). No tests (presentational); verified via the page tasks.
- [ ] **Step 4: Commit** `git add -A && git commit -m "feat: Nav, Hero, SongRow components"`

---

### Task 10: Index page + sort/filter island

**Files:**
- Create: `src/pages/index.astro`, `src/components/Controls.tsx`
- Test: covered by `related/tags` libs + a build check

**Interfaces:**
- Consumes: `loadSongs`, `tagIndex`, `SongRow`, `Hero`, `Nav`, `Player` (via Base).
- Produces: index renders all visible songs as rows at build (SEO/no-JS), plus `Controls.tsx` island that sorts (Newest default / Oldest / A–Z / Shuffle) and filters by tags (**OR**) client-side by toggling row visibility + reordering. Clicking a row/play button calls `playTrack`. Reads `?tag=` from URL to pre-apply a filter (used by tag links from detail pages). `N TRACKS` count is dynamic.

- [ ] **Step 1:** Render hero + controls bar + `<ul>` of `SongRow` for `visibleSongs`.
- [ ] **Step 2:** `Controls.tsx` — sort pills (active=filled, default=ghost) + Tags+ multiselect; operate on the DOM rows (data attributes) or re-render from a passed song array. Implement OR filtering + empty-state joke.
- [ ] **Step 3:** Wire play buttons → `playTrack`.
- [ ] **Step 4: Verify** `pnpm build` + `pnpm preview`: sorting, tag filter (OR), inline play all work; `?tag=punk.rock` pre-filters.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: index page with sort/filter/play"`

---

### Task 11: Song detail page

**Files:**
- Create: `src/pages/[slug].astro`

**Interfaces:**
- Consumes: `loadSongs`, `relatedByTag`, `neighbors`, `SongRow`, `Nav`, `Waveform`.
- Produces: `getStaticPaths()` over **all** songs (including hidden, so hidden pages exist but aren't linked); renders the full detail design (`docs/design-reference/Song Detail.dc.html`): top bar, "Now Playing" centerpiece (**no TB-###**), big play + `<Waveform variant='big'>`, action row (Download MP3 → `song.src` with `download`; Copy link → copies `Astro.url`/canonical; CC BY-SA 4.0), "— About this one" note (fallback line when empty), "— More like this" (top-5 `relatedByTag`, exclude hidden), Older/Newer prev-next (`neighbors` over visible newest-first), license footer. Big play + related rows call `playTrack`.

- [ ] **Step 1:** Build the page to the reference; wire client interactions (play, copy-link) via a small inline script/island.
- [ ] **Step 2: Verify** a few pages render; related ranking correct; prev/next correct at ends; hidden-song page builds but isn't linked from index/related.
- [ ] **Step 3: Commit** `git add -A && git commit -m "feat: song detail page (centerpiece, related, prev/next, license)"`

---

### Task 12: `add-song` CLI + R2 upload helper

**Files:**
- Create: `scripts/r2.mjs`, `scripts/add-song.mjs`, `.env.example`

**Interfaces:**
- Consumes: `generatePeaks` (Task 5), `music-metadata` for duration.
- Produces: `uploadToR2(localPath, key)` via `@aws-sdk/client-s3` (endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, creds from env `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_ACCOUNT_ID`/`R2_BUCKET`). `add-song <mp3> [--slug s] [--title t]`: derive slug (from `--slug` or sanitized filename), read duration, generate peaks → `src/data/peaks/<slug>.json`, upload mp3 to R2 as `<slug>.mp3`, scaffold `src/content/songs/<slug>.md` (frontmatter + empty note). `.env.example` documents the R2 vars (real `.env` gitignored).

- [ ] **Step 1:** Implement `r2.mjs`; **Step 2:** Implement `add-song.mjs`; **Step 3:** dry-run path (peaks+scaffold without upload when `--no-upload`) so it's testable offline.
- [ ] **Step 4: Verify** `node scripts/add-song.mjs <some.mp3> --no-upload` scaffolds content + peaks correctly.
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat: add-song CLI + R2 upload helper"`

---

### Task 13: Provision R2 + upload all audio  ⚠️ outward-facing (confirm before running)

**Files:** none (infra) — uses `CF_API_TOKEN` / wrangler.

**Interfaces:** Produces a public R2 bucket bound to `audio.songs.travisbriggs.com` containing all 169 mp3s under `<slug>.mp3`.

- [ ] **Step 1:** Create bucket: `npx wrangler r2 bucket create songs-travisbriggs-audio`.
- [ ] **Step 2:** Connect custom domain `audio.songs.travisbriggs.com` to the bucket (dashboard or API) + enable public access.
- [ ] **Step 3:** Bulk-upload from `../songs.travisbriggs.com/static/mp3/*.mp3` (loop `wrangler r2 object put` or the S3 helper).
- [ ] **Step 4: Verify** `curl -sI https://audio.songs.travisbriggs.com/monthly.mp3` → `200`, `content-type: audio/mpeg`.

---

### Task 14: Cloudflare Pages deploy + security verification  ⚠️ outward-facing (confirm)

**Files:** Create `wrangler.toml` (Pages name/output) if using wrangler deploy.

- [ ] **Step 1:** `pnpm build` (production → static, no Keystatic admin in `dist/`).
- [ ] **Step 2:** Create Pages project + deploy **dist only**: `npx wrangler pages deploy dist --project-name songs-travisbriggs`. Set `PUBLIC_MATOMO_SITE_ID` + `PUBLIC_AUDIO_BASE` as Pages env vars.
- [ ] **Step 3: Security verify** (per hard rule):

```bash
for p in .env .dev.vars .git/config keystatic.config.ts src/content/songs/monthly.md; do echo "== /$p =="; curl -sS --max-time 10 "https://<pages-url>/$p" | head -c 80; echo; done
```
Expected: no real file bytes (404 / HTML fallback only).

- [ ] **Step 4:** Confirm `/keystatic` is NOT present in production.

---

### Task 15: DNS cutover + retire Netlify  ⚠️ outward-facing (explicit confirm)

- [ ] **Step 1:** Point `songs.travisbriggs.com` at the Pages project (custom domain) — Cloudflare DNS (zone already on Cloudflare).
- [ ] **Step 2:** Verify the live domain serves the new site + audio + a sample song page over content (not just status).
- [ ] **Step 3:** Remove/disable the Netlify deploy for `songs.travisbriggs.com`.
- [ ] **Step 4: Final commit / tag** `git commit -m "chore: production cutover"` (and push to a remote once one is chosen).

---

## Self-Review

**Spec coverage:** scaffold/stack (T1), fonts+tokens+layout+Matomo (T2), Keystatic+content schema (T3), formatting/related/neighbors/tags (T4), peaks (T5), migration+data preservation incl. hidden & missing-mp3 reconciliation (T6), data layer/src derivation (T7), persistent player+waveform (T8), shared components (T9), index sort/filter/OR/play (T10), detail page incl. download/copy-link/related/prev-next/license/no-TB-### (T11), add-song CLI+R2 (T12), R2 provisioning+upload (T13), Pages deploy+security verify+dist-only (T14), DNS cutover (T15). Slugs-from-filename, `/<slug>/` URLs, no-TB-###, OR filter, self-hosted fonts, audio-out-of-git all encoded as Global Constraints. ✅

**Placeholders:** none of the prohibited kinds; design-reference pointers reference concrete committed files with exact values (legitimate DRY, not "TBD").

**Type consistency:** `Song` shape defined in T4 and reused in T7/T8/T10/T11; `Track` defined in T8 and used by Player/rows; `generatePeaks`/`uploadToR2`/`parseFrontmatter` signatures consistent across T5/T6/T12.

**Risks flagged:** Keystatic-slug-vs-preserved-filename (T3 note); Keystatic-in-static-build dev-only gating (T1/astro.config); outward-facing infra gated in T13–T15.
