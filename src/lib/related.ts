import type { Song } from './types';

export interface Related {
  song: Song;
  /** the tags this song shares with the subject, in the related song's order */
  shared: string[];
}

/**
 * Other songs that share at least one tag with `song`, ranked by number of
 * shared tags (desc) then date (newest first). Excludes the song itself and
 * any hidden songs. Returns at most `limit` results.
 */
export function relatedByTag(song: Song, all: Song[], limit = 5): Related[] {
  const set = new Set(song.tags);
  return all
    .filter((s) => s.slug !== song.slug && !s.hidden)
    .map((s) => ({ song: s, shared: s.tags.filter((t) => set.has(t)) }))
    .filter((r) => r.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || b.song.date.localeCompare(a.song.date))
    .slice(0, limit);
}

/**
 * Adjacent songs by date in a newest-first list: `older` is the next entry,
 * `newer` is the previous one. Returns {} if the song is not in the list
 * (e.g. a hidden song whose page exists but isn't part of the visible run).
 */
export function neighbors(
  song: Song,
  orderedNewestFirst: Song[],
): { older?: Song; newer?: Song } {
  const i = orderedNewestFirst.findIndex((s) => s.slug === song.slug);
  if (i === -1) return {};
  return { older: orderedNewestFirst[i + 1], newer: orderedNewestFirst[i - 1] };
}
