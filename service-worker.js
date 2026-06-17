const BACKEND_URL = 'https://corporate-jargon-translator-production.up.railway.app';

let isListening = false;
let translations = [];

// --- OFFSCREEN DOCUMENT MANAGEMENT ---
async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existing.length > 0) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Speech recognition requires window access'
  });
}

async function removeOffscreen() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existing.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

// --- BROADCAST TO ALL TABS ---
function broadcast(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    });
  });
}

// --- API CALLS ---
async function translateText(text) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      return { error: e.error || `Server error ${response.status}` };
    }
    return await response.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function translateAndBroadcast(text) {
  const r = await translateText(text);
  if (r.translations?.length > 0) {
    r.translations.forEach(t => {
      if (!t || !t.original || !t.translation) return;
      translations.push(t);
      broadcast({
        type: 'SHOW_TOAST',
        original: t.original,
        translation: t.translation
      });
    });
  }
}

// --- MESSAGE HANDLER ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_LISTENING') {
    isListening = true;
    translations = [];
    ensureOffscreen().then(() => {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_START' });
      broadcast({ type: 'UI_STATE', isListening: true });
    });
    sendResponse({ ok: true });
  }

  if (msg.type === 'STOP_LISTENING') {
    isListening = false;
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' });
    removeOffscreen();
    broadcast({ type: 'UI_STATE', isListening: false });
    sendResponse({ ok: true });
  }

  if (msg.type === 'TRANSCRIPT') {
    translateAndBroadcast(msg.text);
  }

  if (msg.type === 'GET_STATE') {
    sendResponse({ isListening, translations });
  }

  return true;
});
