import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasArticle?: boolean;
  articleText?: string;
  articleTranslation?: string;
}

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setSending: (v: boolean) => void;
  clearMessages: () => void;
}

let idCounter = 0;
function genId() { return 'msg_' + (++idCounter) + '_' + Date.now(); }

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sending: false,

  addMessage: (msg) => {
    set(state => ({
      messages: [...state.messages, { ...msg, id: genId(), timestamp: Date.now() }],
    }));
  },

  setSending: (v) => set({ sending: v }),
  clearMessages: () => set({ messages: [] }),
}));
