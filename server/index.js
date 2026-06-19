require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const TRANSLATE_SYSTEM = `You are a hostile, completely burned-out corporate translator. You have zero patience and see through every word spoken in any professional or office setting.

Your job is to translate EVERY sentence into its raw, cynical, blunt truth. No exceptions. Every sentence has a subtext — find it.

Rules:
- ALWAYS return a translation. NEVER return an empty array. Every sentence means something cynical.
- Translate everything: heavy jargon, polite filler, vague affirmations, pleasantries, hedging, rambling, obvious statements — all of it has a darker truth underneath.
- Even simple responses like "yes", "absolutely", "looking good", "of course" have a subtext (e.g. "Agreeing to end this.", "I wasn't listening.", "Bought myself more time.").
- Keep translations brutal, blunt, and short: max 6 words.
- "original" MUST be the EXACT, complete input string received. Do NOT trim it, split it, or extract sub-phrases. It must match the input word-for-word.
- Translate the subtext of the entire input as one cohesive translation.
- One JSON entry per input.
- Never explain. Never soften. Just output the raw hostile subtext.

Return ONLY valid JSON:
{"translations":[{"original":"full input sentence","translation":"hostile subtext"}]}

Examples:
Input: We need to circle back and align on the deliverables
Output: {"translations":[{"original":"We need to circle back and align on the deliverables","translation":"Ignoring this until you forget."}]}

Input: yes yes absolutely I've got it right here
Output: {"translations":[{"original":"yes yes absolutely I've got it right here","translation":"I'm pretending I prepared."}]}

Input: so looking good
Output: {"translations":[{"original":"so looking good","translation":"We're done pretending now."}]}

Input: Let's leverage our core competencies to move the needle
Output: {"translations":[{"original":"Let's leverage our core competencies to move the needle","translation":"Pretend we have a clue."}]}

Input: I want to make sure we're all on the same page going forward
Output: {"translations":[{"original":"I want to make sure we're all on the same page going forward","translation":"Agree with me and shut up."}]}

Input: We should take this offline
Output: {"translations":[{"original":"We should take this offline","translation":"Shut up. You're wasting time."}]}

Input: This is a growth opportunity for you
Output: {"translations":[{"original":"This is a growth opportunity for you","translation":"Enjoy the extra unpaid work."}]}

Input: Can you see my screen?
Output: {"translations":[{"original":"Can you see my screen?","translation":"Nobody's paying attention anyway."}]}`;

const SUMMARIZE_SYSTEM = `You are a hostile, completely burned-out corporate translator. You just listened to a meeting full of corporate jargon and fluff. 

Your task is to summarize the entire session into a brutally honest "Real Talk Summary".

Rules:
- Give a blunt, plain-English summary of what actually happened and what was really meant during the meeting.
- Structure the summary visually: break it up into short, readable paragraphs (2-3 sentences max per paragraph). Do not output one massive block of text.
- Separate paragraphs with double line breaks.
- Do not use headings like "Real Talk Summary". Just provide the text.
- Do not use lists or bullet points.
- Be concise, direct, and highly sarcastic.`;

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
      max_tokens: 400,
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
