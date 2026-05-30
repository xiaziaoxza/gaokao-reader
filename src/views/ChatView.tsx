import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useWordbankStore } from '../stores/wordbankStore';
import { useArticleStore } from '../stores/articleStore';
import { useArticleHistoryStore } from '../stores/articleHistoryStore';
import { sendChatMessage } from '../services/chat';
import { matchVocab } from '../services/vocab';
import { downloadAudioBatch } from '../services/audio';
import { getAllEnabledWords } from '../services/wordbank';

interface Props {
  onViewArticle: () => void;
  onViewHistory: () => void;
}

export const ChatView: React.FC<Props> = ({ onViewArticle, onViewHistory }) => {
  const { messages, sending, addMessage, setSending } = useChatStore();
  const { apiKey } = useSettingsStore();
  const { banks } = useWordbankStore();
  const { setStatus, setArticle, setArticleId, setMatchedWords, setAudioUrls, setProgress } = useArticleStore();
  const saveArticle = useArticleHistoryStore(s => s.save);

  const inputRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);
  const [composing, setComposing] = useState(false); // IME composition guard
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const input = inputRef.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text || sending) return;
    if (!apiKey) {
      addMessage({ role: 'assistant', content: '请先在设置页面配置 DeepSeek API Key。' });
      return;
    }

    // Build user message with optional custom words
    let userContent = text;
    const words = customRef.current?.value.trim() || '';
    if (words) {
      userContent += '\n\n[需要学习的单词: ' + words + ']';
    }

    addMessage({ role: 'user', content: text });
    input.value = '';
    if (customRef.current) customRef.current.value = '';
    setSending(true);

    try {
      // Send all message history + new message
      const allMsgs = [...messages, { role: 'user' as const, content: userContent }]
        .map(m => ({ role: m.role, content: m.content }));

      const result = await sendChatMessage({
        messages: allMsgs,
        apiKey,
      });

      const hasArticle = !!(result.articleText);

      addMessage({
        role: 'assistant',
        content: result.message,
        hasArticle,
        articleText: result.articleText,
        articleTranslation: result.articleTranslation,
      });

      // If article was generated, process it
      if (result.articleText) {
        setStatus('generating');
        // Use model-generated title, or fall back to first sentence
        const title = result.articleTitle
          || result.articleText.split(/[.!\n]/)[0]?.trim().slice(0, 60)
          || '未命名文章';
        setArticle(result.articleText, result.articleTranslation || '', title);

        // Match vocabulary
        const enabledBanks = banks.filter(b => b.enabled);
        const banksForMatch = enabledBanks.map(b => ({
          id: b.id, color: b.color, bg: b.bg, words: b.words,
        }));
        const matched = matchVocab(result.articleText, banksForMatch);
        setMatchedWords(matched);

        // Download audio
        if (matched.length > 0) {
          setStatus('downloading');
          const uniqueWords = [...new Set(matched.map(m => m.lower))];
          setProgress(0, uniqueWords.length, '下载音频');
          const audioUrls = await downloadAudioBatch(uniqueWords, (p) => {
            setProgress(p.current, p.total, '下载音频');
          });
          setAudioUrls(audioUrls);
        }

        setStatus('ready');

        // Auto-save to history
        const saved = saveArticle({
          title,
          articleText: result.articleText || '',
          cnTranslation: result.articleTranslation || '',
          matchedWords: matched,
        });
        setArticleId(saved.id);
      }
    } catch (e: any) {
      addMessage({ role: 'assistant', content: '抱歉，出错了: ' + (e.message || '未知错误') });
    } finally {
      setSending(false);
    }
  };

  const lastArticle = [...messages].reverse().find(m => m.hasArticle);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center', padding: '12px 0',
        borderBottom: '1px solid #e8e0d5', marginBottom: 12,
      }}>
        <h2 style={{ color: '#b87333', margin: 0, fontSize: '1.1rem' }}>AI 英语老师</h2>
        <p style={{ color: '#8b7e6a', fontSize: '0.75rem', margin: '4px 0 0' }}>
          告诉我你想要什么类型的文章，我会为你生成
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center', color: '#8b7e6a', padding: 40,
            fontSize: '0.9rem', lineHeight: 2,
          }}>
            <p>👋 你好！我是你的英语阅读助手</p>
            <p style={{ fontSize: '0.8rem' }}>
              试试说：「请生成一篇关于环境保护的英文文章，500词左右」<br />
              你也可以指定要学习的单词，在下方输入框中添加
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{
            marginBottom: 16,
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 12,
              background: msg.role === 'user' ? '#fef5ec' : '#fff',
              border: `1px solid ${msg.role === 'user' ? '#e8d5c0' : '#e8e0d5'}`,
              color: '#2c2416',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
              {msg.hasArticle && (
                <button
                  onClick={onViewArticle}
                  style={{
                    display: 'block', marginTop: 10, padding: '8px 16px',
                    border: 'none', borderRadius: 8,
                    background: '#b87333', color: '#fff',
                    cursor: 'pointer', fontSize: '0.85rem',
                    width: '100%',
                  }}
                >
                  📖 查看文章
                </button>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ textAlign: 'center', color: '#8b7e6a', padding: 8, fontSize: '0.8rem' }}>
            AI 正在思考…
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick access to last article */}
      {lastArticle && (
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <button
            onClick={onViewArticle}
            style={{
              padding: '6px 20px', border: '1px solid #b87333',
              borderRadius: 16, background: '#fff', color: '#b87333',
              cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            📖 查看最新文章 →
          </button>
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '12px 0', borderTop: '1px solid #e8e0d5',
        background: '#faf8f5',
      }}>
        {/* Custom words input */}
        <div style={{ marginBottom: 8 }}>
          <textarea
            ref={customRef as any}
            defaultValue=""
            placeholder="添加要记忆的单词（逗号分隔），如: sustainable, ecosystem, biodiversity"
            rows={2}
            style={{
              width: '100%', padding: '6px 10px',
              border: '1px solid #e8e0d5', borderRadius: 8,
              fontSize: '0.75rem', outline: 'none',
              color: '#8b7e6a', resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Main input — uncontrolled ref for IME compatibility + form submit */}
        <form onSubmit={(e) => { e.preventDefault(); if (!composing) handleSend(); }} style={{ display: 'flex', gap: 8, margin: 0 }}>
          <textarea
            ref={inputRef as any}
            defaultValue=""
            rows={2}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !composing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="描述你想要的文章…"
            style={{
              flex: 1, padding: '10px 14px',
              border: '1px solid #e8e0d5', borderRadius: 10,
              fontSize: '0.9rem', outline: 'none',
              resize: 'vertical', fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={sending}
            style={{
              padding: '10px 20px', border: 'none', borderRadius: 10,
              background: sending ? '#d4b896' : '#b87333',
              color: '#fff', cursor: sending ? 'default' : 'pointer',
              fontSize: '0.9rem', fontWeight: 600,
            }}
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
};
