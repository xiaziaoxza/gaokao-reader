// Word matching engine — scans article for vocabulary from multiple word banks
export interface MatchedWord {
  word: string;         // the matched word as it appears in text
  lower: string;        // lowercased for lookup
  translation: string;  // Chinese meaning
  bankId: string;       // which word bank it belongs to
  color: string;        // CSS color
  bg: string;           // CSS background
}

export interface WordBankForMatch {
  id: string;
  color: string;
  bg: string;
  words: Record<string, string>; // lowercased word → translation
}

/**
 * Match vocabulary words in article text against multiple word banks.
 * Longer matches take priority. Earlier banks (higher priority) take precedence.
 */
export function matchVocab(
  articleText: string,
  banks: WordBankForMatch[]
): MatchedWord[] {
  // Build a map: lowercased word → { translation, bankId, color, bg }
  // Priority: first bank wins for overlapping words
  const vocabMap = new Map<string, { translation: string; bankId: string; color: string; bg: string }>();

  for (const bank of banks) {
    for (const [word, translation] of Object.entries(bank.words)) {
      const lower = word.toLowerCase();
      if (!vocabMap.has(lower)) {
        vocabMap.set(lower, {
          translation,
          bankId: bank.id,
          color: bank.color,
          bg: bank.bg,
        });
      }
    }
  }

  // Find all matches in the article
  const matches: MatchedWord[] = [];
  // Filter: exclude single-character words (e.g., "a", "I") which cause
  // massive false positives since \b(a)\b matches every article in English
  const allWords = [...vocabMap.keys()]
    .filter(w => w.length >= 2)
    .sort((a, b) => b.length - a.length);

  if (allWords.length === 0) return matches;

  const pattern = new RegExp(
    '\\b(' + allWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
    'gi'
  );

  // Track which positions are already matched (avoid overlaps)
  const matchedRanges: Array<{ start: number; end: number }> = [];

  let match: RegExpExecArray | null;
  // Reset regex
  pattern.lastIndex = 0;

  // Collect all matches first
  const rawMatches: Array<{ start: number; end: number; word: string; lower: string }> = [];
  while ((match = pattern.exec(articleText)) !== null) {
    rawMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      word: match[0],
      lower: match[0].toLowerCase(),
    });
  }

  // Filter overlapping matches (first/longest wins since regex alternation is length-sorted)
  for (const rm of rawMatches) {
    const overlaps = matchedRanges.some(
      r => (rm.start < r.end && rm.end > r.start)
    );
    if (overlaps) continue;

    const info = vocabMap.get(rm.lower);
    if (!info) continue;

    matchedRanges.push({ start: rm.start, end: rm.end });
    matches.push({
      word: rm.word,
      lower: rm.lower,
      translation: info.translation,
      bankId: info.bankId,
      color: info.color,
      bg: info.bg,
    });
  }

  // Sort by position in text
  matches.sort((a, b) => {
    const aIdx = articleText.indexOf(a.word);
    const bIdx = articleText.indexOf(b.word);
    return aIdx - bIdx;
  });

  return matches;
}
