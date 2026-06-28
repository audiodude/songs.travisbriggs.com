import { expect, test } from 'vitest';
import { generatePeaks } from './peaks.mjs';

const MP3 = '/home/tmoney/code/starred/songs.travisbriggs.com/static/mp3/monthly.mp3';

test('generatePeaks returns normalized buckets from a real mp3', async () => {
  const peaks = await generatePeaks(MP3, 72);
  expect(peaks).toHaveLength(72);
  expect(Math.min(...peaks)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...peaks)).toBeLessThanOrEqual(1);
  // normalization means the loudest bucket should reach (≈) 1
  expect(Math.max(...peaks)).toBeGreaterThan(0.9);
  // a real song has variation, not a flat line
  expect(new Set(peaks.map((p) => Math.round(p * 20))).size).toBeGreaterThan(3);
}, 30000);

test('respects bucket count', async () => {
  const peaks = await generatePeaks(MP3, 60);
  expect(peaks).toHaveLength(60);
}, 30000);
