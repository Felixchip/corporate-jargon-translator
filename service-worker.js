const BACKEND_URL = 'https://corporate-jargon-translator-production.up.railway.app';

console.log('[Jargon] Service worker loaded');

chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Jargon] Icon clicked, injecting into tab:', tab.id);
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content/content.css']
    }).catch((e) => console.error('[Jargon] CSS error:', e));
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    });
    console.log('[Jargon] Script injected successfully');
  } catch (e) {
    console.error('[Jargon] Inject error:', e);
  }
});

// Proxy translation fetches on behalf of content scripts.
// Content scripts on sites with strict CSPs (e.g. YouTube) cannot fetch
// external origins directly — the service worker can, so we relay through here.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRANSLATE') {
    fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message.text })
    })
      .then(res => res.ok ? res.json() : { translations: [] })
      .then(data => sendResponse(data))
      .catch(() => sendResponse({ translations: [] }));

    return true; // Keep the message channel open for the async response
  }
});
