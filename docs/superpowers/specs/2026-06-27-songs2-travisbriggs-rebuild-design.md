# songs2.travisbriggs.com — ground-up rebuild

**Status:** Design / spec (awaiting review)
**Date:** 2026-06-27
**Replaces:** the current Flask/Frozen-Flask site at `../songs.travisbriggs.com`

## 1. Goal

Rebuild Travis Briggs' personal song catalog (~170 hand-recorded songs) as a modern
static site with a fresh visual design and a completely redone content/edit/build/deploy
pipeline. Keep it a **static site**; keep the **mp3 files out of the git repo**; preserve
**all data of the original** (every song, note, tag, date, duration, including hidden songs).

Model: the architecture/feel of `null.dangerthirdrail.com` (Rainfall palette, global
persistent player, per-song notes, tag system) — but for the human-recorded songs catalog,
with real per-song pages and related-song links by tag and by posting date.

## 2. Locked decisions

| Area | Decision |
|---|---|
| Generator | **Astro** (static output) + **React** islands (React is required by Keystatic; reused for the player island) |
| Content/CMS | **Keystatic, local mode only** — `astro dev` → `/keystatic`; edits commit to git; production build is 100% static (no admin, no auth, no serverless) |
| Audio ingest | **CLI** (`add-song`) — uploads mp3 to R2, reads duration, generates waveform peaks, scaffolds the song's content file |
| Audio hosting | **Cloudflare R2**, served from `audio.songs.travisbriggs.com` (public bucket + custom domain) |
| Deploy | **Cloudflare Pages**, Git-connected, publishes `dist/` only |
| Palette | Rainfall (dark slate `#1f2937` card on `#475569`, blue `#3b82f6` accent) — the approved redesign |
| Fonts | **Self-hosted** (`@fontsource`): Bricolage Grotesque, Hanken Grotesk, Space Mono |
| Catalog ids | **Removed** — no `TB-###` labels anywhere |
| Tag filter logic | **OR/any** (matches the current site) |
| URL scheme | Preserve `/<slug>/` per-song URLs so inbound links survive |
| Per-song colors | Dropped (Rainfall palette replaces them) |
| Analytics | **Matomo** (`rainfalldev.matomo.cloud`, like Null Rail), site id via `PUBLIC_MATOMO_SITE_ID` config |

## 3. Architecture

- **Astro** project, `output: 'static'`. Public site is pre-rendered HTML + small client JS.
- **Content** = one markdown file per song in `src/content/songs/<slug>.md`, git-versioned,
  edited via **Keystatic local mode**. The Keystatic admin (`/keystatic`, `/api/keystatic/*`)
  runs only under `astro dev`; the production static build does not include it.
- **Audio** lives in **R2** (`audio.songs.travisbriggs.com/<slug>.mp3`); never in git, never in
  the build. Audio URL is derived from slug (same convention as the current site).
- **Waveform peaks** are generated at ingest and committed as small sidecar JSON
  (`src/data/peaks/<slug>.json`) so the build is self-contained (no R2 fetch at build time).
- **Build** = `astro build` → `dist/`, published by **Cloudflare Pages**.
- **Persistent global player**: Astro `<ClientRouter />` (view transitions) for client-side
  navigation + a `transition:persist` React island holding the single `<audio>` element, so
  playback continues uninterrupted across index↔detail navigation. Current track + position
  persisted in memory (and `localStorage` to resume on reload).

> **Implementation note (flagged risk):** wiring Keystatic local-mode into a `static`-output
> Astro build has a known config wrinkle — the admin routes must be dev-only and excluded from
> the static production build. Solved pattern; the exact config will be nailed in the plan.

## 4. Data model (Keystatic `songs` collection)

`src/content/songs/<slug>.md`, slug preserved exactly from the current site.

| Field | Type | Notes |
|---|---|---|
| `title` | text | |
| `date` | date (ISO `YYYY-MM-DD`) | migrated from current `YYYY/MM/DD` |
| `tags` | array of text | free-form; preserves dotted style (`male.vocals`, `heavy.guitar`) |
| `duration` | number (ms) | written by the CLI from the mp3; not hand-edited |
| `hidden` | checkbox | preserves the 2 hidden songs (built but excluded from index/related) |
| `note` | markdown body (`contentField`) | the personal story; may be empty (10 songs) |

