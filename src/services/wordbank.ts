// Word bank manager — load builtin, download remote, manage in IndexedDB
import { PALETTE } from '../utils/colors';

export interface WordBank {
  id: string;
  name: string;
  description: string;
  source: 'builtin' | 'downloaded';
  color: string;
  bg: string;
  enabled: boolean;
  words: Record<string, string>;
  wordCount: number;
}

const DB_NAME = 'gaokao-wordbanks';
const DB_VERSION = 1;
const STORE = 'banks';

const BUILTIN_BANKS = [
  { path: '/vocab/gaokao_800.json', colorIdx: 0 },
  { path: '/vocab/middle_school.json', colorIdx: 1 },
  { path: '/vocab/elementary.json', colorIdx: 6 },
  { path: '/vocab/cet4.json', colorIdx: 2 },
  { path: '/vocab/cet6.json', colorIdx: 3 },
];

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadBuiltinBanks(): Promise<WordBank[]> {
  const banks: WordBank[] = [];

  for (const cfg of BUILTIN_BANKS) {
    try {
      const resp = await fetch(cfg.path);
      if (!resp.ok) continue;
      const data = await resp.json();
      const color = PALETTE[cfg.colorIdx];
      banks.push({
        id: data.name || cfg.path,
        name: data.name || cfg.path,
        description: data.description || '',
        source: 'builtin',
        color: color.value,
        bg: color.bg,
        enabled: true,
        words: data.words || {},
        wordCount: Object.keys(data.words || {}).length,
      });
    } catch { /* skip failed loads */ }
  }

  return banks;
}

export async function saveBanksToCache(banks: WordBank[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);

  // Clear and re-save downloaded banks only (builtin are re-loaded from files)
  const existing = await getAllCachedBankIds();
  for (const id of existing) {
    store.delete(id);
  }

  for (const b of banks) {
    if (b.source === 'downloaded') {
      store.put(b);
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllCachedBankIds(): Promise<string[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => resolve([]);
  });
}

export async function loadCachedBanks(): Promise<WordBank[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function downloadBank(url: string): Promise<WordBank> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

  const data = await resp.json();
  if (!data.name || !data.words || typeof data.words !== 'object') {
    throw new Error('Invalid word bank format. Expected: { name, words: { word: meaning } }');
  }

  const color = PALETTE[2]; // default green for downloaded banks
  return {
    id: 'dl_' + Date.now(),
    name: data.name,
    description: data.description || '',
    source: 'downloaded',
    color: color.value,
    bg: color.bg,
    enabled: true,
    words: data.words,
    wordCount: Object.keys(data.words).length,
  };
}

export function getAllEnabledWords(banks: WordBank[]): string[] {
  const words = new Set<string>();
  for (const bank of banks) {
    if (bank.enabled) {
      for (const word of Object.keys(bank.words)) {
        words.add(word);
      }
    }
  }
  return [...words];
}

// Persist enabled/disabled state for all banks (including builtin)
const BANK_STATE_KEY = 'gaokao_bank_states';

export function saveBankStates(banks: WordBank[]): void {
  try {
    const states: Record<string, boolean> = {};
    for (const b of banks) {
      states[b.id] = b.enabled;
    }
    localStorage.setItem(BANK_STATE_KEY, JSON.stringify(states));
  } catch { /* storage full */ }
}

export function loadBankStates(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(BANK_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
