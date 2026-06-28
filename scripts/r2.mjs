import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const DEFAULT_BUCKET = 'songs-travisbriggs-audio';
const DEFAULT_ACCOUNT = '059181f68081f9c0fb55c5c77a969c11';

/**
 * Upload a local file to the R2 bucket under `key`, via wrangler. Uses the
 * Cloudflare API token from the environment (CLOUDFLARE_API_TOKEN or CF_API_TOKEN,
 * the latter lives in ~/.secrets). No separate R2 S3 credentials needed.
 */
export function uploadToR2(localPath, key, contentType = 'audio/mpeg') {
  const bucket = process.env.R2_BUCKET || DEFAULT_BUCKET;
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT;
  if (!token) {
    throw new Error('Missing CLOUDFLARE_API_TOKEN / CF_API_TOKEN (source ~/.secrets or set it in .env).');
  }
  const bin = existsSync('node_modules/.bin/wrangler') ? 'node_modules/.bin/wrangler' : 'wrangler';
  const res = spawnSync(
    bin,
    ['r2', 'object', 'put', `${bucket}/${key}`, '--file', localPath, '--content-type', contentType, '--remote'],
    { stdio: 'inherit', env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } },
  );
  if (res.status !== 0) throw new Error(`wrangler r2 upload failed for ${key}`);
  return key;
}
