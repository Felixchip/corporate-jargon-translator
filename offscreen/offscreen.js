// Offscreen document — runs speech recognition in a hidden page
// This bypasses YouTube's CSP and audio interference entirely.

let rec = null;
let isListening = false;
const seen = new Set();
let buffer = '';
let silenceTimer = null;
const SILENCE_DELAY = 1500;

function startRecognition() {
  if (rec) {
    rec.onend = rec.onerror = rec.onresult = null;
    try { rec.stop(); } catch (_) {}
    rec = null;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: 'SpeechRecognition not available' });
    return;
  }

  rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  rec.onresult = (e) => {
    let lastFinal = '';
    let latestInterim = '';

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        lastFinal += transcript;
      } else {
        latestInterim = transcript;
      }
    }

    if (lastFinal) {
      buffer += (buffer ? ' ' : '') + lastFinal;
    }

    const fullText = (buffer + (latestInterim ? ' ' + latestInterim : '')).trim();
    const words = fullText.split(/\s+/).filter(Boolean).length;

    let timeoutMs = 1500;
    if (words >= 15) timeoutMs = 800;
    else if (words >= 8) timeoutMs = 1200;

    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      const sentence = buffer.trim();
      buffer = '';
      if (sentence && sentence.split(/\s+/).filter(Boolean).length >= 3 && isListening) {
        const key = sentence.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          if (seen.size > 50) {
            const first = seen.values().next().value;
            seen.delete(first);
          }
          chrome.runtime.sendMessage({ type: 'TRANSCRIPT', text: sentence });
        }
      }
    }, timeoutMs);
  };

  rec.onerror = (e) => {
    console.warn('[Jargon Offscreen] Speech error:', e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      isListening = false;
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: e.error });
    }
  };

  rec.onend = () => {
    if (isListening) {
      const elapsed = Date.now() - (window._startTime || 0);
      const delay = elapsed < 1000 ? 2000 : 500;
      setTimeout(() => { if (isListening) startRecognition(); }, delay);
    }
  };

  try {
    window._startTime = Date.now();
    rec.start();
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STARTED' });
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', error: e.message });
  }
}

function stopRecognition() {
  isListening = false;
  if (rec) {
    rec.onend = rec.onerror = rec.onresult = null;
    try { rec.stop(); } catch (_) {}
    rec = null;
  }
  clearTimeout(silenceTimer);
  buffer = '';
  seen.clear();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OFFSCREEN_START') {
    isListening = true;
    buffer = '';
    seen.clear();
    startRecognition();
  }
  if (msg.type === 'OFFSCREEN_STOP') {
    stopRecognition();
  }
});
