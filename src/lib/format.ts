const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Milliseconds -> `m:ss` (rounded to the nearest second). */
export function fmtDuration(ms: number): string {
  const total = Math.round((ms || 0) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Parse a yyyy-mm-dd string into numeric parts (timezone-safe — no Date). */
function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** `2026-05-28` -> `May 2026`. */
export function fmtMonthYear(iso: string): string {
  const { y, m } = parts(iso);
  return `${ABBR[m - 1]} ${y}`;
}

/** `2025-01-26` -> `January 26, 2025`. */
export function fmtLongDate(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${FULL[m - 1]} ${d}, ${y}`;
}

/**
 * Reduce Markdown to plain text: unwrap links/images to their text, drop
 * emphasis / code / heading / list / quote markers, and collapse whitespace.
 * Not a full parser — enough for the prose notes on this site, so meta
 * descriptions don't leak raw `[text](url)` syntax into social cards.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images ![alt](url) -> alt (before links)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // inline links [text](url) -> text
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1') // reference links [text][id] -> text
    .replace(/`([^`]*)`/g, '$1') // inline code `code` -> code
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '') // list markers
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Plain-text, length-capped description for meta / OpenGraph tags. Strips
 * Markdown, then truncates on a word boundary with an ellipsis when too long.
 */
export function metaDescription(md: string, max = 160): string {
  const text = stripMarkdown(md);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
