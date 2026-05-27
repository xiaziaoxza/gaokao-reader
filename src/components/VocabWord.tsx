import React, { useRef, useState, useCallback } from 'react';
import { getCachedAudio } from '../services/audio';
import { downloadAudio } from '../services/audio';

interface Props {
  word: string;
  translation: string;
  color: string;
  bg: string;
  audioUrl?: string;
  showBox: boolean;
}

export const VocabWord: React.FC<Props> = ({ word, translation, color, bg, audioUrl, showBox }) => {
  const [tipVisible, setTipVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeaking(true);

    const playBlob = async (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      a.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      try {
        await a.play();
      } catch {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      }
    };

    // 1) Pre-populated audioUrl from article store (blob URL — fastest)
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const a = new Audio(audioUrl);
      audioRef.current = a;
      a.onended = () => setSpeaking(false);
      a.onerror = async () => {
        // blob URL may be stale, try IndexedDB cache
        const cached = await getCachedAudio(word);
        if (cached) { await playBlob(cached); return; }
        setSpeaking(false);
      };
      try {
        await a.play();
        return;
      } catch {
        // blob URL failed, try IndexedDB
        const cached = await getCachedAudio(word);
        if (cached) { await playBlob(cached); return; }
      }
    }

    // 2) IndexedDB cache (from bank prefetch or previous downloads)
    const cached = await getCachedAudio(word);
    if (cached) {
      await playBlob(cached);
      return;
    }

    // 3) Download on-the-fly (through proxy in dev, direct in APK)
    try {
      const url = await downloadAudio(word);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => setSpeaking(false);
      a.onerror = () => setSpeaking(false);
      await a.play();
      return;
    } catch { /* download failed */ }

    // 4) Last resort: Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.8;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } else {
      setSpeaking(false);
    }
  }, [audioUrl, word]);

  const handleBox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTipVisible(v => !v);
  }, []);

  const tipRef = useRef<HTMLSpanElement>(null);

  return (
    <span style={{
      position: 'relative', display: 'inline',
      color, fontWeight: 600, background: bg,
      borderRadius: 2,
    }}>
      {word}

      <span style={{
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)',
        display: showBox ? 'inline-flex' : 'none',
        alignItems: 'center', gap: 5,
        zIndex: 2, whiteSpace: 'nowrap', pointerEvents: 'auto',
      }}>
        <span
          onClick={handleBox}
          ref={tipRef}
          style={{
            cursor: 'pointer', fontSize: '0.6rem',
            color: tipVisible ? color : '#8b7e6a',
            padding: '0 1px', borderRadius: 2, lineHeight: 1,
            userSelect: 'none', transition: 'color 0.15s',
            position: 'relative',
          }}
        >
          □
          {tipVisible && (
            <span style={{
              position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%',
              transform: 'translateX(-50%)',
              background: '#2c2416', color: '#fff',
              fontSize: '0.72rem', fontWeight: 500,
              padding: '2px 7px', borderRadius: 4,
              whiteSpace: 'nowrap', zIndex: 100,
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              letterSpacing: '0.03em',
            }}>
              {translation}
              <span style={{
                position: 'absolute', top: '100%', left: '50%',
                transform: 'translateX(-50%)',
                border: '4px solid transparent',
                borderTopColor: '#2c2416',
              }} />
            </span>
          )}
        </span>

        <span
          onClick={handleSpeak}
          title="点击朗读"
          style={{
            cursor: 'pointer', fontSize: '0.6rem',
            color: speaking ? '#c0392b' : '#b87333',
            padding: '0 2px', borderRadius: 2, lineHeight: 1,
            opacity: speaking ? 1 : 0.55,
            transition: 'all 0.15s',
            animation: speaking ? 'pulse 0.5s ease-in-out' : 'none',
          }}
        >
          🔊
        </span>
      </span>
    </span>
  );
};
