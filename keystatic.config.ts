import { config, collection, fields } from '@keystatic/core';

// Local-mode CMS: editing happens via `astro dev` -> /keystatic, which reads and
// writes the YAML data files in src/content/songs/. Production builds are static
// and never include the admin (see astro.config.mjs).
export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'Songs & Sounds' },
  },
  collections: {
    songs: collection({
      label: 'Songs',
      slugField: 'title',
      path: 'src/content/songs/*',
      format: { data: 'yaml' },
      columns: ['title', 'date'],
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { isRequired: true } },
        }),
        date: fields.date({ label: 'Date', validation: { isRequired: true } }),
        duration: fields.integer({
          label: 'Duration (ms)',
          description: 'Set automatically by the add-song CLI from the mp3.',
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value,
        }),
        hidden: fields.checkbox({
          label: 'Hidden',
          description: 'Build the page but exclude from the index and related lists.',
          defaultValue: false,
        }),
        note: fields.text({
          label: 'Note',
          description: 'The personal story for this song (Markdown allowed).',
          multiline: true,
        }),
      },
    }),
  },
});