Derived (not stored): audio URL (`${AUDIO_BASE}/${slug}.mp3`), the global tag set + tag
frequencies (computed at build from all songs), prev/next neighbors (date order),
related-by-tag ranking.

## 5. Data migration & preservation (critical)

Source of truth for migration is the **original `../songs.travisbriggs.com/songs/*.md`
(all 170 files, including the 2 `hidden`)** — NOT the redesign `songs.json`, which is a lossy
snapshot that already drops hidden songs.

One-time migration script:

1. Parse each `.md`: frontmatter (`title`, `date`, `duration`, `tags` as a Python-list
   literal → array, `hidden`) and body → `note`. Convert `date` `YYYY/MM/DD` → ISO.
2. Locate each song's mp3 by slug (local `../songs.travisbriggs.com/static/mp3/` and/or the
   live site), upload to R2, generate peaks JSON.
3. Write the Keystatic content file, **preserving the exact slug**.
4. **Verify:** 170 songs in → 170 out; every tag preserved; every visible song has audio +
   peaks; report any song whose mp3 is missing. (Local inventory already shows **170 md vs
   169 mp3** — likely a hidden song the old `restore.py` never fetched since it scrapes only
   the public index. Reconcile explicitly; never silently drop a song.)

## 6. Pages

### 6.1 Index / "All Songs" (`/`) — from `redesign.zip` (`Travis Briggs - Rainfall.dc.html`)

Hi-fi spec is in `docs/design-reference/design_handoff_travis_briggs_site/README.md`. Summary:
1000px `#1f2937` card on `#475569`.
- **Hero:** floating nav (All Songs / travisbriggs.com↗ / Mastodon↗ / GitHub↗), eyebrow
  `▶ SONGS & SOUNDS · EST. 2008`, `TRAVIS` / **`BRIGGS`** (Bricolage 800 86px), blurb, photo
  slot (you supply the photo).
- **Controls bar:** `168 TRACKS`, sort pills (Newest active / Oldest / A–Z / Shuffle), Tags +
  multi-select filter. Active = filled blue; default = blue ghost.
- **Song rows** (rendered at build for SEO/no-JS; hydrated for interactivity): note `♪`
  (accent on hover), title (Bricolage 700 33px, ellipsis), tags (Space Mono 11px chips,
  clickable → filter, 2-line clip), date (`May 2026`), duration (`m:ss`, accent), 34px play
  button.
- **Global player bar** (see §7).

Behavior: sort (Newest default / Oldest / A–Z / Shuffle), multi-select tag filter (**OR**),
clicking a chip adds that tag to the filter, clear/show-all affordance, empty-state joke.

### 6.2 Song detail (`/<slug>/`) — from imported `Song Detail.dc.html`

Verbatim reference saved at `docs/design-reference/Song Detail.dc.html` (design reference only —
the `<x-dc>` runtime is NOT ported). Sections top→bottom inside the card:

1. **Top bar:** `← All Songs` back link + the same nav links.
2. **Now-playing centerpiece** (radial wash): pulsing-dot eyebrow **"Now Playing"**
   (Space Mono 700 11px blue — **no `· TB-###`**); title (Bricolage 800 56px); meta row =
   long date (`January 26, 2025`) · duration (`m:ss`) · clickable tag chips (→ index filtered
   by tag); **74px accent play button** + **large interactive waveform** (88px tall, ~72 bars,
   played `#3b82f6` / unplayed `#4b5563`, click/drag to seek) with `played` / `total` timecodes.
3. **Action row:** **↓ Download MP3** (blue filled, direct link to the R2 file, `download`
   attr), **⧉ Copy link** (ghost; copies the canonical page URL), **CC BY-SA 4.0** marker.
4. **"— About this one"** notes block: the song's note (17px, `#cbd5e1`, 62ch). When empty,
   show the fallback line: *"No note on this one — it speaks for itself. Or it doesn't. Press
   play and decide."*
5. **"— More like this"**: up to **5 related songs ranked by number of shared tags**
   (single merged list, exclude self + hidden), index row styling; each row shows its shared
   tags (top 2), `Mon YYYY`, `m:ss`, play button.
