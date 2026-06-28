import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Songs are YAML data files written/edited by Keystatic (see keystatic.config.ts)
// and by the add-song CLI. The filename (without extension) is the slug.
const songs = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/songs' }),
  schema: z.object({
    title: z.string(),
    // YAML auto-parses unquoted ISO dates into Date objects; accept both and
    // normalize to a yyyy-mm-dd string.
    date: z
      .union([z.string(), z.date()])
      .transform((v) => (typeof v === 'string' ? v : v.toISOString().slice(0, 10))),
    duration: z.number().int().default(0),
    tags: z.array(z.string()).default([]),
    hidden: z.boolean().default(false),
    note: z.string().default(''),
  }),
});

export const collections = { songs };
