import { beforeEach, expect, test } from 'vitest';
import { $current, $isPlaying, playTrack, toggle, requestSeek, $seek } from './player';
import type { Track } from '../lib/types';

const a: Track = { slug: 'a', title: 'A', src: 'a.mp3', tags: [] };
const b: Track = { slug: 'b', title: 'B', src: 'b.mp3', tags: [] };

beforeEach(() => {
  $current.set(null);
  $isPlaying.set(false);
  $seek.set(null);
});

test('playTrack loads and plays a new track', () => {
  playTrack(a);
  expect($current.get()?.slug).toBe('a');
  expect($isPlaying.get()).toBe(true);
});

test('playTrack on the current track toggles play/pause', () => {
  playTrack(a);
  playTrack(a); // same -> pause
  expect($isPlaying.get()).toBe(false);
  playTrack(a); // -> play
  expect($isPlaying.get()).toBe(true);
});

test('playTrack switches to a different track and plays', () => {
  playTrack(a);
  playTrack(b);
  expect($current.get()?.slug).toBe('b');
  expect($isPlaying.get()).toBe(true);
});

test('toggle only acts when a track is loaded', () => {
  toggle();
  expect($isPlaying.get()).toBe(false);
  playTrack(a);
  toggle();
  expect($isPlaying.get()).toBe(false);
});

test('requestSeek clamps to [0,1]', () => {
  requestSeek(1.7);
  expect($seek.get()).toBe(1);
  requestSeek(-0.3);
  expect($seek.get()).toBe(0);
});
