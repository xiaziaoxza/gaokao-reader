import { create } from 'zustand';
import { MatchedWord } from '../services/vocab';

export interface SavedArticle {
  id: string;
  title: string;
  articleText: string;
  cnTranslation: string;
  matchedWords: MatchedWord[];
  createdAt: number; // timestamp ms
}

const STORAGE_KEY = 'gaokao_articles';
const MAX_ARTICLES = 50;

function loadArticles(): SavedArticle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function saveArticles(articles: SavedArticle[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch { /* storage full */ }
}

interface ArticleHistoryState {
  articles: SavedArticle[];
  loaded: boolean;

  load: () => void;
  save: (article: Omit<SavedArticle, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) => SavedArticle;
  remove: (id: string) => void;
  getById: (id: string) => SavedArticle | undefined;
}

export const useArticleHistoryStore = create<ArticleHistoryState>((set, get) => ({
  articles: [],
  loaded: false,

  load: () => {
    const articles = loadArticles();
    set({ articles, loaded: true });
  },

  save: (input) => {
    const articles = [...get().articles];
    const now = Date.now();

    if (input.id) {
      // Update existing
      const idx = articles.findIndex(a => a.id === input.id);
      if (idx >= 0) {
        articles[idx] = { ...articles[idx], ...input, id: input.id, createdAt: input.createdAt || now };
      }
    } else {
      // New article
      const article: SavedArticle = {
        ...input,
        id: 'art_' + now,
        title: input.title || '未命名文章',
        createdAt: now,
      };
      articles.unshift(article);
    }

    // Trim to max
    const trimmed = articles.slice(0, MAX_ARTICLES);
    set({ articles: trimmed });
    saveArticles(trimmed);

    return trimmed[0];
  },

  remove: (id: string) => {
    const articles = get().articles.filter(a => a.id !== id);
    set({ articles });
    saveArticles(articles);
  },

  getById: (id: string) => {
    return get().articles.find(a => a.id === id);
  },
}));
