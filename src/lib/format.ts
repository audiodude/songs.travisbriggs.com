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
