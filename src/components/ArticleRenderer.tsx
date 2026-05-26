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
  if (!text || matchedWords.length === 0) {
    // No matches: render plain text paragraphs
    return (
      <>
        {text.split('\n').filter(p => p.trim()).map((para, i) => (
          <p key={i} style={{
            marginBottom: '1.3rem', textAlign: 'justify', textIndent: '2em',
            lineHeight: '1cm',
          }}>
            {para}
          </p>
        ))}
      </>
    );
  }

  // Build a map: character position → matched word info
  // Sort matched words by their position in text
  const sorted = [...matchedWords].sort((a, b) => text.indexOf(a.word) - text.indexOf(b.word));

  // Build segments
  const segments: Array<{ type: 'text' | 'vocab'; content: string; match?: MatchedWord }> = [];
  let cursor = 0;

  for (const mw of sorted) {
    const idx = text.indexOf(mw.word, cursor);
    if (idx === -1) continue;

    // Text before this match
    if (idx > cursor) {
      segments.push({ type: 'text', content: text.slice(cursor, idx) });
    }

    // The matched word
    segments.push({ type: 'vocab', content: mw.word, match: mw });
    cursor = idx + mw.word.length;
  }

  // Remaining text
  if (cursor < text.length) {
    segments.push({ type: 'text', content: text.slice(cursor) });
  }

  // Group segments into paragraphs (split on double newline or single newline)
  // Just render all segments inline, preserving paragraph structure from original text
  return (
    <div>
      {text.split('\n').filter(p => p.trim()).map((para, pIdx) => {
        // Find which segments belong to this paragraph
        // Use simple approach: render each paragraph by scanning its text for matches
        return (
          <p key={pIdx} style={{
            marginBottom: '1.3rem', textAlign: 'justify', textIndent: '2em',
            lineHeight: 1.9,
          }}>
            {renderParagraph(para, sorted, audioUrls, showTranslation)}
          </p>
        );
      })}
    </div>
  );
};

function renderParagraph(
  para: string,
  matches: MatchedWord[],
  audioUrls: Map<string, string>,
  showTranslation: boolean
): React.ReactNode[] {
  // Find all matches in this paragraph
  const paraMatches = matches.filter(m => para.includes(m.word));

  const result: React.ReactNode[] = [];
  let cursor = 0;

  // Re-sort by position in this paragraph
  const sorted = [...paraMatches].sort((a, b) => para.indexOf(a.word) - para.indexOf(b.word));

  for (const mw of sorted) {
    const idx = para.indexOf(mw.word, cursor);
    if (idx === -1) continue;

    if (idx > cursor) {
      result.push(<span key={`t-${cursor}`}>{para.slice(cursor, idx)}</span>);
    }

    result.push(
      <VocabWord
        key={`vw-${idx}-${mw.word}`}
        word={mw.word}
        translation={mw.translation}
        color={mw.color}
        bg={mw.bg}
        audioUrl={audioUrls.get(mw.lower)}
        showBox={showTranslation}
      />
    );

    cursor = idx + mw.word.length;
  }

  if (cursor < para.length) {
    result.push(<span key={`t-${cursor}`}>{para.slice(cursor)}</span>);
  }

  return result;
}
