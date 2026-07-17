// Dev-only Astro integration: mounts POST /api/gen-cover on the `astro dev`
// server so the "Generate cover" button on song pages can call fal.ai FLUX.2.
//
// This is wired into astro.config.mjs ONLY in the dev branch (same gate as
// Keystatic), so it never exists in `astro build` / `dist/`. FAL_KEY is read
// server-side here and never reaches the client or the static output.
//
// All heavy work (fal client, sharp) is dynamic-imported inside the handler so
// merely loading this module during a production build stays cheap.

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(payload);
}

export default function coverAdmin() {
  return {
    name: 'cover-admin',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/api/gen-cover', async (req, res) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'POST only' });
            return;
          }
          try {
            const { slug, prompt, seed } = JSON.parse((await readBody(req)) || '{}');
            if (!slug || !prompt?.trim()) {
              sendJson(res, 400, { error: 'slug and prompt are required' });
              return;
            }
            const { generateAiCover } = await import('../scripts/fal-cover.mjs');
            const result = await generateAiCover(slug, prompt, {
              seed: Number.isInteger(seed) ? seed : undefined,
            });
            sendJson(res, 200, { ok: true, ...result });
          } catch (e) {
            sendJson(res, 500, { error: e?.message || String(e) });
          }
        });
      },
    },
  };
}
