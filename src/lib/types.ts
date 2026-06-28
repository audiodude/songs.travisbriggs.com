export interface Song {
  /** filename-derived slug; stable, preserves the original site's URLs */
  slug: string;
  title: string;
  /** ISO yyyy-mm-dd */
  date: string;
  tags: string[];
  /** milliseconds */
  duration: number;
  hidden: boolean;
  /** personal story (Markdown source) */
  note: string;
  /** absolute mp3 URL on the audio host */
  src: string;
  /** normalized waveform amplitudes in [0,1]; fetched at runtime from /peaks/<slug>.json */
  peaks?: number[];
}

/** Minimal shape the player needs to load a track (peaks fetched by slug). */
export interface Track {
  slug: string;
  title: string;
  src: string;
  tags: string[];
}
