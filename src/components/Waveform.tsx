import { useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';

interface Props {
  peaks: number[];
  /** played fraction [0,1] */
  progress: number;
  onSeek: (frac: number) => void;
  variant: 'mini' | 'big';
}

// Fallback shape so the bar never looks broken before peaks load / when absent.
const FLAT = Array.from({ length: 60 }, (_, i) => 0.25 + 0.15 * Math.sin(i * 0.5));

export default function Waveform({ peaks, progress, onSeek, variant }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const bars = peaks.length ? peaks : FLAT;
  const big = variant === 'big';

  function fracFromClientX(clientX: number): number {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onSeek(fracFromClientX(e.clientX));
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (dragging) onSeek(fracFromClientX(e.clientX));
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.05));
    else if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.05));
    else if (e.key === 'Home') onSeek(0);
    else if (e.key === 'End') onSeek(1);
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onKeyDown={onKey}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: big ? 88 : 40,
        cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      {bars.map((h, i) => {
        const played = i / bars.length < progress;
        const common = {
          flex: 1,
          minWidth: big ? 2 : 1,
          height: `${Math.max(8, h * 100)}%`,
          borderRadius: 1,
        } as const;
        const color = big
          ? { background: played ? 'var(--accent)' : 'var(--border-strong)' }
          : { background: 'linear-gradient(var(--accent-light), var(--accent))', opacity: played ? 1 : 0.55 };
        return <span key={i} style={{ ...common, ...color }} />;
      })}
    </div>
  );
}
