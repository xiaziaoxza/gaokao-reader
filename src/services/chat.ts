// DeepSeek chat service with article generation agent
const API_BASE = 'https://api.deepseek.com/v1';

const SYSTEM_PROMPT = `You are an English teacher AI assistant for Chinese high school students (Gaokao level).

Your capabilities:
1. **Conversation**: Chat naturally in Chinese about what kind of English article the student wants to practice with.
2. **Article Generation**: When the student is ready, generate a custom English article based on their requirements.
3. **Vocabulary**: The student may provide specific English words they want to learn. You MUST incorporate these words naturally into the article.

When generating an article:
- Output format: FIRST line is the article TITLE. Then the article body. Then a line containing ONLY "---" (three dashes, nothing else). Then the complete Chinese translation. The "---" separator MUST be on its own line with empty lines before and after it.
- Wrap the entire output (title + article + separator + translation) between \`\`\`article and \`\`\` markers so the app can detect it.
- The article should be readable, natural English suitable for Gaokao reading comprehension.
- Include all vocabulary words the student provided.
- IMPORTANT: Write the article as PLAIN TEXT only. Do NOT use **, ##, or any markdown formatting. The app has its own visual highlighting system.

Example article output:
\`\`\`article
The Future of Renewable Energy in Modern Cities
[English article text here — body paragraphs...]
---
[Chinese translation here...]
\`\`\`

The title must be a well-crafted, descriptive English title appropriate for a high school reading passage. Never use "Untitled" or generic placeholders.

Always be encouraging, helpful, and suggest improvements to the student's requirements.`;

export interface ChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  apiKey: string;
}

export interface ChatResult {
  message: string;
  articleText?: string;
  articleTranslation?: string;
  articleTitle?: string;
}

export async function sendChatMessage(params: ChatParams): Promise<ChatResult> {
  const resp = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...params.messages,
      ],
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: resp.statusText }));
    throw new Error(err.error?.message || err.message || `API error ${resp.status}`);
  }

  const data = await resp.json();
  const fullText: string = data.choices?.[0]?.message?.content || '';

  // Check for article markers
  const articleMatch = fullText.match(/```article\s*\n([\s\S]*?)\n```/);

  if (articleMatch) {
    const articleBlock = articleMatch[1];
    // Split on "---" on its own line (not em dashes in text)
    const sepMatch = articleBlock.match(/\n---\n/);
    const articleSection = sepMatch
      ? articleBlock.substring(0, sepMatch.index).trim()
      : articleBlock.trim();
    const translation = sepMatch
      ? articleBlock.substring(sepMatch.index! + sepMatch[0].length).trim()
      : '';

    // First line is the title, rest is the article body
    const lines = articleSection.split('\n');
    let title = '';
    let articleText = '';

    if (lines.length >= 2) {
      title = lines[0].trim();
      articleText = lines.slice(1).join('\n').trim();
    } else {
      // Fallback: single line — use as title, generate from first sentence
      title = lines[0]?.trim() || '';
      articleText = articleSection;
    }

    // Strip any markdown formatting the model may have added
    articleText = articleText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
    title = title.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');

    if (!title || title.length < 2) {
      title = articleText.split(/[.!]/)[0]?.trim().slice(0, 60) || '未命名文章';
    }

    // Return non-article text as the chat message
    const message = fullText.replace(/```article[\s\S]*?```/, '').trim();

    return {
      message: message || '已生成文章，点击下方查看 👇',
      articleText: articleText || articleSection,
      articleTranslation: translation,
      articleTitle: title,
    };
  }

  return { message: fullText };
}
