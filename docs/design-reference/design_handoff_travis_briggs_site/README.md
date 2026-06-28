# Handoff: Travis Briggs — Songs & Sounds personal music site

## Overview
A personal portfolio / music site for the artist **Travis Briggs** that catalogs ~168 self-recorded songs. It re-implements (and improves on) the existing site at https://songs.travisbriggs.com. Core goals:

- **Index page** listing all songs, **sortable** (newest / oldest / A–Z / shuffle) and **filterable by tag** (multi-select).
- **Play any song inline** from the list.
- **Global, persistent playback** — audio keeps playing as the user navigates between the index and song detail pages (the main upgrade over the current site, where playback is per-page).
- **Song detail pages** — title, date, a personal note/story, the song's tags (clickable → filter the index), and **related songs by shared tag**.

Voice/tone: **personal, intimate, vulnerable, fun, confident, a little goofy/bombastic** — never "art house" or gimmicky.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing the intended look, layout, and behavior. They are **not production code to ship directly**. The task is to **recreate the design in the target codebase's environment** using its established patterns and libraries. If no codebase exists yet, the current site is a **Python / Flask-Frozen static-site generator** (source: https://github.com/audiodude/songs.travisbriggs.com); a good fit would be a modern framework (Next.js / Astro / SvelteKit) — or continuing the Flask generator — with **one persistent audio element mounted at the app root** so playback survives client-side navigation.

> The prototypes are built in a streaming "Design Component" HTML format with a small custom runtime (`<x-dc>`, `<sc-for>`, a `Component` logic class). **Do not port that runtime.** Read the files for layout, styling, copy, and data-shape, then rebuild in your framework of choice.

### Which file is current
- **`Travis Briggs - Rainfall.dc.html` — THE CURRENT / APPROVED design.** Build from this one. It uses the **Rainfall design-system color palette** (dark slate/blue) over the agreed layout + typography. All the spec values below describe this file.
- `Index Directions.dc.html` — the **earlier color study**: identical layout/typography but a warm **amber-on-near-black** palette with a Photoshop-checkerboard page background. Kept only as an **alternate color option**; ignore unless the team decides to switch palettes. (To produce the amber variant, apply the "Alternate palette" mapping at the end of this doc.)

Both files are a **single index screen**. The **song detail page is not yet designed** — it is specified in prose below to be built consistently.

## Fidelity
**High-fidelity (hifi)** for the index page — final colors, typography, spacing, and interaction states are specified and should be recreated closely. The **song detail page is a written spec** to design/build consistent with the index's system.

## Design system / tokens (Rainfall palette — the current design)
Tokens are Tailwind values from the Rainfall system (slate/gray neutrals, blue primary, dark-mode-by-default).

### Color
| Role | Value | Notes |
|---|---|---|
| Page background | `#475569` | Tailwind slate-600 — the app bg behind the card |
| Card surface | `#1f2937` | gray-800 — the main content card |
| Player bar bg | `#111827` | gray-900-ish — docked player, darker than card |
| Recessed/chip & control-rest fill | `#374151` | gray-700 — tag chips, play-button rest |
| Border (subtle) | `#374151` | gray-700 — row hairlines |
| Border (control / play ring) | `#4b5563` | gray-600 |
| Primary text / headings | `#ffffff` | white |
| Body / muted text | `#9ca3af` | gray-400 — blurb, meta labels |
| Chip text | `#cbd5e1` | slate-300 — high contrast on `#374151` for a11y |
| Faint text | `#6b7280` | gray-500 — note icon rest, timecodes, faint meta |
| **Accent (primary)** | `#3b82f6` | blue-500 — THE accent: BRIGGS, eyebrow, note-hover, duration, active control fill, play buttons, waveform |
| Accent (deep) | `#2563eb` | blue-600 — available for primary-button hover |
| Accent (light) | `#60a5fa` | blue-400 — default ghost-button text/border, waveform gradient top |
| Accent glow | `0 0 22px rgba(59,130,246,.5)` | on play buttons |
| Row-hover wash | `linear-gradient(90deg, rgba(59,130,246,.08), transparent)` | |
| Hero radial wash | `radial-gradient(120% 140% at 100% 0%, rgba(59,130,246,.14), transparent 55%)` | |

