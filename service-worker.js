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
  } catch (e) {
    console.error('[Jargon SW] Offscreen create failed:', e.message);
  }
}

async function removeOffscreen() {
  if (!offscreenCreated) return;
  try {
    await chrome.offscreen.closeDocument();
    offscreenCreated = false;
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
  try {
    const res = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.translations?.length > 0) {
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

// ─── Icon Click → Toggle UI on active tab ──────────────────────────────────

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UI' }).catch(async () => {
    // Content script not injected yet — inject it
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/content.css'] }).catch(() => {});
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UI' }).catch(() => {});
    } catch (e) {}
  });
});

// ─── Message Handler ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Content script → start listening
  if (msg.type === 'START_LISTENING') {
    isListening = true;
    ensureOffscreen().then(() => {
      // Send to offscreen ONLY — use different message type to avoid self-loop
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_START' });
      broadcast({ type: 'UI_STATE', isListening: true });
    });
    sendResponse({ ok: true });
    return true;
  }

  // Content script → stop listening
  if (msg.type === 'STOP_LISTENING') {
    isListening = false;
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' }).catch(() => {});
    removeOffscreen();
    broadcast({ type: 'UI_STATE', isListening: false });
    sendResponse({ ok: true });
    return true;
  }

  // Offscreen → transcript ready
  if (msg.type === 'TRANSCRIPT') {
    translateAndBroadcast(msg.text);
    return true;
  }

  // Offscreen → started
  if (msg.type === 'OFFSCREEN_STARTED') {
    return true;
  }

  // Offscreen → error
  if (msg.type === 'OFFSCREEN_ERROR') {
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
        const errText = await res.text().catch(() => '');
        return { error: `Server error ${res.status}` };
      })
      .then(data => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }));
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
