/**
 * Deterministic waveform cover art.
 *
 * Builds a square SVG for a song from its slug + precomputed waveform peaks:
 * the slug hashes to a stable hue (so every track gets its own color world,
 * regenerating never changes it) and the peaks become a mirrored bar waveform
 * in the site's player style. No text — the title lives in og:title — and no
 * randomness, so output is byte-identical run to run.
 */

/** FNV-1a 32-bit — stable, fast, good spread for short strings. */
export function hashSlug(slug) {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Bucket-max resample so any peaks length renders as exactly `n` bars. */
export function resamplePeaks(peaks, n) {
  if (!Array.isArray(peaks) || peaks.length === 0) return new Array(n).fill(0);
  if (peaks.length === n) return peaks.map(clamp01);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const start = Math.floor((i * peaks.length) / n);
    const end = Math.max(start + 1, Math.floor(((i + 1) * peaks.length) / n));
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, clamp01(peaks[j]));
    out[i] = max;
  }
  return out;
}

function clamp01(v) {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * @param {{ slug: string, peaks: number[], size?: number, bars?: number }} opts
 * @returns {string} standalone SVG document
 */
export function buildCoverSvg({ slug, peaks, size = 1024, bars = 72 }) {
  const h = hashSlug(slug);
  const hue = h % 360;
  const vals = resamplePeaks(peaks, bars);

  const bgTop = `hsl(${hue}, 30%, 8%)`;
  const bgBottom = `hsl(${hue}, 26%, 17%)`;
  const accent = `hsl(${hue}, 85%, 60%)`;
  const accentLight = `hsl(${hue}, 90%, 72%)`;

  // Accent wash anchored in a hash-chosen corner, like the site's hero-wash.
  const corners = [
    [0, 0],
    [size, 0],
    [0, size],
    [size, size],
  ];
  const [wx, wy] = corners[(h >>> 9) % 4];

  const margin = size * 0.09;
  const waveW = size - margin * 2;
  const barW = waveW / bars;
  const bodyW = barW * 0.62;
  const cy = size / 2;
  const maxHalf = size * 0.23;
  const minHalf = size * 0.008;

  const rects = vals
    .map((v, i) => {
      const half = minHalf + v * (maxHalf - minHalf);
      const x = round1(margin + i * barW + (barW - bodyW) / 2);
      return `<rect x="${x}" y="${round1(cy - half)}" width="${round1(bodyW)}" height="${round1(half * 2)}" rx="${round1(bodyW / 2)}"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bgTop}"/>
      <stop offset="1" stop-color="${bgBottom}"/>
    </linearGradient>
    <radialGradient id="wash" cx="${wx}" cy="${wy}" r="${round1(size * 0.95)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="0.55" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${accentLight}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${round1(size * 0.016)}"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" fill="url(#wash)"/>
  <g fill="url(#bar)" opacity="0.55" filter="url(#glow)">${rects}</g>
  <g fill="url(#bar)">${rects}</g>
</svg>
`;
}
