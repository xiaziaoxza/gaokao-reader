import React from 'react';
import { MatchedWord } from '../services/vocab';
import { VocabWord } from './VocabWord';

interface Props {
  text: string;
  matchedWords: MatchedWord[];
  audioUrls: Map<string, string>;
  showTranslation: boolean;
}

export const ArticleRenderer: React.FC<Props> = ({ text, matchedWords, audioUrls, showTranslation }) => {
  const paragraphs = text.split('\n').filter(p => p.trim());

  if (matchedWords.length === 0) {
    return (
      <>
        {paragraphs.map((para, i) => (
          <p key={i} style={{
            marginBottom: '1.3rem', textAlign: 'justify', textIndent: '2em',
            lineHeight: 1.9,
          }}>
            {para}
          </p>
        ))}
      </>
    );
  }

  // Compute each paragraph's range in the full article text
  // This lets us assign matches to the correct paragraph using start/end positions
  const paraRanges: Array<{ para: string; offset: number; end: number }> = [];
  let searchPos = 0;
  for (const para of paragraphs) {
    const idx = text.indexOf(para, searchPos);
    if (idx >= 0) {
      paraRanges.push({ para, offset: idx, end: idx + para.length });
      searchPos = idx + para.length;
    } else {
      // fallback
      paraRanges.push({ para, offset: searchPos, end: searchPos + para.length });
      searchPos += para.length + 1;
    }
  }

  return (
    <div>
      {paraRanges.map((pr, pIdx) => {
        // Matches whose start position falls within this paragraph
        const paraMatches = matchedWords.filter(
          m => m.start >= pr.offset && m.start < pr.end
        );

        return (
          <p key={pIdx} style={{
            marginBottom: '1.3rem', textAlign: 'justify', textIndent: '2em',
            lineHeight: 1.9,
          }}>
            {renderParagraph(pr.para, pr.offset, paraMatches, audioUrls, showTranslation)}
          </p>
        );
      })}
    </div>
  );
};

function renderParagraph(
  para: string,
  paraOffset: number,
  matches: MatchedWord[],
  audioUrls: Map<string, string>,
  showTranslation: boolean
): React.ReactNode[] {
  // Sort by position within this paragraph
  const sorted = [...matches].sort((a, b) => a.start - b.start);

  const result: React.ReactNode[] = [];
  let cursor = 0; // cursor within this paragraph

  for (const mw of sorted) {
    const relStart = mw.start - paraOffset; // position within this paragraph
    const relEnd = mw.end - paraOffset;

    if (relStart < cursor || relStart > para.length) continue;

    // Text before this match
    if (relStart > cursor) {
      result.push(<span key={`t-${paraOffset}-${cursor}`}>{para.slice(cursor, relStart)}</span>);
    }

    // The matched word
    result.push(
      <VocabWord
        key={`vw-${mw.start}`}
        word={mw.word}
        translation={mw.translation}
        color={mw.color}
        bg={mw.bg}
        audioUrl={audioUrls.get(mw.lower)}
        showBox={showTranslation}
      />
    );

    cursor = relEnd;
  }

  // Remaining text
  if (cursor < para.length) {
    result.push(<span key={`t-${paraOffset}-${cursor}`}>{para.slice(cursor)}</span>);
  }

  return result;
}
