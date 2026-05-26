import React, { useState } from 'react';
import { ChatView } from './views/ChatView';
import { ReaderView } from './views/ReaderView';
import { WordbankView } from './views/WordbankView';
import { SettingsView } from './views/SettingsView';

type View = 'chat' | 'reader' | 'wordbanks' | 'settings';

const App: React.FC = () => {
  const [view, setView] = useState<View>('chat');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      fontFamily: '"Georgia", "Times New Roman", "Noto Serif SC", serif',
      color: '#2c2416',
    }}>
      {/* Top navigation bar */}
      <nav style={{
        display: 'flex', justifyContent: 'center', gap: 4,
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.9)',
        borderBottom: '1px solid #e8e0d5',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        {[
          { id: 'chat' as View, icon: '💬', label: '对话' },
          { id: 'reader' as View, icon: '📖', label: '阅读' },
          { id: 'wordbanks' as View, icon: '📚', label: '词库' },
          { id: 'settings' as View, icon: '⚙️', label: '设置' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              padding: '8px 16px',
              border: view === tab.id ? '1px solid #b87333' : '1px solid transparent',
              borderRadius: 10,
              background: view === tab.id ? '#fef5ec' : 'transparent',
              color: view === tab.id ? '#b87333' : '#8b7e6a',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: view === tab.id ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* View content */}
      <main style={{ padding: view === 'chat' ? 0 : '16px 16px 40px' }}>
        {view === 'chat' && <ChatView onViewArticle={() => setView('reader')} />}
        {view === 'reader' && <ReaderView onBack={() => setView('chat')} />}
        {view === 'wordbanks' && <WordbankView onBack={() => setView('chat')} />}
        {view === 'settings' && <SettingsView onBack={() => setView('chat')} />}
      </main>
    </div>
  );
};

export default App;
