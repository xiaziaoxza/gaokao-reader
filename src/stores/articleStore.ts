import { create } from 'zustand';
import { MatchedWord } from '../services/vocab';

type GenerationStage = 'idle' | 'generating' | 'downloading' | 'ready';

interface ArticleState {
  status: GenerationStage;
  articleText: string;
  cnTranslation: string;
  title: string;
  matchedWords: MatchedWord[];
  audioUrls: Map<string, string>; // lowercased word → blob URL
  progress: { current: number; total: number; stage: string };

  currentArticleId: string;

  setStatus: (s: GenerationStage) => void;
  setArticle: (text: string, translation: string, title?: string) => void;
  setArticleId: (id: string) => void;
  setMatchedWords: (words: MatchedWord[]) => void;
  setAudioUrls: (urls: Map<string, string>) => void;
  setProgress: (current: number, total: number, stage: string) => void;
  reset: () => void;
}

const initial = {
  status: 'idle' as GenerationStage,
  articleText: '',
  cnTranslation: '',
  title: '',
  currentArticleId: '',
  matchedWords: [],
  audioUrls: new Map<string, string>(),
  progress: { current: 0, total: 0, stage: '' },
};

export const useArticleStore = create<ArticleState>((set) => ({
  ...initial,

  setStatus: (status) => set({ status }),
  setArticle: (text, translation, title) =>
    set({ articleText: text, cnTranslation: translation, title: title || '' }),
  setArticleId: (id) => set({ currentArticleId: id }),
  setMatchedWords: (words) => set({ matchedWords: words }),
  setAudioUrls: (urls) => set({ audioUrls: urls }),
  setProgress: (current, total, stage) =>
    set({ progress: { current, total, stage } }),
  reset: () => set({ ...initial, audioUrls: new Map() }),
}));
