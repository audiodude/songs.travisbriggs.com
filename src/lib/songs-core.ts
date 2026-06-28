import type { Song } from './types';

export interface RawEntry {
  id: string;
  data: {
    title: string;
    date: string;
    duration: number;
    tags: string[];
    hidden: boolean;
    note: string;
  };
}

/**
 * Assemble Song records from raw collection entries: derive the audio src from
 * the slug, attach precomputed peaks, and sort newest-first (date desc, then
 * title asc as a stable tiebreak). Pure — no Astro/Vite imports.
 */
export function assembleSongs(
  entries: RawEntry[],
  peaksBySlug: Record<string, number[]>,
  audioBase: string,
): Song[] {
  const songs: Song[] = entries.map((e) => ({
    slug: e.id,
    title: e.data.title,
    date: e.data.date,
    tags: e.data.tags ?? [],
    duration: e.data.duration ?? 0,
    hidden: e.data.hidden ?? false,
    note: e.data.note ?? '',
    src: `${audioBase}/${e.id}.mp3`,
    peaks: peaksBySlug[e.id] ?? [],
  }));
  songs.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return songs;
}

export function visibleSongs(all: Song[]): Song[] {
  return all.filter((s) => !s.hidden);
}
