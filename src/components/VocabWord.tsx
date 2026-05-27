import React, { useRef, useState, useCallback } from 'react';

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

  const handleSpeak = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Try pre-downloaded audio URL first
    if (audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const a = new Audio(audioUrl);
      audioRef.current = a;
      setSpeaking(true);
      a.onended = () => setSpeaking(false);
      a.onerror = () => setSpeaking(false);
      a.play().catch(() => setSpeaking(false));
    } else if ('speechSynthesis' in window) {
      // Fallback to built-in speech synthesis
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.8;
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    }
  }, [audioUrl, word]);

  const handleBox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setTipVisible(v => !v);
  }, []);

  // Close tooltip on outside click
  const tipRef = useRef<HTMLSpanElement>(null);

  return (
    <span style={{
      position: 'relative', display: 'inline',
      color, fontWeight: 600, background: bg,
      borderRadius: 2,
    }}>
      {word}

      {/* Gap row sitting in the line spacing below the word */}
      <span style={{
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)',
        display: showBox ? 'inline-flex' : 'none',
        alignItems: 'center', gap: 5,
        zIndex: 2, whiteSpace: 'nowrap', pointerEvents: 'auto',
      }}>
        {/* Translation box □ */}
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
          {/* Tooltip popup */}
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

        {/* Speak button 🔊 */}
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
