// Dev-only client for the "Cover · dev only" panel on song pages. Imported
// conditionally (`if (import.meta.env.DEV) import('./cover-admin')`) so it is
// tree-shaken out of the production bundle entirely.
//
// Mirrors wire-play.ts: one delegated listener on `document` (which persists
// across Astro ClientRouter navigations), guarded so it attaches once.

declare global {
  interface Window {
    __coverAdminWired?: boolean;
  }
}

// Spinner keyframes — injected once, only in dev (this module never ships).
function ensureSpinnerStyle() {
  if (document.getElementById('cover-admin-style')) return;
  const style = document.createElement('style');
  style.id = 'cover-admin-style';
  style.textContent = `
    .cover-spinner {
      width: 15px; height: 15px; flex: 0 0 auto;
      border: 2px solid var(--border-strong);
      border-top-color: var(--accent-light);
      border-radius: 50%;
      animation: coverSpin 0.7s linear infinite;
    }
    @keyframes coverSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

async function onGenerate(btn: HTMLButtonElement) {
  const root = btn.closest<HTMLElement>('[data-cover-admin]');
  if (!root) return;
  const slug = root.dataset.slug ?? '';
  const promptEl = root.querySelector<HTMLTextAreaElement>('[data-cover-prompt]');
  const statusEl = root.querySelector<HTMLElement>('[data-cover-status]');
  const spinner = root.querySelector<HTMLElement>('[data-cover-spinner]');
  const preview = root.querySelector<HTMLImageElement>('[data-cover-preview]');
  if (!promptEl || !statusEl) return;

  const prompt = promptEl.value.trim();
  if (!prompt) {
    statusEl.textContent = 'Enter a prompt first.';
    return;
  }

  btn.disabled = true;
  btn.style.opacity = '0.55';
  if (spinner) spinner.hidden = false;
  statusEl.textContent = 'Generating… (fal.ai, ~10–30s)';

  try {
    const res = await fetch('/api/gen-cover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, prompt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (preview) preview.src = `/covers/${slug}.jpg?t=${Date.now()}`;
    statusEl.textContent = `Done ✓ seed ${data.seed ?? '—'} — wrote public/covers/${slug}.jpg`;
  } catch (err) {
    statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    if (spinner) spinner.hidden = true;
  }
}

if (!window.__coverAdminWired) {
  window.__coverAdminWired = true;
  ensureSpinnerStyle();
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cover-generate]');
    if (!btn) return;
    e.preventDefault();
    void onGenerate(btn);
  });
}

export {};
