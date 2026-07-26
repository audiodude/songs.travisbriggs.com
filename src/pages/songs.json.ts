import type { APIRoute } from "astro";
import { loadVisibleSongs } from "../lib/songs";

// Public JSON catalog of all visible songs, for consumption by other
// travisbriggs.com properties (e.g. the random-song player on the garden
// homepage). CORS-open so browser fetches from other origins work.
export const GET: APIRoute = async () => {
  const songs = await loadVisibleSongs();
  const body = songs.map((s) => ({
    slug: s.slug,
    title: s.title,
    date: s.date,
    duration: s.duration,
    tags: s.tags,
    src: s.src,
    url: `https://songs.travisbriggs.com/${s.slug}/`,
    cover: `https://songs.travisbriggs.com/covers/${s.slug}.jpg`,
  }));
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600",
    },
  });
};
