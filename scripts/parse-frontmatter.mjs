/**
 * Parse the legacy Flask-FlatPages song format:
 *
 *   title: Monthly
 *   date: 2026/05/28
 *   duration: 245000
 *   tags: ['electronic', 'breakbeat']
 *   hidden: true            (optional)
 *
 *   <note body, Markdown, until EOF>
 *
 * The header runs until the first blank line; everything after is the note.
 *
 * @param {string} raw
 * @returns {{ meta: { title:string, date:string, duration:number, tags:string[], hidden:boolean }, note:string }}
 */
export function parseFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  const split = text.indexOf('\n\n');
  const header = split === -1 ? text : text.slice(0, split);
  const note = split === -1 ? '' : text.slice(split + 2).replace(/\s+$/, '');

  const meta = { title: '', date: '', duration: 0, tags: [], hidden: false };
  for (const line of header.split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    switch (key) {
      case 'title': meta.title = unquote(value); break;
      case 'date': meta.date = toISO(value); break;
      case 'duration': meta.duration = parseInt(value, 10) || 0; break;
      case 'tags': meta.tags = parseTags(value); break;
      case 'hidden': meta.hidden = /^true$/i.test(value); break;
      default: break;
    }
  }
  return { meta, note };
}

/** `2026/05/28` (or `2026-5-8`) -> `2026-05-28`. */
function toISO(v) {
  const m = v.trim().split(/[/-]/).map((s) => s.trim());
  if (m.length === 3) {
    const [y, mo, d] = m;
    return `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return v.trim();
}

/** Strip a single pair of matching surrounding YAML quotes from a scalar. */
function unquote(v) {
  const t = v.trim();
  if (t.length >= 2) {
    const q = t[0];
    if ((q === "'" || q === '"') && t[t.length - 1] === q) {
      const inner = t.slice(1, -1);
      return q === "'" ? inner.replace(/''/g, "'") : inner.replace(/\\"/g, '"');
    }
  }
  return t;
}

/** Python list literal `['a', 'b']` -> `['a','b']`. */
function parseTags(v) {
  const t = v.trim();
  if (!t || t === '[]') return [];
  try {
    const arr = JSON.parse(t.replace(/'/g, '"'));
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
