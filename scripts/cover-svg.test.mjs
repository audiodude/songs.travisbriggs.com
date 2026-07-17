import { describe, expect, it } from 'vitest';
import { buildCoverSvg, hashSlug, resamplePeaks } from './cover-svg.mjs';

describe('hashSlug', () => {
  it('is deterministic and spreads across slugs', () => {
    expect(hashSlug('monthly')).toBe(hashSlug('monthly'));
    expect(hashSlug('monthly')).not.toBe(hashSlug('jericho'));
  });
});

describe('resamplePeaks', () => {
  it('passes through when already the target length', () => {
    expect(resamplePeaks([0.1, 0.5, 1], 3)).toEqual([0.1, 0.5, 1]);
  });

  it('bucket-maxes down to the target length', () => {
    expect(resamplePeaks([0.1, 0.9, 0.2, 0.4], 2)).toEqual([0.9, 0.4]);
  });

  it('handles empty or garbage input as silence', () => {
    expect(resamplePeaks([], 4)).toEqual([0, 0, 0, 0]);
    expect(resamplePeaks([NaN, 'x'], 2)).toEqual([0, 0]);
  });

  it('clamps out-of-range values into [0, 1]', () => {
    expect(resamplePeaks([-2, 5], 2)).toEqual([0, 1]);
  });
});

describe('buildCoverSvg', () => {
  const peaks = Array.from({ length: 72 }, (_, i) => (i % 10) / 10);

  it('is byte-identical across runs (regeneration never churns git)', () => {
    expect(buildCoverSvg({ slug: 'monthly', peaks })).toBe(buildCoverSvg({ slug: 'monthly', peaks }));
  });

  it('renders one bar per bucket, twice (glow layer + crisp layer)', () => {
    const svg = buildCoverSvg({ slug: 'monthly', peaks, bars: 72 });
    expect(svg.match(/<rect x=/g)).toHaveLength(144);
  });

  it('gives different slugs different hues', () => {
    const a = buildCoverSvg({ slug: 'monthly', peaks });
    const b = buildCoverSvg({ slug: 'jericho', peaks });
    const hue = (svg) => svg.match(/hsl\((\d+)/)[1];
    expect(hue(a)).not.toBe(hue(b));
  });

  it('still renders a valid flat waveform for silent/missing peaks', () => {
    const svg = buildCoverSvg({ slug: 'monthly', peaks: [] });
    expect(svg).toContain('<svg');
    expect(svg.match(/<rect x=/g)).toHaveLength(144);
  });
});
