import type { Song } from './types';

/**
 * Build the global tag list and frequencies from the visible (non-hidden)
 * songs. Tags are returned sorted alphabetically.
 */
export function tagIndex(songs: Song[]): { tags: string[]; freq: Record<string, number> } {
  const freq: Record<string, number> = {};
  for (const s of songs) {
    if (s.hidden) continue;
    for (const t of s.tags) freq[t] = (freq[t] ?? 0) + 1;
  }
  return { tags: Object.keys(freq).sort(), freq };
}
