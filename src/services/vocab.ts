// Word matching engine — scans article for vocabulary from multiple word banks
export interface MatchedWord {
  word: string;         // the matched word as it appears in text
  lower: string;        // lowercased for lookup
  translation: string;  // Chinese meaning
  bankId: string;       // which word bank it belongs to
  color: string;        // CSS color
  bg: string;           // CSS background
  start: number;        // character position in the article text
  end: number;          // character position after the match
}

export interface WordBankForMatch {
  id: string;
  color: string;
  bg: string;
  words: Record<string, string>; // lowercased word → translation
}

interface RawMatch {
  start: number;
  end: number;
  word: string;
  lower: string;
}

/**
 * Match vocabulary words in article text against multiple word banks.
 * Uses actual regex positions — handles repeated words correctly.
 */
export function matchVocab(
  articleText: string,
  banks: WordBankForMatch[]
): MatchedWord[] {
  // Build vocabulary map
  const vocabMap = new Map<string, { translation: string; bankId: string; color: string; bg: string }>();

  for (const bank of banks) {
    for (const [word, translation] of Object.entries(bank.words)) {
      const lower = word.toLowerCase();
      if (!vocabMap.has(lower)) {
        vocabMap.set(lower, { translation, bankId: bank.id, color: bank.color, bg: bank.bg });
      }
    }
  }

  // Collect all candidate words, filter single-char
  const allWords = [...vocabMap.keys()]
    .filter(w => w.length >= 2)
    .sort((a, b) => b.length - a.length);

  if (allWords.length === 0) return [];

  // Build regex
  const escaped = allWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi');

  // Collect ALL matches with actual positions
  const rawMatches: RawMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(articleText)) !== null) {
    rawMatches.push({
      start: m.index,
      end: m.index + m[0].length,
      word: m[0],
      lower: m[0].toLowerCase(),
    });
  }

  // Filter overlaps: for each position range, keep only the first match
  // (regex alternation was already length-sorted, so first = longest)
  const matchedRanges: Array<{ start: number; end: number }> = [];
  const matches: MatchedWord[] = [];

  for (const rm of rawMatches) {
    const overlaps = matchedRanges.some(
      r => rm.start < r.end && rm.end > r.start
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
      start: rm.start,
      end: rm.end,
    });
  }

  // Sort by position in text
  matches.sort((a, b) => a.start - b.start);

  return matches;
}