6. **Prev/Next cards:** **Older** (← + title) and **Newer** (title + →) — adjacent songs by
   date across the visible set; hide/`—` at the ends.
7. **Global player bar** (see §7).
8. **License footer:** "Everything here — audio included — is **CC BY-SA 4.0**. Recorded by
   Travis Briggs."

Playing anything here loads it into the **global** player without interrupting navigation.

## 7. Global persistent player

One instance, `transition:persist` across navigation. Bottom-docked, `#111827`. Contents:
play/pause (42px accent circle, glow), now-playing meta (title Bricolage 700 18px + sub-line
= **first ~3 tags joined by ` · `**, **no `TB-###`**), interactive waveform scrubber from the
precomputed peaks, `current / total` timecode. Loads tracks from index rows, detail play
button, and related rows; reflects active track; survives client-side route changes.

## 8. CMS / edit / build workflow

This replaces the old hand-edited-markdown + `id3.sh`/`track_length.py` + Frozen-Flask +
Netlify flow entirely.

- **Add a song:** `pnpm add-song ./demo.mp3 [--slug ...] [--title ...]` → uploads mp3 to R2,
  reads duration (ffprobe/music-metadata), generates peaks JSON, scaffolds the content file.
  Then `astro dev` → `/keystatic` → write note/tags/date/hidden → commit & push → Pages rebuilds.
- **Edit a song:** `astro dev` → `/keystatic` → edit → commit & push.
- **Migrate (one-time):** §5 script.

## 9. Storage, hosting & DNS cutover

- **R2 bucket** for audio, public via custom domain `audio.songs.travisbriggs.com`
  (Cloudflare-managed, like Null Rail's `audio.null...`).
- **Cloudflare Pages** project, Git-connected; build `astro build`; publish **`dist/` only**
  (per the hard rule — never deploy the repo root; verify `/.env`, `/.git/config`, etc. return
  nothing post-deploy). The only secret (R2 upload key) lives in the local CLI env / Cloudflare
  secret store, never in the repo or build.
- **Cutover:** `travisbriggs.com` is already on Cloudflare nameservers; `songs.` currently
  CNAMEs to Netlify. Point `songs.travisbriggs.com` at Pages, add the `audio.` record for R2,
  verify by content, then retire the Netlify site.

## 10. Design system tokens

Rainfall palette and type scale exactly per the redesign handoff
(`docs/design-reference/.../README.md`): bg `#475569`, card `#1f2937`, player `#111827`,
chip/rest `#374151`, borders `#374151`/`#4b5563`, text `#ffffff`/`#9ca3af`/`#cbd5e1`/`#6b7280`,
accent `#3b82f6` (+ `#2563eb`/`#60a5fa`), card radius 7px, content max-width 1000px, 44px
inner padding. Fonts self-hosted via `@fontsource`. Amber is an available alternate, not chosen.

## 11. Out of scope / stretch hooks

- **Likes** (stretch): the Cloudflare stack supports adding this later via KV/D1 + one Pages
  Function — no architecture change needed now. Not built.
- **Comments** (Disqus-style embed): zero architecture impact; not built.

## 12. Analytics

**Matomo** (same `rainfalldev.matomo.cloud` cloud as Null Rail). The tracker snippet is added
once in the base layout, with the site id read from `PUBLIC_MATOMO_SITE_ID` (Astro public env)
so it is not hardcoded. If the env var is unset, the snippet is omitted (no broken tracking in
local dev / previews). Travis supplies the songs2 site id.

No remaining open items.

## 13. Success criteria

- All 170 original songs present (incl. 2 hidden), with notes, tags, dates, durations intact;
  migration verification report shows 170/170 and reconciles the missing mp3.
- Index matches the redesign hi-fi spec; detail page matches the imported design (minus
  `TB-###`); both render correctly without JS, then hydrate.
- Audio plays from R2; the global player persists across index↔detail navigation.
- `add-song` CLI ingests a new mp3 end-to-end; Keystatic local admin edits content; push
  triggers a Cloudflare Pages rebuild.
- Deploy serves only public assets (no secret/source files reachable by URL).
- `/<slug>/` URLs preserved; fonts self-hosted; no Google Fonts CDN calls.