### Typography (unchanged across both color options)
- **Display** (artist name, song-row titles): **Bricolage Grotesque**, 700–800, tight tracking (`-.02em`…`-.03em`), line-height `.84`–`1`.
- **Body / UI** (blurb, control buttons): **Hanken Grotesk**, 400/500/600/700.
- **Mono** (eyebrow, timecodes, meta, **and the tag chips**): **Space Mono**, 400/700; uppercase + wide tracking (`.14em`–`.22em`) for eyebrow/labels.
  - Note: tag chips use **Space Mono 11px** specifically — Hanken was tested at that size and read poorly; Space Mono holds up much better small.
- Google Fonts: `Bricolage Grotesque` (opsz 12..96; 400/600/700/800), `Hanken Grotesk` (400/500/600/700/800), `Space Mono` (400/700).

### Shape / spacing
- Card radius `7px`; tag chips radius `4px`; control pills radius `999px`; play buttons circular; placeholder art `4px`.
- Index content max-width **1000px**; horizontal padding **44px** inside the card.
- Row vertical padding `16px`; row hairline `1px solid #374151`.
- Transitions: color/background `.15s`.

## Screens / Views

### 1. Index / "All Songs" (DESIGNED — `Travis Briggs - Rainfall.dc.html`)
**Purpose:** Browse, sort, filter, and play any of 168 songs. Layout top→bottom, inside a 1000px `#1f2937` card centered on the `#475569` page:

1. **Hero** (`position:relative; padding:50px 44px 32px`), CSS grid `1fr 150px`, `align-items:center`, with the hero radial wash.
   - **Floating nav links** — absolutely positioned `top:52px; right:44px`, flex row `gap:22px`, aligned with the eyebrow line. Hanken 600 12px. Items:
     - **All Songs** — current page, color `#3b82f6` (active), href to index.
     - **travisbriggs.com ↗** — `https://travisbriggs.com`, external (`target=_blank rel=noopener`), color `#9ca3af`, hover `#ffffff`.
     - **Mastodon ↗** — `https://musicians.today/@audiodude`, external, same styling.
     - **GitHub ↗** — `https://github.com/audiodude/songs.travisbriggs.com`, external, same styling.
   - **Left column:**
     - Eyebrow: `▶ SONGS & SOUNDS · EST. 2008` — Space Mono 700 12px uppercase, `letter-spacing:.22em`, color `#3b82f6`, margin-bottom 18px.
     - Name: `TRAVIS` / `BRIGGS` on two lines — Bricolage 800 **86px**, line-height `.84`, `letter-spacing:-.03em`. "TRAVIS" `#ffffff`, **"BRIGGS" `#3b82f6`**.
     - Blurb — Hanken 16px, line-height 1.5, color `#9ca3af`, max-width 440px: *"I record a song just about every time I have a feeling. Demos, jokes, heartbreakers, a couple I'm genuinely proud of. None of it's precious — all of it's honest."*
   - **Right column:** photo placeholder (`aspect-ratio:1/1.18`, radius 4px) — striped fill `repeating-linear-gradient(45deg,#3a4656,#3a4656 7px,#2e3a49 7px,#2e3a49 14px)`, `1px solid #4b5563`, framed with `box-shadow:0 0 0 6px #111827, 0 0 0 7px #4b5563`, mono label `[ PHOTO OF TRAVIS ]`. **User will supply a real photo.**

2. **Controls bar** (`padding:16px 44px`, hairline top+bottom, flex):
   - Left: `168 TRACKS` — Space Mono 700 11px uppercase, color `#6b7280`.
   - Right: a pill group (`gap:8px`), Hanken 600 13px, `padding:8px 14px`, radius 999px. **Two states (important — recently dialed in):**
     - **Active** (e.g. Newest ▾): **filled** — `background:#3b82f6; color:#ffffff`, no border.
     - **Default** (A–Z, Shuffle ⤬, Tags +): **outline/ghost** — `background:transparent; color:#60a5fa; border:1px solid #3b82f6`. (A solid white fill was explicitly rejected — it read as "currently selected." Ghost = clearly clickable but not active.)
   - These are the **sort + filter** controls: Newest/Oldest (toggle via ▾), A–Z, Shuffle (randomize), Tags + (opens tag multi-select).

