// DeepSeek API integration
const API_BASE = 'https://api.deepseek.com/v1';

export interface GenerateParams {
  topic: string;
  wordCount: number;
  apiKey: string;
  vocabWords: string[]; // all words from enabled word banks
}

export interface GenerateResult {
  article: string;
  translation: string;
}

export async function generateArticle(params: GenerateParams): Promise<GenerateResult> {
  const vocabBlock = params.vocabWords.slice(0, 2000).join(', ');

  const prompt = `Write an English article suitable for Chinese high school students (Gaokao level).

Topic: ${params.topic}
Target length: approximately ${params.wordCount} words.

IMPORTANT: Try to naturally incorporate as many of these vocabulary words as possible into the article: ${vocabBlock}

Requirements:
- Use natural, fluent English appropriate for high school reading comprehension
- Cover a variety of sentence structures (complex sentences, clauses, etc.)
- The article should be coherent and engaging

After the article, add a line with "---" only, then provide a complete Chinese translation of the entire article.`;

  const resp = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: resp.statusText }));
    throw new Error(err.error?.message || err.message || `API error ${resp.status}`);
  }

  const data = await resp.json();
  const fullText = data.choices?.[0]?.message?.content || '';

  // Parse article and translation
  const parts = fullText.split('---');
  const article = parts[0]?.trim() || '';
  const translation = parts[1]?.trim() || '';

  if (!article) throw new Error('Failed to generate article');

  return { article, translation };
}
