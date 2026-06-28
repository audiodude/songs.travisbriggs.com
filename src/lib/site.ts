// Shared site copy + links (single source of truth for nav/hero/footer).

export const EYEBROW = '▶ Songs & Sounds · Est. 2008';

export const BLURB =
  "I'm a musician, a multi-instrumentalist (of sorts), a songwriter. For 20 years I've been writing/recording/producing songs in my home recording studio slash bedroom (later, slash kitchen). There are lots of genres here, and the site doesn't tell a consistent story. Please enjoy. And of course share, like, and subscribe, smash that heart button, post to insta, tell your dog, take out a full page ad in NYT, etc.";

export const SOCIAL = {
  site: 'https://travisbriggs.com',
  dangerThirdRail: 'https://dangerthirdrail.com',
  mastodon: 'https://sfba.social/@audiodude',
  github: 'https://github.com/audiodude/songs2.travisbriggs.com',
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
    {
      label: 'All Songs',
      href: '/',
      external: false,
      current: active === 'songs',
    },
    { label: 'travisbriggs.com ↗', href: SOCIAL.site, external: true },
    { label: 'Danger Third Rail ↗', href: SOCIAL.dangerThirdRail, external: true },
    { label: 'Mastodon ↗', href: SOCIAL.mastodon, external: true },
    { label: 'GitHub ↗', href: SOCIAL.github, external: true },
  ];
}
