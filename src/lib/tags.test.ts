import { expect, test } from 'vitest';
import { tagIndex } from './tags';
import type { Song } from './types';

function song(partial: Partial<Song> & { slug: string }): Song {
  return { title: partial.slug, date: '2020-01-01', tags: [], duration: 0, hidden: false, note: '', src: '', peaks: [], ...partial };
}

test('tagIndex returns sorted unique tags and frequencies over visible songs only', () => {
  const songs = [
    song({ slug: 'a', tags: ['rock', 'demo'] }),
    song({ slug: 'b', tags: ['demo', 'acoustic'] }),
    song({ slug: 'c', tags: ['rock'], hidden: true }), // excluded from freq
  ];
  const { tags, freq } = tagIndex(songs);
  expect(tags).toEqual(['acoustic', 'demo', 'rock']);
  expect(freq).toEqual({ acoustic: 1, demo: 2, rock: 1 });
});
