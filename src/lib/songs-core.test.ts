import { expect, test } from 'vitest';
import { assembleSongs, visibleSongs, type RawEntry } from './songs-core';

const entries: RawEntry[] = [
  { id: 'old', data: { title: 'Old', date: '2020-01-01', duration: 1000, tags: ['a'], hidden: false, note: '' } },
  { id: 'new', data: { title: 'New', date: '2025-01-01', duration: 2000, tags: ['b'], hidden: false, note: 'hi' } },
  { id: 'secret', data: { title: 'Secret', date: '2026-01-01', duration: 0, tags: [], hidden: true, note: '' } },
];
const peaks = { old: [0.1, 0.2], new: [0.5] };

test('assembleSongs sorts newest-first and derives src + peaks', () => {
  const songs = assembleSongs(entries, peaks, 'https://audio.example.com');
  expect(songs.map((s) => s.slug)).toEqual(['secret', 'new', 'old']);
  expect(songs.find((s) => s.slug === 'new')?.src).toBe('https://audio.example.com/new.mp3');
  expect(songs.find((s) => s.slug === 'old')?.peaks).toEqual([0.1, 0.2]);
  expect(songs.find((s) => s.slug === 'secret')?.peaks).toEqual([]); // no peaks -> default
});

test('visibleSongs excludes hidden', () => {
  const songs = assembleSongs(entries, peaks, 'https://a');
  expect(visibleSongs(songs).map((s) => s.slug)).toEqual(['new', 'old']);
});
