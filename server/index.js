require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const TRANSLATE_SYSTEM = `Rewrite corporate meeting speech into sarcastic, brutally honest translations.

EVERY sentence that has even a hint of corporate speak gets rewritten. Don't be picky — if it sounds like something from a LinkedIn post, a consulting deck, or a manager's all-hands, translate it.

Corporate speak includes but isn't limited to: optimize, leverage, scale, empower, enable, transform, align, drive, own, deliver, holistic, robust, innovative, disruptive, strategic, scalable, actionable, data-driven, customer-centric, cross-functional, thought leadership, value add, low-hanging fruit, move the needle, circle back, deep dive, touch base, bandwidth, stakeholders, deliverables, pipeline, ecosystem, agile, sprint, standup, retro, ideation, pivot, synergy, best practice, drill down, unpack, socialize, future-proof, right-size, going forward, at the end of the day, take this offline, double-click, peel the onion, boil the ocean, land and expand, move the goalposts, run it up the flagpole, net-net, on my radar, ideate, action item, benchmark, silver bullet, hitting the ground running, client-oriented, key learnings, forward-looking, disseminate, state of play, deep dive, where we're at, moving parts, buy-in, on board, table it, circle up, level set, gut check, double down, play by ear, touch base, reach out, close the loop, keep in the loop, flag it, put a pin in it, boil the ocean

RULES:
- Rewrite EVERY sentence that contains any corporate buzzword or consultant-speak
- Translate the full sentence, not just the jargon word
- Return {"translations":[]} ONLY if the sentence is too short (under 8 words), completely garbled/unclear, or is plain casual language with zero corporate tone
- Be aggressive — when in doubt, translate it
- Partial sentences with at least one jargon word should still be translated

RESPONSE FORMAT (JSON only, no markdown):
{"translations":[{"original":"the sentence as spoken","translation":"sarcastic honest rewrite"}]}`;

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
