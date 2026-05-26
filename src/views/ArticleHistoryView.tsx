import React, { useState, useEffect, useMemo } from 'react';
import { useArticleHistoryStore, SavedArticle } from '../stores/articleHistoryStore';
import { useArticleStore } from '../stores/articleStore';
import { useWordbankStore } from '../stores/wordbankStore';
import { ArticleRenderer } from '../components/ArticleRenderer';
import { TranslationToggle } from '../components/TranslationToggle';
import { matchVocab } from '../services/vocab';

interface Props {
  onBack?: () => void;
}

export const ArticleHistoryView: React.FC<Props> = ({ onBack }) => {
  const { articles, loaded, load, remove } = useArticleHistoryStore();
  const { setArticle, setMatchedWords, setAudioUrls, setStatus } = useArticleStore();
  const { banks } = useWordbankStore();
  const [selected, setSelected] = useState<SavedArticle | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rematch selected article with current bank colors so color changes sync
  const rematchedWords = useMemo(() => {
    if (!selected) return [];
    const enabledBanks = banks.filter(b => b.enabled);
    if (enabledBanks.length === 0) return selected.matchedWords;
    const banksForMatch = enabledBanks.map(b => ({
      id: b.id, color: b.color, bg: b.bg, words: b.words,
    }));
    const fresh = matchVocab(selected.articleText, banksForMatch);
    // Merge fresh colors into saved words (preserves word order/positions)
    const colorMap = new Map<string, { color: string; bg: string }>();
    for (const m of fresh) {
      colorMap.set(m.lower, { color: m.color, bg: m.bg });
    }
    return selected.matchedWords.map(m => {
      const update = colorMap.get(m.lower);
      return update ? { ...m, color: update.color, bg: update.bg } : m;
    });
  }, [selected, banks]);

  const handleView = (article: SavedArticle) => {
    setArticle(article.articleText, article.cnTranslation, article.title);
    setSelected(article);
  };

  // Sync rematched words to articleStore whenever selected article or colors change
  useEffect(() => {
    if (selected) {
      setMatchedWords(rematchedWords);
      setAudioUrls(new Map());
      setStatus('ready');
    }
  }, [rematchedWords, selected, setMatchedWords, setAudioUrls, setStatus]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    remove(id);
    if (selected?.id === id) setSelected(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (!loaded) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#8b7e6a' }}>加载中…</div>;
  }

  // Detail view
  if (selected) {
    return (
      <div style={{ maxWidth: 780, margin: '0 auto', padding: 16 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, flexWrap: 'wrap', gap: 8,
        }}>
          <button onClick={() => setSelected(null)} style={{
            padding: '4px 14px', border: '1px solid #e8e0d5',
            borderRadius: 16, background: '#fff', cursor: 'pointer',
            color: '#8b7e6a', fontSize: '0.8rem',
          }}>
            ← 返回列表
          </button>
          <h2 style={{ color: '#b87333', margin: 0, fontSize: '1.1rem' }}>{selected.title}</h2>
          <span style={{ color: '#8b7e6a', fontSize: '0.75rem' }}>{formatDate(selected.createdAt)}</span>
        </div>

        <TranslationToggle on={showTranslation} onToggle={() => setShowTranslation(!showTranslation)} />

        <div style={{
          background: 'rgba(255,255,255,0.75)',
          border: '1px solid #e8e0d5', borderRadius: 8,
          padding: '2rem 2rem', boxShadow: '0 2px 12px rgba(80,50,20,0.08)',
          marginTop: 12,
        }}>
          <ArticleRenderer
            text={selected.articleText}
            matchedWords={rematchedWords}
            audioUrls={new Map()}
            showTranslation={showTranslation}
          />
        </div>

        {selected.cnTranslation && (
          <div style={{
            marginTop: '2rem', padding: '1.5rem 2rem',
            background: 'rgba(255,255,255,0.75)',
            border: '1px solid #e8e0d5', borderRadius: 8,
          }}>
            <h3 style={{ fontSize: '1rem', color: '#b87333', textAlign: 'center', marginBottom: '1rem' }}>
              中文译文
            </h3>
            {selected.cnTranslation.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i} style={{ textIndent: '2em', marginBottom: '0.8rem', lineHeight: 1.9, color: '#4a3f35' }}>
                {para}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2 style={{ color: '#b87333', marginBottom: 20, textAlign: 'center' }}>文章历史</h2>

      {articles.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#8b7e6a', padding: 60 }}>
          <p style={{ fontSize: '2rem', marginBottom: 12 }}>📭</p>
          <p>还没有保存的文章</p>
          <p style={{ fontSize: '0.8rem', marginTop: 8 }}>生成文章后会自动保存在这里</p>
        </div>
      ) : (
        articles.map(a => (
          <div key={a.id}
            onClick={() => handleView(a)}
            style={{
              padding: '14px 16px', marginBottom: 10,
              border: '1px solid #e8e0d5', borderRadius: 8,
              background: '#fff', cursor: 'pointer',
              transition: 'box-shadow 0.2s',
              boxShadow: '0 1px 4px rgba(80,50,20,0.04)',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(80,50,20,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(80,50,20,0.04)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#2c2416', fontSize: '0.95rem', marginBottom: 4 }}>
                  {a.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#8b7e6a', display: 'flex', gap: 12 }}>
                  <span>{formatDate(a.createdAt)}</span>
                  <span>{a.matchedWords.length} 词汇</span>
                  <span>{(a.articleText || '').length} 字符</span>
                </div>
                <div style={{
                  fontSize: '0.8rem', color: '#8b7e6a', marginTop: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', maxWidth: '100%',
                }}>
                  {(a.articleText || '').slice(0, 80)}…
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, a.id)}
                style={{
                  padding: '3px 10px', border: '1px solid #c0392b',
                  borderRadius: 4, background: '#fff',
                  color: '#c0392b', cursor: 'pointer', fontSize: '0.7rem',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))
      )}

      {onBack && (
        <button onClick={onBack} style={{
          marginTop: 16, padding: '8px 24px',
          border: '1px solid #e8e0d5', borderRadius: 6,
          background: '#fff', cursor: 'pointer',
          color: '#8b7e6a', fontSize: '0.85rem',
        }}>
          返回
        </button>
      )}
    </div>
  );
};
