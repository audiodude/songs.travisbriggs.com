/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_MATOMO_SITE_ID?: string;
  readonly PUBLIC_AUDIO_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