3. **Song rows** (`padding:6px 44px 96px`; bottom 96px reserves space behind the docked player). Each row is a **flex** row, `gap:20px`, `align-items:center`, `padding:16px 0`, `border-bottom:1px solid #374151`, `cursor:pointer`, columns left→right:
   - **Note icon** — fixed `width:24px`, `♪` glyph 19px, centered. Color `var(--note, #6b7280)` (grey at rest). **On row hover the icon turns accent** `#3b82f6` via an inherited CSS custom property: the row's hover sets `--note:#3b82f6` and `background:linear-gradient(90deg,rgba(59,130,246,.08),transparent)`. (Recreate as a parent-hover → child-color rule.)
   - **Title** — `flex:1; min-width:0`, Bricolage **700 33px**, line-height 1, `letter-spacing:-.02em`, single-line ellipsis. Color `#ffffff`.
   - **Tags** — a `flex-wrap` container, fixed `width:230px`, `justify-content:flex-end`, `align-content:flex-start`, `gap:5px`, **`max-height:51px; overflow:hidden`** (clips to exactly **2 lines**; shows as many tags as fit). Each chip: **Space Mono 400 11px**, color `#cbd5e1`, background `#374151`, **no border**, `padding:4px 8px`, radius `4px`, `white-space:nowrap`. Chips are **clickable → filter index by that tag**. (Design note: chips deliberately read as a *quieter tier* than the control pills — they share the gray fill but have no border and are never colored, so they don't compete with the primary controls.)
   - **Date** — fixed `width:74px`, right-aligned, Space Mono 400 12px, color `#6b7280`, format **"May 2026"** (month-abbrev + year).
   - **Duration** — fixed `width:38px`, right-aligned, Space Mono 400 12px, color `#3b82f6`, format `m:ss`.
   - **Play button** — `34×34` circle, bg `#374151`, `1px solid #4b5563`, a CSS triangle (`border-left:9px solid #ffffff` + transparent top/bottom 6px, `margin-left:2px`). **On hover:** bg + border become `#3b82f6`.

4. **Global player bar** — docked at the bottom of the list (in the prototype it overlaps via `margin-top:-80px`; in production make it **fixed to the viewport bottom** and global). bg `#111827`, `border-top:1px solid #4b5563`, `padding:14px 24px`, flex `gap:18px`, `box-shadow:0 -10px 30px rgba(0,0,0,.3)`. Contents L→R:
   - **Play/pause** — `42×42` circle, bg `#3b82f6`, glow `0 0 22px rgba(59,130,246,.5)`; pause = two `3×14` bars `#ffffff`.
   - **Now-playing meta** (min-width 150px): title in Bricolage 700 18px `#ffffff`; sub-line Space Mono 400 11px color `#6b7280` = `TB-### · tag · tag · tag` (catalog id + first 3 tags).
   - **Waveform / scrubber** — `flex:1`, height 40px, a row of ~60 thin bars (`flex:1`, `gap:2px`), each `background:linear-gradient(#60a5fa,#3b82f6)`, `border-radius:1px`, height = per-bar amplitude %. Make this a **real interactive scrubber** in production (click/drag to seek; filled vs. unplayed). The prototype amplitudes are synthetic — generate from the audio (Web Audio `AnalyserNode` or precomputed peaks).
   - **Timecode** — Space Mono 400 12px `#6b7280`, `current / total` (e.g. `1:12 / 2:56`).

### 2. Song detail page (TO BE BUILT — spec)
**Purpose:** Focus on one song; show its story, tags, and related songs. Minimal, consistent with the index's system.
- **Header:** reuse the floating nav links; "All Songs" links back to the index.
- **Title block:** big Bricolage title, the `♪`/play affordance, **"Month YYYY"** date, duration, and a large accent (`#3b82f6`) play button that loads this track into the **global** player.
- **Personal note:** the song's `note` text (Hanken ~17px, `#9ca3af`, ~60ch measure). 158 of 168 songs have a note; omit the block gracefully when empty.
- **Tags:** the full tag list as the same Space Mono chips, **clickable → index filtered by that tag**.
- **Related by tag:** for each tag on the song, list other songs sharing it (dedupe, exclude self, exclude hidden). Mirror the index row style. Group-by-tag or a single merged "Related" list both fine; keep it minimal.
- Playing anything here does **not** interrupt navigation — same global player.

## Interactions & Behavior
- **Inline play:** clicking a row's play button (or row) loads that track into the global player and starts it; the active row / now-playing reflect it (consider an animated equalizer on the active row — the file defines an `eq` keyframe `scaleY(.35)→1` for this "goofy" flourish).
- **Global persistence:** one `<audio>`/player at app root. Client-side navigation must **not** reset or restart it. Persist current track + position (in-memory across routes and/or `localStorage` to resume on reload).
- **Sort:** Newest (default, date desc), Oldest (date asc), A–Z (title), Shuffle (random). Active mode = filled-blue pill; others = blue ghost.
- **Tag filter (multi-select):** "Tags +" reveals the tag set; selecting tags filters rows to songs containing the selected tags (recommend **any/OR**, matching the original site; confirm with Travis). Clicking any chip adds that tag to the active filter and scrolls to the list. Provide a clear / "Show All" affordance.
- **Hover states:** row → subtle blue gradient wash + `♪` turns blue; play buttons → fill blue; nav/external links → `#9ca3af`→`#ffffff`. External links open in a new tab.
- **Goofy flourishes (encouraged, tasteful):** eq/marquee animations, playful hovers, an empty-state joke when a filter yields nothing.

## State Management
- `tracks` — from `data/songs.json`.
- `sortMode` — `'newest' | 'oldest' | 'az' | 'shuffle'`.
- `activeTags` — selected tag filters (drives visible list + "Tags +" state).
- `currentTrack` — playing track slug/id (or null).
- `isPlaying`, `currentTime`, `duration` — global player state.
- Derived: `visibleTracks` = filter by `activeTags`, then order by `sortMode`.
- Detail route param: `slug`; compute `relatedByTag` from `tracks`.

## Data
`data/songs.json` (included) — full dataset parsed from the original repo's `songs/*.md` frontmatter. Shape:
```json
{
  "songs": [
    {
      "slug": "monthly",
      "title": "Monthly",
      "date": "2026/05/28",            // YYYY/MM/DD
      "duration": 245000,               // milliseconds
      "tags": ["electronic","breakbeat","heavy.guitar","fake.drums","glitch"],
      "note": "Yes, this track started ...", // personal story; may be "" (10 songs have none)
      "src": "https://songs.travisbriggs.com/static/mp3/monthly.mp3"
    }
    // ... 168 total, pre-sorted newest → oldest
  ],
  "tags": ["8bit", "acoustic", ...],   // 127 unique tags, sorted
  "tagFreq": { "male.vocals": 62, "instrumental": 50, ... } // counts, for sizing/ordering the tag UI
}
```
Notes:
- **168 songs**, **127 unique tags**. 2 `hidden` songs from source were excluded.
- `src` points at the live MP3s on the existing site; reuse those URLs or rehost.
- Catalog id in the player sub-line (`TB-168`, …) = `total - indexInNewestOrder`, zero-padded to 3 (newest = highest).
- Top tags by frequency: male.vocals (62), instrumental (50), demo (37), fake.drums (29), electronic (27), original (24), guitar (19), punk.rock (19), synth (18), chiptune (16).

## Assets
- **Artist photo** — placeholder only; Travis will provide. Slot: hero right column, `aspect-ratio:1/1.18`.
- **Fonts** — Google Fonts: Bricolage Grotesque, Hanken Grotesk, Space Mono.
- **Audio** — MP3s at `https://songs.travisbriggs.com/static/mp3/<slug>.mp3`.
- **Icons** — none external; play = CSS triangle, pause = two bars, note = `♪` glyph, external-link = `↗` glyph. No icon library required.

## Alternate palette (amber — `Index Directions.dc.html`)
If the team prefers the warm option, swap the Rainfall colors for these and use a Photoshop-style checkerboard page background instead of the slate fill:
- Accent `#3b82f6`→`#FF7A3C`; light accent `#60a5fa`→`#FF9A5C`; deep `#2563eb`→`#FF7A3C`; glow `rgba(59,130,246,*)`→`rgba(255,122,60,*)`.
- Card `#1f2937`→`#121215`; player `#111827`→`#16161b`; chip/rest `#374151`→`#1c1d22`; borders `#4b5563`→`#2a2c31`/`#34363c`.
- Text `#ffffff`→`#ECEAE4`; muted `#9ca3af`→`#B6B2A9`; chip text `#cbd5e1`→`#9a968d`; faint `#6b7280`→`#74726b`.
- Page bg: checkerboard — `background:#ffffff` + four 45°/-45° `#cccccc` linear-gradients at `background-size:24px 24px`.
(The amber file in the bundle still shows the older chip/button treatment; treat the Rainfall file as the source of truth for component styling and only borrow its color values.)

## Files
- `Travis Briggs - Rainfall.dc.html` — **the current/approved design. Build from this.**
- `Index Directions.dc.html` — alternate amber color study (older chip/button styling).
- `data/songs.json` — complete song dataset (168 songs, 127 tags).
