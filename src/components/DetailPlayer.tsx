import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { $current, $isPlaying, $time, playTrack, requestSeek } from '../stores/player';
import { fmtDuration } from '../lib/format';
import type { Track } from '../lib/types';
import Waveform from './Waveform';

interface Props {
  track: Track;
  /** fallback duration (ms) shown before this track has been loaded into the player */
  durationMs: number;
  /** cover art shown behind the play button (null → solid accent) */
  coverUrl?: string | null;
}

export default function DetailPlayer({ track, durationMs, coverUrl }: Props) {
  const current = useStore($current);
  const isPlaying = useStore($isPlaying);
  const time = useStore($time);
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    fetch(`/peaks/${track.slug}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((p) => alive && setPeaks(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [track.slug]);

  const isCurrent = current?.slug === track.slug;
  const playing = isCurrent && isPlaying;
  const progress = isCurrent && time.dur ? time.cur / time.dur : 0;
  const cur = isCurrent ? time.cur * 1000 : 0;
  const dur = isCurrent && time.dur ? time.dur * 1000 : durationMs;

  function onSeek(frac: number) {
    if (!isCurrent) playTrack(track);
    requestSeek(frac);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 30 }}>
      <button
        onClick={() => playTrack(track)}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          width: 74,
          height: 74,
          flex: '0 0 74px',
          borderRadius: '50%',
          // Song art behind a translucent accent wash, so the cover shows
          // through the button while it still reads as the blue play control.
          background: coverUrl
            ? `linear-gradient(rgba(59,130,246,0.5), rgba(59,130,246,0.5)), url(${JSON.stringify(coverUrl)}) center / cover`
            : 'var(--accent)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--accent-glow-lg)',
        }}
      >
        {playing ? (
          <span style={{ display: 'flex', gap: 5 }}>
            <span style={{ width: 5, height: 24, background: '#fff', borderRadius: 1 }} />
            <span style={{ width: 5, height: 24, background: '#fff', borderRadius: 1 }} />
          </span>
        ) : (
          <span
            style={{
              width: 0,
              height: 0,
              borderLeft: '20px solid #fff',
              borderTop: '12px solid transparent',
              borderBottom: '12px solid transparent',
              marginLeft: 5,
            }}
          />
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Waveform peaks={peaks} progress={progress} onSeek={onSeek} variant="big" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--muted)' }}>{fmtDuration(cur)}</span>
          <span style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--muted)' }}>{fmtDuration(dur)}</span>
        </div>
      </div>
    </div>
  );
}
