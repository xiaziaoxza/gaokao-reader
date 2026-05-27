// Web Speech API — built into all Android WebViews (5.0+), no network required.
// Used as the primary TTS engine for full-text narration.

let _speaking = false;
let _utterance: SpeechSynthesisUtterance | null = null;

export function isSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  _speaking = false;
  _utterance = null;
}

export function isSpeaking(): boolean {
  return _speaking;
}

/**
 * Speak text using the built-in speech synthesizer.
 * Returns a Promise that resolves when speaking completes or rejects on error.
 */
export function speak(
  text: string,
  onBoundary?: (charIndex: number) => void,
  onEnd?: () => void,
  onError?: (err: string) => void
): void {
  if (!isSpeechAvailable()) {
    onError?.('此设备不支持语音合成');
    return;
  }

  stopSpeaking();

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  _utterance = utterance;

  // English voice
  const voices = synth.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.includes('Female'))
    || voices.find(v => v.lang.startsWith('en-US'))
    || voices.find(v => v.lang.startsWith('en'))
    || voices[0];

  if (enVoice) utterance.voice = enVoice;
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  _speaking = true;

  utterance.onboundary = (e) => {
    onBoundary?.(e.charIndex);
  };

  utterance.onend = () => {
    _speaking = false;
    _utterance = null;
    onEnd?.();
  };

  utterance.onerror = (e) => {
    _speaking = false;
    _utterance = null;
    onError?.(e.error || '语音播放出错');
  };

  // Load voices async if needed
  if (voices.length === 0) {
    synth.onvoiceschanged = () => {
      const loadedVoices = synth.getVoices();
      const v = loadedVoices.find(v => v.lang.startsWith('en-US') && v.name.includes('Female'))
        || loadedVoices.find(v => v.lang.startsWith('en-US'))
        || loadedVoices.find(v => v.lang.startsWith('en'))
        || loadedVoices[0];
      if (v) utterance.voice = v;
      synth.speak(utterance);
    };
  } else {
    synth.speak(utterance);
  }
}

/**
 * Estimate reading duration in seconds
 */
export function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / 150 * 60); // ~150 words per minute
}
