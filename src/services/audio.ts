// Audio download + IndexedDB cache using Youdao TTS
// Dev: Vite proxy bypasses CORS. APK: CapacitorHttp native request bypasses CORS.
const TTS_DIRECT = 'https://dict.youdao.com/dictvoice?audio={}&type=0';
const TTS_PROXIED = '/tts/{}';

const DB_NAME = 'gaokao-audio';
const DB_VERSION = 1;
const STORE = 'audio';
const PREFETCH_KEY = 'gaokao_prefetched_banks';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function getCachedAudio(word: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(word.toLowerCase());
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function cacheAudio(word: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, word.toLowerCase());
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  } catch { /* ignore cache failures */ }
}

async function fetchAudioBlob(word: string): Promise<Blob> {
  const youdaoUrl = TTS_DIRECT.replace('{}', encodeURIComponent(word));

  if (import.meta.env.DEV) {
    // Dev: use Vite proxy to avoid CORS
    const proxyUrl = TTS_PROXIED.replace('{}', encodeURIComponent(word));
    const resp = await fetch(proxyUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    if (blob.size < 1000) throw new Error('Audio too small');
    return blob;
  }

  // APK: use Capacitor native HTTP to bypass WebView CORS
  try {
    const { CapacitorHttp } = await import('@capacitor/core');
    const resp = await CapacitorHttp.get({
      url: youdaoUrl,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'blob',
    });

    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`HTTP ${resp.status}`);
    }

    // Native may return base64 string; convert to Blob if needed
    if (resp.data instanceof Blob) {
      if (resp.data.size < 1000) throw new Error('Audio too small');
      return resp.data;
    }

    // Response is base64 string from native layer
    const binary = atob(resp.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    if (blob.size < 1000) throw new Error('Audio too small');
    return blob;
  } catch (e) {
    // Fallback to regular fetch if CapacitorHttp fails
    const resp = await fetch(youdaoUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    if (blob.size < 1000) throw new Error('Audio too small');
    return blob;
  }
}

export async function downloadAudio(
  word: string
): Promise<string> {
  const key = word.toLowerCase();

  // Check cache first
  const cached = await getCachedAudio(key);
  if (cached) {
    return URL.createObjectURL(cached);
  }

  // Download from Youdao
  const blob = await fetchAudioBlob(word);

  // Cache in background
  cacheAudio(word, blob);

  return URL.createObjectURL(blob);
}

export interface DownloadProgress {
  current: number;
  total: number;
  word: string;
  stage: string;
}

export async function downloadAudioBatch(
  words: string[],
  onProgress: (p: DownloadProgress) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const unique = [...new Set(words.map(w => w.toLowerCase()))];

  for (let i = 0; i < unique.length; i++) {
    const word = unique[i];
    onProgress({ current: i + 1, total: unique.length, word, stage: '下载音频' });
    try {
      const url = await downloadAudio(word);
      results.set(word, url);
    } catch {
      // Skip words that fail to download
    }
  }

  return results;
}

/* ── Bank-level audio prefetch ── */

export function getPrefetchedBanks(): Set<string> {
  try {
    const raw = localStorage.getItem(PREFETCH_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markBankPrefetched(bankId: string): void {
  try {
    const banks = getPrefetchedBanks();
    banks.add(bankId);
    localStorage.setItem(PREFETCH_KEY, JSON.stringify([...banks]));
  } catch { /* ignore */ }
}

export async function prefetchBankAudio(
  bankId: string,
  words: string[],
  onProgress?: (current: number, total: number, word: string) => void
): Promise<{ success: number; failed: number }> {
  const unique = [...new Set(words.map(w => w.toLowerCase()))];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i++) {
    const word = unique[i];
    onProgress?.(i + 1, unique.length, word);

    // Already cached — count as success
    const cached = await getCachedAudio(word);
    if (cached) { success++; continue; }

    try {
      const blob = await fetchAudioBlob(word);
      await cacheAudio(word, blob);
      success++;
    } catch {
      failed++;
    }
  }

  // Mark bank as prefetched if most words succeeded
  if (unique.length > 0 && failed <= unique.length * 0.2) {
    markBankPrefetched(bankId);
  }

  return { success, failed };
}
