const BACKEND_URL = 'https://corporate-jargon-translator-production.up.railway.app';
const OFFSCREEN_URL = 'offscreen/offscreen.html';

let pendingStart = false;

// ─── Offscreen Document Management ─────────────────────────────────────────

async function ensureOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument();
    if (existing) return;
  } catch (_) {}
  
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['USER_MEDIA'],
      justification: 'Speech recognition requires microphone access'
    });
  } catch (e) {
    console.error('[Jargon SW] Offscreen create failed:', e.message);
  }
}

async function removeOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument();
    if (existing) {
      await chrome.offscreen.closeDocument();
    }
  } catch (e) {
    // Document might already be closed
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
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/content.css'] }).catch(() => {});
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UI' }).catch(() => {});
    } catch (e) {}
  });
});

// ─── Message Handler ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'OFFSCREEN_READY') {
    if (pendingStart) {
      pendingStart = false;
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_START' });
    }
    return true;
  }

  if (msg.type === 'START_LISTENING') {
    broadcast({ type: 'UI_STATE', isListening: true });
    pendingStart = true;
    ensureOffscreen();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'STOP_LISTENING') {
    pendingStart = false;
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' }).catch(() => {});
    removeOffscreen();
    broadcast({ type: 'UI_STATE', isListening: false });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'TRANSCRIPT') {
    translateAndBroadcast(msg.text);
    return true;
  }

  if (msg.type === 'OFFSCREEN_STARTED') {
    return true;
  }

  if (msg.type === 'OFFSCREEN_ERROR') {
    if (msg.error === 'not-allowed' || msg.error === 'service-not-allowed') {
      pendingStart = false;
      broadcast({ type: 'UI_STATE', isListening: false });
    }
    return true;
  }

  if (msg.type === 'SUMMARIZE') {
    fetch(`${BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations: msg.translations })
    })
      .then(async res => {
        if (res.ok) return res.json();
        return { error: `Server error ${res.status}` };
      })
      .then(data => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

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
