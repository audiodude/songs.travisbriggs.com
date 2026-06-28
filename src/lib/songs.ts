import { getCollection } from 'astro:content';
import { assembleSongs, visibleSongs, type RawEntry } from './songs-core';
import type { Song } from './types';

export type { Song } from './types';
export { visibleSongs } from './songs-core';
export { tagIndex } from './tags';
export { relatedByTag, neighbors, type Related } from './related';

const AUDIO_BASE = import.meta.env.PUBLIC_AUDIO_BASE ?? 'https://audio.songs.travisbriggs.com';

// Eagerly load all committed peaks at build time, keyed by slug.
const peaksModules = import.meta.glob<number[]>('../data/peaks/*.json', {
  eager: true,
  import: 'default',
});
const peaksBySlug: Record<string, number[]> = {};
for (const [filePath, data] of Object.entries(peaksModules)) {
  const slug = filePath.split('/').pop()!.replace(/\.json$/, '');
  peaksBySlug[slug] = data;
}

/** All songs, newest-first, with src + peaks attached. Includes hidden songs. */
export async function loadSongs(): Promise<Song[]> {
  const entries = await getCollection('songs');
  const raw: RawEntry[] = entries.map((e) => ({ id: e.id, data: e.data }));
  return assembleSongs(raw, peaksBySlug, AUDIO_BASE);
}

/** All visible (non-hidden) songs, newest-first. */
export async function loadVisibleSongs(): Promise<Song[]> {
  return visibleSongs(await loadSongs());
}
