const BACKEND_URL = 'https://corporate-jargon-translator-production.up.railway.app';
const OFFSCREEN_URL = 'offscreen/offscreen.html';

let isListening = false;
let offscreenCreated = false;

// ─── Offscreen Document Management ─────────────────────────────────────────

async function ensureOffscreen() {
  if (offscreenCreated) return;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['USER_MEDIA'],
      justification: 'Speech recognition requires microphone access'
    });
    offscreenCreated = true;
    console.log('[Jargon SW] Offscreen document created');
  } catch (e) {
    console.error('[Jargon SW] Failed to create offscreen:', e.message);
  }
}

async function removeOffscreen() {
  if (!offscreenCreated) return;
  try {
    await chrome.offscreen.closeDocument();
    offscreenCreated = false;
    console.log('[Jargon SW] Offscreen document removed');
  } catch (e) {
    offscreenCreated = false;
  }
}

// ─── Broadcast to All Tabs ─────────────────────────────────────────────────

function broadcast(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(t => {
      chrome.tabs.sendMessage(t.id, msg).catch(() => {});
    });
  });
}

// ─── Translation API ───────────────────────────────────────────────────────

async function translateAndBroadcast(text) {
  console.log('[Jargon SW] Translating:', text);
  try {
    const res = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) {
      console.error('[Jargon SW] API error:', res.status);
      return;
    }
    const data = await res.json();
    if (data.translations?.length > 0) {
      // Store in session
      chrome.storage.local.get(['sessionTranslations'], (result) => {
        const current = result.sessionTranslations || [];
        chrome.storage.local.set({ sessionTranslations: [...current, ...data.translations] });
      });
      broadcast({ type: 'BROADCAST_TOAST', translations: data.translations });
    }
  } catch (e) {
    console.error('[Jargon SW] Fetch failed:', e.message);
  }
}

// ─── Message Handler ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Content script → start listening
  if (msg.type === 'START_LISTENING') {
    console.log('[Jargon SW] START_LISTENING');
    isListening = true;
    ensureOffscreen().then(() => {
      chrome.runtime.sendMessage({ type: 'START_LISTENING' });
      broadcast({ type: 'UI_STATE', isListening: true });
    });
    sendResponse({ ok: true });
    return true;
  }

  // Content script → stop listening
  if (msg.type === 'STOP_LISTENING') {
    console.log('[Jargon SW] STOP_LISTENING');
    isListening = false;
    chrome.runtime.sendMessage({ type: 'STOP_LISTENING' }).catch(() => {});
    removeOffscreen();
    broadcast({ type: 'UI_STATE', isListening: false });
    sendResponse({ ok: true });
    return true;
  }

  // Offscreen → transcript ready
  if (msg.type === 'TRANSCRIPT') {
    console.log('[Jargon SW] TRANSCRIPT:', msg.text);
    translateAndBroadcast(msg.text);
    return true;
  }

  // Offscreen → started successfully
  if (msg.type === 'OFFSCREEN_STARTED') {
    console.log('[Jargon SW] Offscreen started');
    return true;
  }

  // Offscreen → error
  if (msg.type === 'OFFSCREEN_ERROR') {
    console.error('[Jargon SW] Offscreen error:', msg.error);
    if (msg.error === 'not-allowed' || msg.error === 'service-not-allowed') {
      isListening = false;
      broadcast({ type: 'UI_STATE', isListening: false });
    }
    return true;
  }

  // Summarize
  if (msg.type === 'SUMMARIZE') {
    fetch(`${BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations: msg.translations })
    })
      .then(async res => {
        if (res.ok) return res.json();
        const errText = await res.text().catch(() => 'No error body');
        return { error: `Server error ${res.status}: ${errText}` };
      })
      .then(data => sendResponse(data))
      .catch((err) => sendResponse({ error: `Fetch failed: ${err.message}` }));
    return true;
  }

  // Focus tab
  if (msg.type === 'FOCUS_TAB') {
    if (msg.tabId) {
      chrome.tabs.get(msg.tabId, (tab) => {
        if (tab) {
          chrome.tabs.update(tab.id, { active: true });
          chrome.windows.update(tab.windowId, { focused: true });
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }
});
