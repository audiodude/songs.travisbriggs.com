import { expect, test } from 'vitest';
import { relatedByTag, neighbors } from './related';
import type { Song } from './types';

function song(partial: Partial<Song> & { slug: string }): Song {
  return {
    title: partial.slug,
    date: '2020-01-01',
    tags: [],
    duration: 0,
    hidden: false,
    note: '',
    src: '',
    peaks: [],
    ...partial,
  };
}

const a = song({ slug: 'a', tags: ['rock', 'demo', 'guitar'], date: '2024-01-01' });
const b = song({ slug: 'b', tags: ['rock', 'demo'], date: '2023-01-01' }); // shares 2
const c = song({ slug: 'c', tags: ['rock'], date: '2025-01-01' }); // shares 1, newer
const d = song({ slug: 'd', tags: ['rock'], date: '2022-01-01' }); // shares 1, older
const e = song({ slug: 'e', tags: ['jazz'], date: '2025-06-01' }); // shares 0
const hid = song({ slug: 'hid', tags: ['rock', 'demo'], date: '2025-12-01', hidden: true });

test('relatedByTag ranks by shared-tag count, then date desc; excludes self + hidden + zero-overlap', () => {
  const res = relatedByTag(a, [a, b, c, d, e, hid]);
  expect(res.map((r) => r.song.slug)).toEqual(['b', 'c', 'd']);
  expect(res[0].shared).toEqual(['rock', 'demo']);
});

test('relatedByTag honors the limit', () => {
  const res = relatedByTag(a, [a, b, c, d], 1);
  expect(res).toHaveLength(1);
  expect(res[0].song.slug).toBe('b');
});

test('neighbors returns older (next) and newer (prev) in a newest-first list', () => {
  const ordered = [c, a, d]; // newest -> oldest by date
  expect(neighbors(a, ordered).older?.slug).toBe('d');
  expect(neighbors(a, ordered).newer?.slug).toBe('c');
  expect(neighbors(c, ordered).newer).toBeUndefined();
  expect(neighbors(d, ordered).older).toBeUndefined();
});

test('neighbors returns empty for a song not in the visible list (e.g. hidden)', () => {
  const ordered = [c, a, d];
  expect(neighbors(hid, ordered)).toEqual({});
});
