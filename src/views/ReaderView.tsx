import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useArticleStore } from '../stores/articleStore';
import { useWordbankStore } from '../stores/wordbankStore';
import { ArticleRenderer } from '../components/ArticleRenderer';
import { TranslationToggle } from '../components/TranslationToggle';
import { matchVocab } from '../services/vocab';
import { speak, stopSpeaking, isSpeaking, isSpeechAvailable, estimateDuration } from '../services/speech';

interface Props {
  onBack: () => void;
}

export const ReaderView: React.FC<Props> = ({ onBack }) => {
  const { articleText, cnTranslation, matchedWords, audioUrls, status } = useArticleStore();
  const { banks } = useWordbankStore();
  const [showTranslation, setShowTranslation] = useState(false);

  // Re-match with current bank settings for dynamic color/state sync
  const liveMatchedWords = useMemo(() => {
    if (!articleText) return matchedWords;
    const enabledBanks = banks.filter(b => b.enabled);
    if (enabledBanks.length === 0) return [];
    const banksForMatch = enabledBanks.map(b => ({
      id: b.id, color: b.color, bg: b.bg, words: b.words,
    }));
    return matchVocab(articleText, banksForMatch);
  }, [articleText, banks, matchedWords]);
  const [narrating, setNarrating] = useState(false);
  const [narrateProgress, setNarrateProgress] = useState('');

  const handleNarrate = useCallback(() => {
    if (!articleText) return;

    if (isSpeaking()) {
      stopSpeaking();
      setNarrating(false);
      setNarrateProgress('');
      return;
    }

    if (!isSpeechAvailable()) {
      setNarrateProgress('此设备不支持语音合成');
      return;
    }

    setNarrating(true);
    setNarrateProgress('正在朗读…');

    speak(
      articleText,
      (charIndex) => {
        const pct = Math.round((charIndex / articleText.length) * 100);
        setNarrateProgress(`朗读中 ${pct}%`);
      },
      () => {
        setNarrating(false);
        setNarrateProgress('朗读完成');
      },
      (err) => {
        setNarrating(false);
        setNarrateProgress('朗读失败: ' + err);
      }
    );
  }, [articleText]);

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
      width: '95%', margin: '0 auto',
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
            {liveMatchedWords.length} 词汇 · {audioUrls.size} 音频
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
            {narrating ? '⏹' : '🔊'}
            {narrating ? '停止朗读' : '全文朗读'}
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

      {/* Translation toggle */}
      <TranslationToggle on={showTranslation} onToggle={() => setShowTranslation(!showTranslation)} />

      {/* Article */}
      <ArticleRenderer
        text={articleText}
        matchedWords={liveMatchedWords}
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
