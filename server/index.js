require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const TRANSLATE_SYSTEM = `Rewrite each phrase in brutally honest plain English. Be sardonic but accurate. Keep it short.

RESPONSE FORMAT (JSON only, no markdown):
{"translations":[{"original":"the sentence as spoken","translation":"sardonic plain English rewrite"}]}

If no corporate jargon is detected, return {"translations":[]}`;

const SUMMARIZE_SYSTEM = `You are a corporate jargon analyst. Summarize the meeting translations into a clear, actionable report. Structure it as:

1. KEY FINDINGS - What corporate jargon was detected and what it really means
2. JARGON PATTERNS - Common phrases or themes observed
3. REAL TALK SUMMARY - A plain-English version of what was actually being communicated

Be concise, direct, and slightly sarcastic. Use bullet points. Keep the total under 200 words.`;

async function callAnthropic(system, userMessage) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API ${response.status}: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function parseTranslations(raw) {
  try {
    const trimmed = raw.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
    const parsed = JSON.parse(trimmed);
    return (parsed.translations || []).filter(t => t && t.original && t.translation);
  } catch (e) {
    const start = raw.indexOf('{"translations"');
    if (start === -1) return [];
    let depth = 0;
    let end = start;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '{') depth++;
      if (raw[i] === '}') depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    const parsed = JSON.parse(raw.substring(start, end));
    return (parsed.translations || []).filter(t => t && t.original && t.translation);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!ANTHROPIC_API_KEY });
});

// Translate speech text
app.post('/api/translate', async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key not configured on server.' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const raw = await callAnthropic(TRANSLATE_SYSTEM, `Translate the corporate jargon in this meeting speech: "${text}"`);
    const translations = parseTranslations(raw);
    res.json({ translations });
  } catch (e) {
    console.error('[Translate Error]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Summarize translations
app.post('/api/summarize', async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key not configured on server.' });
    }

    const { translations } = req.body;
    if (!translations || !Array.isArray(translations) || translations.length === 0) {
      return res.status(400).json({ error: 'Translations array is required.' });
    }

    const translationsText = translations
      .map(t => `Original: "${t.original}"\nTranslation: "${t.translation}"`)
      .join('\n\n');

    const summary = await callAnthropic(SUMMARIZE_SYSTEM, `Summarize these corporate jargon translations from a meeting:\n\n${translationsText}`);
    res.json({ summary });
  } catch (e) {
    console.error('[Summarize Error]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
