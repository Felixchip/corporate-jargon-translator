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
      .then(async res => {
        if (res.ok) {
          return res.json();
        } else {
          const errText = await res.text().catch(() => 'No error body');
          return { error: `Server error ${res.status}: ${errText}` };
        }
      })
      .then(data => {
        if (data && data.translations && data.translations.length > 0) {
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(t => {
              chrome.tabs.sendMessage(t.id, { 
                type: 'BROADCAST_TOAST', 
                translations: data.translations 
              }).catch(async () => {
                // If message fails, the tab probably didn't get the content script (e.g. it was already open)
                try {
                  // Inject CSS and JS dynamically
                  await chrome.scripting.insertCSS({ target: { tabId: t.id }, files: ['content/content.css'] }).catch(()=>{});
                  await chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['content/receiver.js'] });
                  // Retry sending the message
                  chrome.tabs.sendMessage(t.id, { 
                    type: 'BROADCAST_TOAST', 
                    translations: data.translations 
                  }).catch(() => {});
                } catch (e) {
                  // Ignore errors for tabs like chrome:// or edge://
                }
              });
            });
          });
        }
        sendResponse(data);
      })
      .catch((err) => sendResponse({ error: `Fetch failed: ${err.message}` }));

    return true;
  }

  if (message.type === 'SUMMARIZE') {
    fetch(`${BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations: message.translations })
    })
      .then(async res => {
        if (res.ok) {
          return res.json();
        } else {
          const errText = await res.text().catch(() => 'No error body');
          return { error: `Server error ${res.status}: ${errText}` };
        }
      })
      .then(data => sendResponse(data))
      .catch((err) => sendResponse({ error: `Fetch failed: ${err.message}` }));

    return true;
  }
});
