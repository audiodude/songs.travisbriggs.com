import { useEffect, useRef, useState } from 'react';

type Sort = 'newest' | 'oldest' | 'az' | 'shuffle';

interface Props {
  tags: string[];
  freq: Record<string, number>;
  total: number;
}

export default function Controls({ tags, freq, total }: Props) {
  const [sort, setSort] = useState<Sort>('newest');
  const [active, setActive] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // mobile "Filters" zippy
  const [count, setCount] = useState(total);
  const original = useRef<HTMLElement[]>([]);

  // Capture the server-rendered (newest-first) order, wire row tag clicks,
  // and honor a ?tag= query param for cross-page tag links.
  useEffect(() => {
    const list = document.querySelector('[data-song-list]');
    if (!list) return;
    original.current = Array.from(list.querySelectorAll<HTMLElement>('.song'));

    const onClick = (e: Event) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-tag]');
      if (!a) return;
      e.preventDefault();
      const t = a.dataset.tag!;
      setActive((prev) => (prev.includes(t) ? prev : [...prev, t]));
      window.scrollTo({ top: (list as HTMLElement).offsetTop - 80, behavior: 'smooth' });
    };
    list.addEventListener('click', onClick);

    const tag = new URLSearchParams(window.location.search).get('tag');
    if (tag) setActive([tag]);

    return () => list.removeEventListener('click', onClick);
  }, []);

  // Apply sort + filter to the live DOM whenever they change.
  useEffect(() => {
    const list = document.querySelector('[data-song-list]');
    if (!list || original.current.length === 0) return;

    let rows = [...original.current];
    if (sort === 'oldest') rows.reverse();
    else if (sort === 'az') rows.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    else if (sort === 'shuffle') shuffle(rows);

    let visible = 0;
    for (const li of rows) {
      const rowTags = (li.querySelector<HTMLElement>('.song-row')?.dataset.tags ?? '').split(',');
      const show = active.length === 0 || active.some((t) => rowTags.includes(t));
      li.style.display = show ? '' : 'none';
      if (show) visible++;
      list.appendChild(li);
    }
    const empty = list.querySelector<HTMLElement>('[data-empty]');
    if (empty) {
      empty.style.display = visible === 0 ? '' : 'none';
      list.appendChild(empty);
    }
    setCount(visible);
  }, [sort, active]);

  function clickDate() {
    setSort((s) => (s === 'newest' ? 'oldest' : 'newest'));
  }

  const dateActive = sort === 'newest' || sort === 'oldest';

  return (
    <div className={`controls${expanded ? ' is-expanded' : ''}`} style={{ position: 'relative' }}>
      <div
        className="controls-head"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
      >
        <span
          className="track-count"
          style={{ font: '700 11px/1 var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--faint)' }}
        >
          {count} TRACKS
        </span>

        <button
          className="filters-toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          Filters{active.length ? ` (${active.length})` : ''} {expanded ? '⬆' : '⬇'}
        </button>

        <div className="pills" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill active={dateActive} onClick={clickDate}>
            {sort === 'oldest' ? 'Oldest ▴' : 'Newest ▾'}
          </Pill>
          <Pill active={sort === 'az'} onClick={() => setSort('az')}>A–Z</Pill>
          <Pill active={sort === 'shuffle'} onClick={() => (sort === 'shuffle' ? reshuffle(setSort) : setSort('shuffle'))}>Shuffle ⤬</Pill>
          <Pill active={active.length > 0 || open} onClick={() => setOpen((o) => !o)}>
            {active.length ? `Tags (${active.length})` : 'Tags +'}
          </Pill>
        </div>
      </div>

      {open && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            background: 'var(--player)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {active.length > 0 && (
            <button onClick={() => setActive([])} style={ghostChip}>
              Show All ✕
            </button>
          )}
          {tags.map((t) => {
            const on = active.includes(t);
            return (
              <button
                key={t}
                onClick={() => setActive((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))}
                style={{
                  font: '400 11px/1 var(--font-mono)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-chip)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  border: on ? '1px solid var(--accent)' : '1px solid transparent',
                  background: on ? 'var(--accent)' : 'var(--rest)',
                  color: on ? '#fff' : 'var(--chip-text)',
                }}
              >
                {t} <span style={{ color: on ? 'rgba(255,255,255,.7)' : 'var(--faint)' }}>{freq[t]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ghostChip: React.CSSProperties = {
  font: '600 11px/1 var(--font-body)',
  padding: '5px 10px',
  borderRadius: 999,
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--accent-light)',
  border: '1px solid var(--accent)',
};

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        font: '600 13px/1 var(--font-body)',
        padding: '8px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--accent-light)',
        border: '1px solid var(--accent)',
      }}
    >
      {children}
    </button>
  );
}

function titleOf(li: HTMLElement): string {
  return (li.querySelector('.row-title')?.textContent ?? '').toLowerCase();
}
function shuffle(a: HTMLElement[]): HTMLElement[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// force a re-apply when Shuffle is clicked while already shuffling
function reshuffle(setSort: (s: Sort) => void) {
  setSort('newest');
  setTimeout(() => setSort('shuffle'), 0);
}
