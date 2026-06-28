import { spawn } from 'node:child_process';

/**
 * Generate normalized waveform peaks from an mp3.
 *
 * Decodes the file to mono 8kHz signed-16-bit PCM via ffmpeg, splits it into
 * `buckets` equal segments, takes the max absolute amplitude per segment, and
 * normalizes against the track's overall peak so values land in [0, 1].
 *
 * @param {string} mp3Path absolute path to an mp3 file
 * @param {number} buckets number of waveform bars to produce
 * @returns {Promise<number[]>} length `buckets`, each value in [0, 1]
 */
export async function generatePeaks(mp3Path, buckets = 72) {
  const samples = await decodePcm(mp3Path);
  if (samples.length === 0) return new Array(buckets).fill(0);

  const per = Math.max(1, Math.floor(samples.length / buckets));
  const raw = new Array(buckets).fill(0);
  let max = 0;
  for (let i = 0; i < buckets; i++) {
    const start = i * per;
    const end = i === buckets - 1 ? samples.length : Math.min(samples.length, start + per);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j]);
      if (v > peak) peak = v;
    }
    raw[i] = peak;
    if (peak > max) max = peak;
  }
  return raw.map((v) => (max ? Number((v / max).toFixed(4)) : 0));
}

/** @returns {Promise<Int16Array>} */
function decodePcm(mp3Path) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', mp3Path, '-ac', '1', '-ar', '8000', '-f', 's16le', '-']);
    /** @type {Buffer[]} */
    const chunks = [];
    let err = '';
    ff.stdout.on('data', (d) => chunks.push(d));
    ff.stderr.on('data', (d) => (err += d));
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed (${code}): ${err}`));
      const buf = Buffer.concat(chunks);
      const even = buf.length - (buf.length % 2);
      // Copy into a fresh, 2-byte-aligned ArrayBuffer for Int16Array.
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + even);
      resolve(new Int16Array(ab));
    });
  });
}
