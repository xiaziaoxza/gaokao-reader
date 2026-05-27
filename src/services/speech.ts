// Web Speech API — requires secure context (HTTPS). Android System WebView
// exposes this when androidScheme is "https" in capacitor.config.json.

let _speaking = false;
let _utterance: SpeechSynthesisUtterance | null = null;
let _timeout: ReturnType<typeof setTimeout> | null = null;

export function isSpeechAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  // Must have the API and be able to create an utterance
  if (!('speechSynthesis' in window)) return false;
  try {
    new SpeechSynthesisUtterance('');
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (_timeout) { clearTimeout(_timeout); _timeout = null; }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    // Chrome bug workaround: cancel can leave the synth in a paused state
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }
  _speaking = false;
  _utterance = null;
}

export function isSpeaking(): boolean {
  return _speaking;
}

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
  if (_timeout) { clearTimeout(_timeout); }

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  _utterance = utterance;

  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  // Try to pick an English voice
  const voices = synth.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith('en-US'))
    || voices.find(v => v.lang.startsWith('en'))
    || voices[0];
  if (enVoice) utterance.voice = enVoice;

  _speaking = true;

  // Safety timeout: if no event fires within 15s, report error
  _timeout = setTimeout(() => {
    if (_speaking) {
      stopSpeaking();
      // Chrome sometimes needs a second speak attempt to "wake up" the synth
      try {
        const retry = new SpeechSynthesisUtterance(text.slice(0, 50));
        retry.lang = 'en-US';
        retry.onend = () => onEnd?.();
        retry.onerror = () => onError?.('语音引擎未响应，请检查系统TTS设置');
        window.speechSynthesis.speak(retry);
      } catch {
        onError?.('语音引擎超时');
      }
    }
  }, 15000);

  utterance.onboundary = (e) => {
    if (_timeout) { clearTimeout(_timeout); _timeout = null; }
    onBoundary?.(e.charIndex);
  };

  utterance.onend = () => {
    if (_timeout) { clearTimeout(_timeout); _timeout = null; }
    _speaking = false;
    _utterance = null;
    onEnd?.();
  };

  utterance.onerror = (e) => {
    if (_timeout) { clearTimeout(_timeout); _timeout = null; }
    _speaking = false;
    _utterance = null;
    // "not-allowed" usually means user hasn't interacted yet or context issue
    const msg = e.error === 'not-allowed'
      ? '语音权限未授予（请尝试先点击页面任意位置）'
      : ('语音错误: ' + (e.error || 'unknown'));
    onError?.(msg);
  };

  // Chrome workaround: if synth has been idle for a while, it may need a
  // micro-wakeup. Set a tiny timeout before speaking.
  setTimeout(() => {
    synth.speak(utterance);
  }, 100);
}
