import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useWordbankStore } from '../stores/wordbankStore';
import { ColorPicker } from '../components/ColorPicker';
import { PALETTE } from '../utils/colors';

interface Props {
  onBack?: () => void;
}

const sectionStyle: React.CSSProperties = {
  padding: 16, marginBottom: 16,
  border: '1px solid #e8e0d5', borderRadius: 8,
  background: '#fff',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px', color: '#b87333', fontSize: '0.95rem', fontWeight: 600,
};

export const SettingsView: React.FC<Props> = ({ onBack }) => {
  /* ── API Key ── */
  const { apiKey, hasKey, keyLoaded, loadApiKey, setApiKey, clearApiKey } = useSettingsStore();
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Word banks ── */
  const { banks, loaded: wbLoaded, loadBanks, addDownloadedBank, removeBank, toggleBank, setBankColor } = useWordbankStore();
  const [dlUrl, setDlUrl] = useState('');
  const [dlStatus, setDlStatus] = useState('');

  /* load API key once on mount */
  useEffect(() => {
    loadApiKey();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* load word banks once on mount */
  useEffect(() => {
    if (!wbLoaded) loadBanks();
  }, [wbLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── API Key handlers ── */
  const handleSave = async () => {
    if (!inputKey.trim()) return;
    setSaving(true);
    await setApiKey(inputKey.trim());
    setSaving(false);
    setInputKey('');
  };

  const handleClear = () => {
    clearApiKey();
  };

  /* ── Word bank handlers ── */
  const handleDownload = async () => {
    if (!dlUrl.trim()) return;
    setDlStatus('下载中…');
    try {
      await addDownloadedBank(dlUrl.trim());
      setDlUrl('');
      setDlStatus('✅ 词库已添加');
    } catch (e: any) {
      setDlStatus('❌ ' + (e.message || '下载失败'));
    }
  };

  const getColorIdx = (color: string) => {
    const idx = PALETTE.findIndex(c => c.value === color);
    return idx >= 0 ? idx : 0;
  };

  if (!keyLoaded || !wbLoaded) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#8b7e6a' }}>加载中…</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2 style={{ color: '#b87333', marginBottom: 20, textAlign: 'center' }}>设置</h2>

      {/* ═══════ API 配置 ═══════ */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>🔑 API 配置</h3>

        <label style={{ display: 'block', marginBottom: 6, color: '#5E4B66', fontWeight: 600 }}>
          DeepSeek API Key
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            placeholder={hasKey ? '•••••••• (已保存)' : 'sk-xxxxxxxx'}
            style={{
              flex: 1, padding: '8px 12px',
              border: '1px solid #e8e0d5', borderRadius: 6,
              fontSize: '0.9rem', outline: 'none',
              background: '#fff',
            }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              padding: '8px 12px', border: '1px solid #e8e0d5',
              borderRadius: 6, background: '#fff', cursor: 'pointer',
              fontSize: '0.8rem', color: '#8b7e6a',
            }}
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={!inputKey.trim() || saving}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 6,
              background: saving ? '#d4b896' : '#b87333',
              color: '#fff', cursor: saving ? 'default' : 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {saving ? '保存中…' : (hasKey ? '更新 Key' : '保存')}
          </button>
          {hasKey && (
            <button
              onClick={handleClear}
              style={{
                padding: '8px 20px', border: '1px solid #c0392b',
                borderRadius: 6, background: '#fff', cursor: 'pointer',
                color: '#c0392b', fontSize: '0.85rem',
              }}
            >
              删除 Key
            </button>
          )}
        </div>
        {hasKey && (
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#27ae60' }}>
            ✅ API Key 已保存（加密存储）
          </div>
        )}
      </div>

      {/* ═══════ 词库管理 ═══════ */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>📚 词库管理</h3>

        {/* Bank list */}
        {banks.map(bank => (
          <div key={bank.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', marginBottom: 8,
            border: '1px solid #e8e0d5', borderRadius: 8,
            background: '#faf8f5',
          }}>
            {/* Enable/disable toggle */}
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={bank.enabled}
                onChange={() => toggleBank(bank.id)}
                style={{ accentColor: bank.color }}
              />
            </label>

            {/* Color indicator + name */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10,
                  borderRadius: '50%', background: bank.color,
                }} />
                <span style={{ fontWeight: 600, color: '#2c2416', fontSize: '0.9rem' }}>{bank.name}</span>
                <span style={{
                  fontSize: '0.65rem', color: '#8b7e6a',
                  padding: '1px 6px', borderRadius: 8,
                  background: '#f5f0eb',
                }}>
                  {bank.source === 'builtin' ? '内置' : '已下载'} · {bank.wordCount}词
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8b7e6a', marginTop: 2 }}>
                {bank.description}
              </div>
            </div>

            {/* Color picker */}
            <ColorPicker
              selected={getColorIdx(bank.color)}
              onChange={(idx) => setBankColor(bank.id, idx)}
            />

            {/* Delete (downloaded only) */}
            {bank.source === 'downloaded' && (
              <button
                onClick={() => removeBank(bank.id)}
                style={{
                  padding: '2px 8px', border: '1px solid #c0392b',
                  borderRadius: 4, background: '#fff',
                  color: '#c0392b', cursor: 'pointer', fontSize: '0.7rem',
                }}
              >
                删除
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ═══════ 推荐词库 ═══════ */}
      <div style={sectionStyle}>
        <h4 style={{ margin: '0 0 10px', color: '#5E4B66', fontSize: '0.9rem' }}>
          📥 推荐词库（点击下载，含人声语音包）
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { name: '考研英语词汇', desc: '~1500词', words: '研究生入学考试核心词汇', url: '/vocab/kaoyan.json' },
            { name: '雅思词汇 (IELTS)', desc: '~800词', words: '雅思考试高频词汇', url: '/vocab/ielts.json' },
            { name: '托福词汇 (TOEFL)', desc: '~800词', words: '托福考试核心词汇', url: '/vocab/toefl.json' },
          ].map(b => (
            <div key={b.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', background: '#faf8f5', borderRadius: 6,
              border: '1px solid #e8e0d5',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2c2416' }}>{b.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#8b7e6a' }}>{b.desc} · {b.words}</div>
              </div>
              <button
                onClick={() => {
                  addDownloadedBank(b.url).catch((e: any) => alert('下载失败: ' + (e.message || '未知错误')));
                }}
                style={{
                  padding: '5px 14px', border: '1px solid #b87333',
                  borderRadius: 14, background: '#fff',
                  color: '#b87333', cursor: 'pointer', fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                }}
              >
                下载 + 🎵语音
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ 自定义词库 ═══════ */}
      <div style={{ ...sectionStyle, border: '1px dashed #e8e0d5' }}>
        <h4 style={{ margin: '0 0 8px', color: '#5E4B66', fontSize: '0.9rem' }}>
          自定义词库 URL
        </h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={dlUrl}
            onChange={e => setDlUrl(e.target.value)}
            placeholder="输入词库 JSON URL…"
            style={{
              flex: 1, padding: '8px 12px',
              border: '1px solid #e8e0d5', borderRadius: 6,
              fontSize: '0.85rem', outline: 'none',
            }}
          />
          <button
            onClick={handleDownload}
            disabled={!dlUrl.trim()}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 6,
              background: dlUrl.trim() ? '#b87333' : '#d4b896',
              color: '#fff', cursor: dlUrl.trim() ? 'pointer' : 'default',
              fontSize: '0.85rem',
            }}
          >
            下载
          </button>
        </div>
        {dlStatus && (
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: dlStatus.startsWith('✅') ? '#27ae60' : '#c0392b' }}>
            {dlStatus}
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#8b7e6a' }}>
          格式：{'{ "name": "词库名", "words": { "word": "释义", ... } }'}
        </div>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginTop: 16, padding: '8px 24px',
            border: '1px solid #e8e0d5', borderRadius: 6,
            background: '#fff', cursor: 'pointer',
            color: '#8b7e6a', fontSize: '0.85rem',
          }}
        >
          返回
        </button>
      )}
    </div>
  );
};
