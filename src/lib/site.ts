// Shared site copy + links (single source of truth for nav/hero/footer).

export const EYEBROW = '▶ SONGS & SOUNDS · EST. 2008';

export const BLURB =
  "I record a song just about every time I have a feeling. Demos, jokes, heartbreakers, a couple I'm genuinely proud of. None of it's precious — all of it's honest.";

export const SOCIAL = {
  site: 'https://travisbriggs.com',
  mastodon: 'https://musicians.today/@audiodude',
  github: 'https://github.com/audiodude/songs.travisbriggs.com',
};

export interface NavLink {
  label: string;
  href: string;
  external: boolean;
  /** marks the current page (All Songs on the index) */
  current?: boolean;
}

export function navLinks(active: 'songs' | null = null): NavLink[] {
  return [
    { label: 'All Songs', href: '/', external: false, current: active === 'songs' },
    { label: 'travisbriggs.com ↗', href: SOCIAL.site, external: true },
    { label: 'Mastodon ↗', href: SOCIAL.mastodon, external: true },
    { label: 'GitHub ↗', href: SOCIAL.github, external: true },
  ];
}
