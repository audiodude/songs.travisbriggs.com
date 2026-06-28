// Delegated click wiring so static (Astro-rendered) song rows can drive the
// global player island. Imports the same nanostore the Player subscribes to.
import { playTrack } from '../stores/player';

declare global {
  interface Window {
    __playWired?: boolean;
  }
}

if (!window.__playWired) {
  window.__playWired = true;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Let title links and tag links behave normally.
    const link = target.closest('a[href]');
    const tag = target.closest('[data-tag]');
    if (link && !link.hasAttribute('data-play')) return;
    if (tag) return;

    const el = target.closest<HTMLElement>('[data-play]');
    if (!el) return;
    e.preventDefault();
    playTrack({
      slug: el.dataset.slug ?? '',
      title: el.dataset.title ?? '',
      src: el.dataset.src ?? '',
      tags: (el.dataset.tags ?? '').split(',').filter(Boolean),
    });
  });
}
