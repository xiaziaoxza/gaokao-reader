// API Key storage: memory-first with localStorage as bonus persistence.
// Capacitor Android WebView may have unreliable localStorage (privacy mode,
// origin restrictions, etc.), so the key is always held in a module variable.
// localStorage is a best-effort cache for surviving app restarts.

const STORAGE_KEY = 'gk_api_key';

// In-memory store — always available, never throws
let _memoryKey: string | null = null;

function debugLog(msg: string, ...args: unknown[]): void {
  try {
    console.log('[crypto]', msg, ...args);
  } catch { /* console might be blocked */ }
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__ls_test__';
    localStorage.setItem(test, test);
    const read = localStorage.getItem(test);
    localStorage.removeItem(test);
    return read === test;
  } catch {
    return false;
  }
}

function obfuscate(text: string): string {
  const ua = navigator?.userAgent || '';
  const sw = screen?.width || 0;
  const seed = ua.length + sw;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode((text.charCodeAt(i) ^ ((seed + i) % 256)) & 0xFF);
  }
  return btoa(result);
}

function deobfuscate(encoded: string): string {
  const ua = navigator?.userAgent || '';
  const sw = screen?.width || 0;
  const seed = ua.length + sw;
  const text = atob(encoded);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode((text.charCodeAt(i) ^ ((seed + i) % 256)) & 0xFF);
  }
  return result;
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  debugLog('encryptApiKey called, length:', plaintext.length);

  // Always store in memory — never fails
  _memoryKey = plaintext;
  debugLog('stored in memory');

  // Try localStorage as bonus
  const lsOk = isLocalStorageAvailable();
  debugLog('localStorage available:', lsOk);

  if (lsOk) {
    try {
      const obfuscated = obfuscate(plaintext);
      localStorage.setItem(STORAGE_KEY, obfuscated);
      const verify = localStorage.getItem(STORAGE_KEY);
      if (verify === obfuscated) {
        debugLog('localStorage write verified');
      } else {
        debugLog('localStorage write verification failed');
      }
    } catch (e: any) {
      debugLog('localStorage write failed:', e.message);
      // Not fatal — memory store already succeeded
    }
  }

  return plaintext;
}

export async function decryptApiKey(): Promise<string | null> {
  // Memory always wins
  if (_memoryKey) {
    debugLog('decryptApiKey: found in memory');
    return _memoryKey;
  }

  // Try localStorage on first load
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const decrypted = deobfuscate(stored);
        _memoryKey = decrypted; // promote to memory
        debugLog('decryptApiKey: loaded from localStorage');
        return decrypted;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  debugLog('decryptApiKey: no key found');
  return null;
}

export function hasApiKey(): boolean {
  if (_memoryKey) return true;
  // Also check localStorage for first-load detection
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearApiKey(): void {
  _memoryKey = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
