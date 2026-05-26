import React, { useState, useEffect } from 'react';
import { ChatView } from './views/ChatView';
import { ReaderView } from './views/ReaderView';
import { SettingsView } from './views/SettingsView';
import { useSettingsStore } from './stores/settingsStore';

type View = 'chat' | 'reader' | 'settings';

const NAV_HEIGHT = 60;

const App: React.FC = () => {
  const [view, setView] = useState<View>('chat');
  const loadApiKey = useSettingsStore(s => s.loadApiKey);

  useEffect(() => {
    loadApiKey();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: '"Georgia", "Times New Roman", "Noto Serif SC", serif',
      color: '#2c2416',
      paddingBottom: NAV_HEIGHT + 8,
    }}>
      {/* View content */}
      <main style={{ padding: view === 'chat' ? 0 : '16px 16px 40px', paddingBottom: view === 'chat' ? NAV_HEIGHT + 8 : undefined }}>
        {view === 'chat' && <ChatView onViewArticle={() => setView('reader')} />}
        {view === 'reader' && <ReaderView onBack={() => setView('chat')} />}
        {view === 'settings' && <SettingsView onBack={() => setView('chat')} />}
      </main>

      {/* Bottom navigation bar */}
      <nav style={{
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 8px',
        background: 'rgba(255,255,255,0.95)',
        borderTop: '1px solid #e8e0d5',
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
        height: NAV_HEIGHT,
        boxShadow: '0 -2px 12px rgba(80,50,20,0.06)',
      }}>
        {[
          { id: 'chat' as View, icon: '💬', label: '对话' },
          { id: 'reader' as View, icon: '📖', label: '阅读' },
          { id: 'settings' as View, icon: '⚙️', label: '设置' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 18px',
              border: 'none',
              borderRadius: 10,
              background: 'transparent',
              color: view === tab.id ? '#b87333' : '#8b7e6a',
              cursor: 'pointer',
              fontSize: '1.3rem',
              fontWeight: view === tab.id ? 600 : 400,
              transition: 'all 0.2s',
              lineHeight: 1,
            }}
          >
            <span>{tab.icon}</span>
            <span style={{ fontSize: '0.65rem', color: view === tab.id ? '#b87333' : '#8b7e6a' }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
