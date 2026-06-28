import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { $current, $isPlaying, $time, $seek, toggle, requestSeek } from '../stores/player';
import { fmtDuration } from '../lib/format';
import type { Track } from '../lib/types';
import Waveform from './Waveform';

const STORAGE_KEY = 'tb-player';

export default function Player() {
  const current = useStore($current);
  const isPlaying = useStore($isPlaying);
  const time = useStore($time);
  const seekReq = useStore($seek);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const restoreTime = useRef<number>(0);
  // ?show_player=0 hides the player for previews/screenshots (also skips restore).
  const [forceHide] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('show_player') === '0',
  );

  // Restore last track (paused) on a fresh page load.
  useEffect(() => {
    if (forceHide || $current.get()) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { track: Track; time: number };
      restoreTime.current = saved.time || 0;
      $current.set(saved.track);
    } catch {
      /* ignore */
    }
  }, []);

  // Load source + peaks whenever the track changes.
  useEffect(() => {
    if (!current) return;
    const audio = audioRef.current;
    if (audio && !audio.src.endsWith(encodeURI(new URL(current.src).pathname))) {
      audio.src = current.src;
    }
    setPeaks([]);
    let alive = true;
    fetch(`/peaks/${current.slug}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((p) => alive && setPeaks(p))
      .catch(() => alive && setPeaks([]));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ track: current, time: 0 }));
    } catch {
      /* ignore */
    }
    return () => {
      alive = false;
    };
  }, [current?.slug]);

  // Reflect play/pause state onto the element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) audio.play().catch(() => $isPlaying.set(false));
    else audio.pause();
  }, [isPlaying, current?.slug]);

  // Apply seek requests.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && seekReq != null && audio.duration) {
      audio.currentTime = seekReq * audio.duration;
      $seek.set(null);
    }
  }, [seekReq]);

  if (!current || forceHide) {
    // Keep a stable, persisted root + audio element even before first play
    // (or when hidden via ?show_player=0).
    return (
      <div data-player-root>
        <audio ref={audioRef} preload="metadata" />
      </div>
    );
  }

  const progress = time.dur ? time.cur / time.dur : 0;
  const tagLine = current.tags.slice(0, 3).join(' · ');

  return (
    <div data-player-root>
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (restoreTime.current && a.duration) {
            a.currentTime = restoreTime.current;
            restoreTime.current = 0;
          }
          $time.set({ cur: a.currentTime, dur: a.duration || 0 });
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          $time.set({ cur: a.currentTime, dur: a.duration || 0 });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ track: current, time: a.currentTime }));
          } catch {
            /* ignore */
          }
        }}
        onEnded={() => $isPlaying.set(false)}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: 'var(--player)',
          borderTop: '1px solid var(--border-strong)',
          boxShadow: '0 -10px 30px rgba(0,0,0,.3)',
        }}
      >
        <div
          className="player-inner"
          style={{
            maxWidth: 'var(--maxw)',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <button
            onClick={toggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: 42,
              height: 42,
              flex: '0 0 42px',
              borderRadius: '50%',
              background: 'var(--accent)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--accent-glow)',
            }}
          >
            {isPlaying ? (
              <span style={{ display: 'flex', gap: 3 }}>
                <span style={{ width: 3, height: 14, background: '#fff' }} />
                <span style={{ width: 3, height: 14, background: '#fff' }} />
              </span>
            ) : (
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '12px solid #fff',
                  borderTop: '7px solid transparent',
                  borderBottom: '7px solid transparent',
                  marginLeft: 3,
                }}
              />
            )}
          </button>

          <div className="player-meta" style={{ flex: '0 0 auto', minWidth: 150, maxWidth: 220 }}>
            <a
              href={`/${current.slug}/`}
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-.01em',
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {current.title}
            </a>
            <div
              style={{
                font: '400 11px/1.4 var(--font-mono)',
                color: 'var(--faint)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {tagLine}
            </div>
          </div>

          <div className="player-wave" style={{ flex: 1, minWidth: 0 }}>
            <Waveform peaks={peaks} progress={progress} onSeek={requestSeek} variant="mini" />
          </div>

          <span className="player-time" style={{ font: "400 12px/1 var(--font-mono)", color: 'var(--faint)', flex: '0 0 auto' }}>
            {fmtDuration(time.cur * 1000)} / {fmtDuration(time.dur * 1000)}
          </span>
        </div>
      </div>
    </div>
  );
}
