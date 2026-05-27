import React, { useState, useRef, useCallback, useEffect } from 'react';

const SPEEDS = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  audioBlob: Blob | null;
  /** Called when user wants to synthesize (blob is null and no saved audio) */
  onSynthesize?: () => void;
  synthesizing?: boolean;
  synthProgress?: string;
  compact?: boolean;
}

export const NarrationPlayer: React.FC<Props> = ({
  audioBlob,
  onSynthesize,
  synthesizing,
  synthProgress,
  compact,
}) => {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlaying(false);
    setDuration(0);
    setCurrentTime(0);
  }, []);

  // Load blob into audio element
  useEffect(() => {
    cleanup();
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    urlRef.current = url;
    const a = new Audio(url);
    audioRef.current = a;
    a.playbackRate = speed;

    a.addEventListener('loadedmetadata', () => setDuration(a.duration));
    a.addEventListener('timeupdate', () => setCurrentTime(a.currentTime));
    a.addEventListener('ended', () => { setPlaying(false); setCurrentTime(0); });
    a.addEventListener('error', () => cleanup());

    return () => cleanup();
  }, [audioBlob]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const handlePlayPause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  }, [speed]);

  // No audio yet — show synthesize button
  if (!audioBlob) {
    return (
      <div style={{
        textAlign: 'center', padding: '6px 0', marginBottom: 12,
      }}>
        {synthesizing ? (
          <div style={{ color: '#b87333', fontSize: '0.8rem' }}>{synthProgress || '合成中…'}</div>
        ) : (
          <button
            onClick={onSynthesize}
            style={{
              padding: '5px 16px', border: '1px solid #b87333',
              borderRadius: 16, background: '#fff', cursor: 'pointer',
              color: '#b87333', fontSize: '0.85rem',
            }}
          >
            🔊 全文朗读
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      padding: compact ? '6px 10px' : '10px 14px',
      marginBottom: 12,
      background: '#faf8f5', borderRadius: 8,
      border: '1px solid #e8e0d5',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.65rem', color: '#8b7e6a', minWidth: 28 }}>
          {fmtTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          style={{
            flex: 1, height: 4,
            accentColor: '#b87333',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '0.65rem', color: '#8b7e6a', minWidth: 28 }}>
          {fmtTime(duration)}
        </span>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={handlePlayPause}
          style={{
            padding: '3px 8px', border: '1px solid #b87333',
            borderRadius: 12, background: '#fff', cursor: 'pointer',
            fontSize: '0.8rem', color: '#b87333',
          }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button
          onClick={handleStop}
          style={{
            padding: '3px 8px', border: '1px solid #c0392b',
            borderRadius: 12, background: '#fff', cursor: 'pointer',
            fontSize: '0.8rem', color: '#c0392b',
          }}
        >
          ⏹
        </button>
        <button
          onClick={cycleSpeed}
          style={{
            padding: '3px 8px', border: '1px solid #3498db',
            borderRadius: 12, background: '#fff', cursor: 'pointer',
            fontSize: '0.7rem', color: '#3498db',
            minWidth: 36,
          }}
        >
          {speed}x
        </button>
        {onSynthesize && (
          <button
            onClick={onSynthesize}
            disabled={synthesizing}
            style={{
              padding: '3px 8px', border: '1px solid #e8e0d5',
              borderRadius: 12, background: '#fff', cursor: 'pointer',
              fontSize: '0.65rem', color: '#8b7e6a',
            }}
          >
            🔄
          </button>
        )}
      </div>
    </div>
  );
};
