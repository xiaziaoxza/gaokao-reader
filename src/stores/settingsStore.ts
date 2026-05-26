import { create } from 'zustand';
import { encryptApiKey, decryptApiKey, hasApiKey } from '../utils/crypto';

interface SettingsState {
  apiKey: string;
  hasKey: boolean;
  keyLoaded: boolean;
  defaultWordCount: number;
  defaultTopic: string;

  setApiKey: (key: string) => Promise<void>;
  loadApiKey: () => Promise<void>;
  clearApiKey: () => void;
  setDefaults: (wordCount: number, topic: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  apiKey: '',
  hasKey: false,
  keyLoaded: false,
  defaultWordCount: 500,
  defaultTopic: '',

  setApiKey: async (key: string) => {
    await encryptApiKey(key);
    set({ apiKey: key, hasKey: true });
  },

  loadApiKey: async () => {
    if (hasApiKey()) {
      const key = await decryptApiKey();
      set({ apiKey: key || '', hasKey: !!key, keyLoaded: true });
    } else {
      set({ keyLoaded: true });
    }
  },

  clearApiKey: () => {
    localStorage.removeItem('gk_api_key');
    set({ apiKey: '', hasKey: false });
  },

  setDefaults: (wordCount: number, topic: string) => {
    set({ defaultWordCount: wordCount, defaultTopic: topic });
  },
}));
