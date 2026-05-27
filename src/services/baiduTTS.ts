// Baidu Translate TTS — free, HTTP-based, accessible from China
// Uses the same endpoint as Baidu Translate's "read aloud" feature
const TTS_BASE = 'https://fanyi.baidu.com/gettts?lan=en&spd=3&text=';

async function fetchAudioBlob(text: string): Promise<Blob> {
  if (import.meta.env.DEV) {
    // Dev: use regular fetch (goes through Vite, but CORS may still be an issue for Baidu)
    // Actually, Baidu might not set CORS headers either. Let's just try.
    const resp = await fetch(TTS_BASE + encodeURIComponent(text));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    if (blob.size < 500) throw new Error('Audio too small');
    return blob;
  }

  // APK: use Capacitor native HTTP to bypass CORS
  try {
    const { CapacitorHttp } = await import('@capacitor/core');
    const resp = await CapacitorHttp.get({
      url: TTS_BASE + encodeURIComponent(text),
      responseType: 'blob',
    });

    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`HTTP ${resp.status}`);
    }

    if (resp.data instanceof Blob) {
      if (resp.data.size < 500) throw new Error('Audio too small');
      return resp.data;
    }

    // base64 fallback
    const binary = atob(resp.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    if (blob.size < 500) throw new Error('Audio too small');
    return blob;
  } catch {
    // Fallback to regular fetch
    const resp = await fetch(TTS_BASE + encodeURIComponent(text));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    if (blob.size < 500) throw new Error('Audio too small');
    return blob;
  }
}

/**
 * Split text into sentence chunks (Baidu TTS has a length limit of ~200 chars)
 */
function splitSentences(text: string): string[] {
  // Split on sentence boundaries, keep delimiter with the sentence
  const raw = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of raw) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + ' ' + trimmed).length > 180) {
      if (current) chunks.push(current.trim());
      current = trimmed;
    } else {
      current += (current ? ' ' : '') + trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length > 0 ? chunks : [text];
}

export async function synthesizeArticle(
  text: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const sentences = splitSentences(text);
  const blobs: BlobPart[] = [];

  for (let i = 0; i < sentences.length; i++) {
    onProgress?.(i + 1, sentences.length);
    try {
      const blob = await fetchAudioBlob(sentences[i]);
      blobs.push(blob);
    } catch {
      // Insert silence on failure
      blobs.push(new Blob([new Uint8Array(300)], { type: 'audio/mp3' }));
    }
  }

  return new Blob(blobs, { type: 'audio/mp3' });
}
