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
- The **mp3 files are never in git** (`*.mp3` is gitignored) — they live in R2.
- One `<audio>` element lives in a `transition:persist` React island, so playback
  continues uninterrupted as you navigate between the index and song pages.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

- The CMS admin is at **http://localhost:4321/keystatic/** (local mode — it reads
  and writes the files in `src/content/songs/`). It only runs under `astro dev`;
  the production build is fully static and contains no admin.

## Add or edit a song

**Add a new song (with audio):**

```bash
pnpm add-song path/to/track.mp3 [--slug my-slug] [--title "My Title"] [--date YYYY-MM-DD]
```

This uploads the mp3 to R2, reads its duration, generates the waveform peaks, and
scaffolds `src/content/songs/<slug>.yaml`. Then open `/keystatic/` to write the
note and tags. (`--no-upload` skips R2 for offline scaffolding.)

Requires R2 credentials in `.env` (copy `.env.example` → `.env`).

**Edit an existing song:** `pnpm dev` → `/keystatic/` → edit → commit & push.

## Build & deploy

```bash
pnpm build        # -> dist/ (static)
```

Deployed to **Cloudflare Pages**, publishing **`dist/` only** (never the repo root).
Set these as Pages environment variables:

- `PUBLIC_AUDIO_BASE` — e.g. `https://audio.songs.travisbriggs.com`
- `PUBLIC_MATOMO_SITE_ID` — Matomo site id (omit to disable analytics)

> Security: this is a pure static site with no server secrets in the build. The
> only secret (the R2 upload key) lives in your local `.env` / Cloudflare's secret
> store, never in the repo or `dist/`.

## Tests

```bash
pnpm test         # vitest (formatting, related/neighbors/tags, peaks, parser, player, data layer)
```

## Data

Migrated from the original site's `songs/*.md` (the source of truth). All 170 song
records are preserved, including 2 hidden, metadata-only drafts
(`dear_april_side_a`, `dear_april_side_b_remix`) whose audio never existed. An
orphan `tall-buildings.mp3` on the old site had no song metadata and was left out.

The one-time migration script lives at `scripts/migrate.mjs`.

## License

Site content and audio: **CC BY-SA 4.0**. Recorded by Travis Briggs.
