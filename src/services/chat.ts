// DeepSeek chat service with article generation agent
const API_BASE = 'https://api.deepseek.com/v1';

const SYSTEM_PROMPT = `You are an English teacher AI assistant for Chinese high school students (Gaokao level).

Your capabilities:
1. **Conversation**: Chat naturally in Chinese about what kind of English article the student wants to practice with.
2. **Article Generation**: When the student is ready, generate a custom English article based on their requirements.
3. **Vocabulary**: The student may provide specific English words they want to learn. You MUST incorporate these words naturally into the article.

When generating an article:
- Output format: first the plain English article, then "---" on a line by itself, then the complete Chinese translation.
- Wrap the article part between \`\`\`article and \`\`\` markers so the app can detect it.
- The article should be readable, natural English suitable for Gaokao reading comprehension.
- Include all vocabulary words the student provided.
- IMPORTANT: Write the article as PLAIN TEXT only. Do NOT use **, ##, or any markdown formatting. The app has its own visual highlighting system and markdown characters will break the display. Words that need emphasis should just be written naturally in the text — never wrapped in special characters.

Example article output:
\`\`\`article
[English article here...]
---
[Chinese translation here...]
\`\`\`

Always be encouraging, helpful, and suggest improvements to the student's requirements.`;

export interface ChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  apiKey: string;
}

export interface ChatResult {
  message: string;
  articleText?: string;
  articleTranslation?: string;
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
    const parts = articleBlock.split('---');
    // Strip any markdown formatting the model may have added
    const rawArticle = parts[0]?.trim() || '';
    const articleText = rawArticle.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
    const translation = parts[1]?.trim() || '';

    // Return non-article text as the chat message
    const message = fullText.replace(/```article[\s\S]*?```/, '').trim();

    return {
      message: message || '已生成文章，点击下方查看 👇',
      articleText,
      articleTranslation: translation,
    };
  }

  return { message: fullText };
}
