# songs.travisbriggs.com

Travis Briggs' personal song catalog — ~170 self-recorded demos, jokes, and
heartbreakers. A static site with a global persistent audio player, tag-based
browsing, per-song pages, and a local-mode CMS. This is the ground-up rebuild of
the original Flask/Frozen-Flask site, with the "Rainfall" visual design.

## Stack

- **[Astro](https://astro.build)** (static output) + **React** islands
- **[Keystatic](https://keystatic.com)** local-mode CMS (edits the song content files)
- **Cloudflare R2** for the mp3 files, served from `audio.songs.travisbriggs.com`
- **Cloudflare Pages** for hosting
- Self-hosted fonts (Bricolage Grotesque / Hanken Grotesk / Space Mono)
- Matomo analytics (optional, via `PUBLIC_MATOMO_SITE_ID`)

Node **22.x** (pinned via `.tool-versions` / `.nvmrc`), pnpm.

## How it works

- Each song is a YAML data file at `src/content/songs/<slug>.yaml`
  (`title`, `date`, `duration` ms, `tags`, `hidden`, `note`). The filename is the
  slug and maps to the audio at `audio.songs.travisbriggs.com/<slug>.mp3` and the
  per-song page at `/<slug>/`.
- Waveform **peaks** are precomputed and served from `public/peaks/<slug>.json`;
  the player fetches them when a track loads.
- Each song has a **cover image** at `public/covers/<slug>.jpg` (committed to git,
  like the peaks). By default it's deterministic **waveform art** rendered from the
  song's peaks — a unique per-slug color and its real waveform shape. Any cover can
  be replaced with **fal.ai FLUX.2** art from a prompt (see [Covers](#covers)).
  Covers are the `og:image` / `twitter:image` on song pages and the thumbnail in the
  `/embed/<slug>/` player card.
- The **mp3 files are never in git** (`*.mp3` is gitignored) — they live in R2.
- One `<audio>` element lives in a `transition:persist` React island, so playback
  continues uninterrupted as you navigate between the index and song pages.
- Song pages emit **`twitter:player` + OpenGraph tags** pointing at a minimal
  `/embed/<slug>/` page, so a posted song link unfurls into a playable inline
  audio card on Mastodon (official web UI/apps; most third-party clients show a
  static card instead — expected). The embed pages must stay framable from any
  origin, so never add `X-Frame-Options` or a `frame-ancestors` CSP to `/embed/*`.
  Instances cache cards ~14 days; append a dummy query param to force a fresh
  card while testing.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

- The CMS admin is at **http://localhost:4321/keystatic/** (local mode — it reads
  and writes the files in `src/content/songs/`). It only runs under `astro dev`;
  the production build is fully static and contains no admin.
- Add **`?show_player=0`** to any URL to hide the player (and skip the saved-track
  restore) — handy for clean previews/screenshots.

## Add or edit a song

**Add a new song (with audio):**

```bash
pnpm add-song path/to/track.mp3 [--slug my-slug] [--title "My Title"] [--date YYYY-MM-DD]
```

This uploads the mp3 to R2, reads its duration, generates the waveform peaks, renders
the waveform **cover** (`public/covers/<slug>.jpg`), and scaffolds
`src/content/songs/<slug>.yaml`. Then open `/keystatic/` to write the note and tags.
(`--no-upload` skips R2 for offline scaffolding.)

The upload uses your Cloudflare token (`CF_API_TOKEN` from `~/.secrets`, or `.env`) via
wrangler — no separate R2 key. Copy `.env.example` → `.env` for the bucket/account config.
`add-song` is idempotent: re-running on an existing song keeps its note/tags/date and
just refreshes the duration/peaks/audio.

**Edit an existing song:** `pnpm dev` → `/keystatic/` → edit → commit & push.

## Tags

Tags are chosen in Keystatic from a **fixed canonical list** (`src/data/tags.ts`) —
you pick from existing tags instead of free-typing, which prevents drift/variants.

- **Add a new tag** (e.g. for a bebop / acid-house song): `pnpm tags:gen acid.house bebop`
  adds them to the list — then restart `pnpm dev` so the Tags picker shows them.
- **Re-sync the list** after any tag change: `pnpm tags:gen` (union of tags used across
  songs + any you've added to the file).
- **Reorganize in bulk** — merge / rename / delete tags across every song: `pnpm tag-tool`
  opens a local UI (shows song titles per tag, sorted by count); hit Apply to rewrite the
  song files, then run `pnpm tags:gen`.

`pnpm recalc-durations` re-derives every song's duration from its mp3 (one-off maintenance).

## Covers

Every visible song has a cover at `public/covers/<slug>.jpg` (committed to git). There
are two kinds:

**1. Waveform art (default).** Deterministic SVG→JPEG rendered from the song's peaks —
a stable per-slug hue and the track's real waveform, in the Rainfall style. No AI, no
network. `add-song` renders one automatically; regenerate any time with:

```bash
pnpm covers:gen                 # render covers that are missing (visible songs)
pnpm covers:gen --all           # re-render every non-AI cover
pnpm covers:gen <slug> [...]    # specific slugs
```

Output is byte-identical run to run, so regenerating never churns git.

**2. fal.ai FLUX.2 art (per-track, on demand).** Run `pnpm dev`, open a song page
(`/<slug>/`), and use the **"Cover · dev only"** panel: type a prompt, hit **Generate
with fal.ai**. It calls FLUX.2, writes `public/covers/<slug>.jpg`, and records the slug
in `src/data/ai-covers.json` so `covers:gen` / `add-song` won't overwrite your art. To
go back to waveform art for a slug: `pnpm covers:gen <slug> --force` (clears its
manifest entry).

- Needs a fal.ai key: put `FAL_KEY=…` in `.env` (or your shell). It's read **only** by
  the `astro dev` server (`integrations/cover-admin.mjs`) and never ships to `dist/` —
  the endpoint and the button exist in dev alone, like Keystatic.
- CLI equivalent for testing: `node scripts/fal-cover.mjs <slug> "<prompt>"`.
- **Costs money** (fal.ai usage) — each click is one paid generation.

After generating (either kind), commit the new/changed jpg(s). Since instances cache
social cards ~14 days, a cover change won't update already-posted links.

## Build & deploy

```bash
pnpm build        # -> dist/ (static)
```

**Pushing to `main` auto-deploys** via GitHub Actions (`.github/workflows/deploy.yml`): it
builds and publishes **`dist/` only** to Cloudflare Pages (live at songs.travisbriggs.com).
Audio is served from Cloudflare R2 at `audio.songs.travisbriggs.com`.

A **pre-push hook** + a CI step (`pnpm check-assets`) block the push/deploy if any visible
song is missing its mp3 in R2 (bypass with `git push --no-verify`).

`PUBLIC_AUDIO_BASE` and `PUBLIC_MATOMO_SITE_ID` default correctly in code; override via env
only if needed.

> Security: pure static site; deploys `dist/` only (never the repo root). The R2 upload
> uses your Cloudflare token from `~/.secrets` (or `.env`) — never committed or in `dist/`.
> `FAL_KEY` is used only by the dev server for cover generation and is likewise never in
> `dist/`; the `/api/gen-cover` endpoint exists in `astro dev` alone.

## Tests

```bash
pnpm test         # vitest (formatting, related/neighbors/tags, peaks, cover art, parser, player, data layer)
```

## Data

Migrated from the original site's `songs/*.md` (the source of truth). All 170 song
records are preserved, including 2 hidden, metadata-only drafts
(`dear_april_side_a`, `dear_april_side_b_remix`) whose audio never existed. An
orphan `tall-buildings.mp3` on the old site had no song metadata and was left out.

The one-time migration script lives at `scripts/migrate.mjs`.

## License

Site content and audio: **CC BY-SA 4.0**. Recorded by Travis Briggs.
