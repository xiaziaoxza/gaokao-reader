import React, { useState, useRef, useCallback } from 'react';
import { useArticleStore } from '../stores/articleStore';
import { ArticleRenderer } from '../components/ArticleRenderer';
import { TranslationToggle } from '../components/TranslationToggle';
import { synthesizeLongText } from '../services/edgeTTS';

interface Props {
  onBack: () => void;
}

export const ReaderView: React.FC<Props> = ({ onBack }) => {
  const { articleText, cnTranslation, matchedWords, audioUrls, status } = useArticleStore();
  const [showTranslation, setShowTranslation] = useState(false);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [narrateProgress, setNarrateProgress] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleNarrate = useCallback(async () => {
    if (!articleText) return;

    if (narrationUrl) {
      // Already generated, just play
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    setNarrating(true);
    setNarrateProgress('正在生成全文语音…');
    try {
      const blob = await synthesizeLongText(
        articleText,
        'en-US-female',
        (current, total) => {
          setNarrateProgress(`生成语音 ${current}/${total} 段`);
        }
      );
      const url = URL.createObjectURL(blob);
      setNarrationUrl(url);
      setNarrateProgress('');

      // Auto-play
      const a = new Audio(url);
      audioRef.current = a;
      a.play().catch(() => {});
    } catch (e: any) {
      setNarrateProgress('语音生成失败: ' + (e.message || '未知错误'));
    } finally {
      setNarrating(false);
    }
  }, [articleText, narrationUrl]);

  if (status !== 'ready' || !articleText) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#8b7e6a' }}>
        <p>还没有生成文章</p>
        <button
          onClick={onBack}
          style={{
            marginTop: 16, padding: '8px 24px',
            border: '1px solid #e8e0d5', borderRadius: 6,
            background: '#fff', cursor: 'pointer', color: '#8b7e6a',
          }}
        >
          ← 返回对话
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 780, margin: '0 auto',
      background: 'rgba(255,255,255,0.75)',
      border: '1px solid #e8e0d5', borderRadius: 8,
      padding: '2rem 2rem', boxShadow: '0 2px 12px rgba(80,50,20,0.08)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, paddingBottom: 12,
        borderBottom: '1px solid #e8e0d5',
        flexWrap: 'wrap', gap: 8,
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '4px 14px', border: '1px solid #e8e0d5',
            borderRadius: 16, background: '#fff', cursor: 'pointer',
            color: '#8b7e6a', fontSize: '0.8rem',
          }}
        >
          ← 对话
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#8b7e6a' }}>
            {matchedWords.length} 词汇 · {audioUrls.size} 音频
          </span>

          {/* Full narration button */}
          <button
            onClick={handleNarrate}
            disabled={narrating}
            style={{
              padding: '4px 12px', border: '1px solid #b87333',
              borderRadius: 16, background: narrating ? '#fef5ec' : '#fff',
              cursor: narrating ? 'default' : 'pointer',
              color: '#b87333', fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {narrating ? '⏳' : narrationUrl ? '🔊' : '🎧'}
            {narrating ? '生成中' : narrationUrl ? '全文朗读' : '生成全文语音'}
          </button>
        </div>
      </div>

      {/* Narration progress */}
      {narrateProgress && (
        <div style={{
          textAlign: 'center', padding: '6px 12px', marginBottom: 12,
          background: '#fef5ec', borderRadius: 8,
          color: '#b87333', fontSize: '0.8rem',
        }}>
          {narrateProgress}
        </div>
      )}

      {/* Audio player (shown after generation) */}
      {narrationUrl && (
        <div style={{
          marginBottom: 16, padding: '8px 12px',
          background: '#faf8f5', borderRadius: 8,
          border: '1px solid #e8e0d5',
        }}>
          <audio
            controls
            style={{ width: '100%', height: 32 }}
            src={narrationUrl}
            ref={audioRef}
          >
            你的浏览器不支持音频播放
          </audio>
        </div>
      )}

      {/* Translation toggle */}
      <TranslationToggle on={showTranslation} onToggle={() => setShowTranslation(!showTranslation)} />

      {/* Article */}
      <ArticleRenderer
        text={articleText}
        matchedWords={matchedWords}
        audioUrls={audioUrls}
        showTranslation={showTranslation}
      />

      {/* Chinese translation */}
      {cnTranslation && (
        <div style={{
          marginTop: '2rem', paddingTop: '1.5rem',
          borderTop: '2px solid #e8e0d5',
        }}>
          <h3 style={{
            fontSize: '1rem', color: '#b87333',
            textAlign: 'center', marginBottom: '1rem',
          }}>
            中文译文
          </h3>
          {cnTranslation.split('\n').filter(p => p.trim()).map((para, i) => (
            <p key={i} style={{
              textIndent: '2em', marginBottom: '0.8rem',
              lineHeight: 1.9, color: '#4a3f35',
            }}>
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
