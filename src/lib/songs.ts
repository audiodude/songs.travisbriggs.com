import { getCollection } from 'astro:content';
import { assembleSongs, visibleSongs, type RawEntry } from './songs-core';
import type { Song } from './types';

export type { Song } from './types';
export { visibleSongs } from './songs-core';
export { tagIndex } from './tags';
export { relatedByTag, neighbors, type Related } from './related';

const AUDIO_BASE = import.meta.env.PUBLIC_AUDIO_BASE ?? 'https://audio.songs.travisbriggs.com';

// Peaks are served as static files from /peaks/<slug>.json and fetched on the
// client when a track loads, so they are not attached at build time.

/** All songs, newest-first, with src attached. Includes hidden songs. */
export async function loadSongs(): Promise<Song[]> {
  const entries = await getCollection('songs');
  const raw: RawEntry[] = entries.map((e) => ({ id: e.id, data: e.data }));
  return assembleSongs(raw, {}, AUDIO_BASE);
}

/** All visible (non-hidden) songs, newest-first. */
export async function loadVisibleSongs(): Promise<Song[]> {
  return visibleSongs(await loadSongs());
}
