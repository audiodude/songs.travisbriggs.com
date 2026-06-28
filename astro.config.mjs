// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// Keystatic's admin UI runs only under `astro dev`. For the production static
// build we omit the integration entirely so `dist/` stays 100% static (no admin
// routes, no serverless, no auth).
const dev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://songs.travisbriggs.com',
  output: 'static',
  trailingSlash: 'always', // preserve /<slug>/ URLs from the original site
  integrations: [react(), ...(dev ? [keystatic()] : [])],
});
