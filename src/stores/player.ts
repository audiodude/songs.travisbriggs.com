import { atom, map } from 'nanostores';
import type { Track } from '../lib/types';

export const $current = atom<Track | null>(null);
export const $isPlaying = atom<boolean>(false);
export const $time = map<{ cur: number; dur: number }>({ cur: 0, dur: 0 });
/** A requested seek as a fraction [0,1]; the Player applies it and resets to null. */
export const $seek = atom<number | null>(null);

/**
 * Load a track into the global player and start it. If the track is already
 * current, toggle play/pause instead (clicking the active row again).
 */
export function playTrack(track: Track): void {
  const cur = $current.get();
  if (cur && cur.slug === track.slug) {
    $isPlaying.set(!$isPlaying.get());
    return;
  }
  $current.set(track);
  $time.set({ cur: 0, dur: 0 });
  $isPlaying.set(true);
}

export function toggle(): void {
  if ($current.get()) $isPlaying.set(!$isPlaying.get());
}

export function requestSeek(frac: number): void {
  $seek.set(Math.max(0, Math.min(1, frac)));
}
