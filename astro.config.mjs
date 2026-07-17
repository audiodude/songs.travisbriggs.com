// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import coverAdmin from './integrations/cover-admin.mjs';

// Keystatic's admin UI runs only under `astro dev`. For the production static
// build we omit the integration entirely so `dist/` stays 100% static (no admin
// routes, no serverless, no auth).
const dev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://songs.travisbriggs.com',
  output: 'static',
  // 'ignore' (default): the static build still emits /<slug>/index.html so the
  // original /<slug>/ URLs resolve, without forcing redirects that would break
  // Keystatic's /api/keystatic/* calls. Internal links + canonicals use /<slug>/.
  build: { format: 'directory' },
  // The Astro dev toolbar floats bottom-center and collides with our fixed
  // player bar; it's dev-only noise here. Re-enable by removing this if wanted.
  devToolbar: { enabled: false },
  // cover-admin mounts the dev-only fal.ai endpoint; like keystatic it is left
  // out of the production build so dist/ stays 100% static (no endpoint, no key).
  integrations: [react(), ...(dev ? [keystatic(), coverAdmin()] : [])],
});
