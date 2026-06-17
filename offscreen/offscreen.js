let rec = null;
let isListening = false;
const seen = new Set();

function startSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (!e.results[i].isFinal) continue;
      const t = e.results[i][0].transcript.trim();
      if (!t || t.length < 10) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (seen.size > 30) {
        const first = seen.values().next().value;
        seen.delete(first);
      }
      chrome.runtime.sendMessage({ type: 'TRANSCRIPT', text: t });
    }
  };

  rec.onerror = (e) => {
    if (e.error !== 'no-speech') {
      chrome.runtime.sendMessage({ type: 'SPEECH_ERROR', error: e.error });
    }
  };

  rec.onend = () => {
    if (isListening) setTimeout(() => { try { rec.start(); } catch(e){} }, 30);
  };

  rec.start();
}

function stopSpeech() {
  if (rec) {
    rec.onend = null;
    try { rec.stop(); } catch(e) {}
    rec = null;
  }
  seen.clear();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OFFSCREEN_START') {
    isListening = true;
    startSpeech();
  }
  if (msg.type === 'OFFSCREEN_STOP') {
    isListening = false;
    stopSpeech();
  }
});
