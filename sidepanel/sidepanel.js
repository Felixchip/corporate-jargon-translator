const listenBtnEmpty = document.getElementById('listenBtnEmpty');
const listenBtnBottom = document.getElementById('listenBtnBottom');
const summarizeBtn = document.getElementById('summarizeBtn');
const translationsList = document.getElementById('translationsList');
const emptyState = document.getElementById('emptyState');
const controls = document.querySelector('.controls');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');
const errorClose = document.getElementById('errorClose');
const summaryModal = document.getElementById('summaryModal');
const summaryClose = document.getElementById('summaryClose');
const summaryContent = document.getElementById('summaryContent');
const copyBtn = document.getElementById('copyBtn');
const copyStatus = document.getElementById('copyStatus');

let isListening = false;

function setStatus() {}

function getTranslations() {
  const cards = translationsList.querySelectorAll('.translation-card');
  const translations = [];
  cards.forEach(card => {
    const original = card.querySelector('.translation-original')?.textContent || '';
    const translation = card.querySelector('.translation-result')?.textContent || '';
    if (original && translation) {
      translations.push({ original, translation });
    }
  });
  return translations;
}

async function openSummary() {
  const translations = getTranslations();
  if (translations.length === 0) {
    showError('No translations to summarize.');
    return;
  }

  summaryModal.style.display = 'flex';
  summaryContent.innerHTML = '<div class="summary-loading">Generating summary...</div>';
  copyStatus.style.display = 'none';
  copyBtn.style.display = 'none';

  try {
    const response = await fetch(`${BACKEND_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations })
    });

    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      throw new Error(e.error || `Server error ${response.status}`);
    }

    const data = await response.json();
    summaryContent.innerHTML = data.summary.replace(/\n/g, '<br>');
    copyBtn.style.display = 'flex';
  } catch (e) {
    summaryContent.innerHTML = `<div class="summary-error">Failed to generate summary: ${e.message}</div>`;
  }
}

function closeSummary() {
  summaryModal.style.display = 'none';
}

function copyToClipboard() {
  const text = summaryContent.innerText;

  navigator.clipboard.writeText(text).then(() => {
    copyStatus.style.display = 'block';
    copyBtn.style.display = 'none';
    setTimeout(() => {
      copyStatus.style.display = 'none';
      copyBtn.style.display = 'flex';
    }, 2000);
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copyStatus.style.display = 'block';
    copyBtn.style.display = 'none';
    setTimeout(() => {
      copyStatus.style.display = 'none';
      copyBtn.style.display = 'flex';
    }, 2000);
  });
}

function setListeningUI(listening) {
  isListening = listening;
  [listenBtnEmpty, listenBtnBottom].forEach(btn => {
    const micIcon = btn.querySelector('.mic-icon');
    const stopIcon = btn.querySelector('.stop-icon');
    const label = btn.querySelector('.btn-label');
    if (listening) {
      btn.classList.add('listening');
      micIcon.style.display = 'none';
      stopIcon.style.display = 'block';
      label.textContent = 'Stop';
    } else {
      btn.classList.remove('listening');
      micIcon.style.display = 'block';
      stopIcon.style.display = 'none';
      label.textContent = 'Start Listening';
    }
  });
  const hasCards = translationsList.querySelectorAll('.translation-card').length > 0;
  summarizeBtn.style.display = (!listening && hasCards) ? 'flex' : 'none';
}

function handleListenClick() {
  if (isListening) {
    if (rec) { rec.onend = null; try { rec.stop(); } catch(e){} }
    // Flush any remaining batch before stopping
    if (batch.length > 0) {
      const toSend = [...batch]
      batch = []
      clearTimeout(debounceTimer)
      clearTimeout(maxWaitTimer)
      debounceTimer = null
      maxWaitTimer = null
      processBatch(toSend)
    }
    processing = false;
    setListeningUI(false);
    controls.style.display = 'flex';
    const hasCards = translationsList.querySelectorAll('.translation-card').length > 0;
    emptyState.style.display = hasCards ? 'none' : 'flex';
    setStatus('', 'Stopped');
    return;
  }

  navigator.permissions.query({ name: 'microphone' }).then(perm => {
    if (perm.state !== 'granted') {
      window.open(chrome.runtime.getURL('permission/permission.html'), '_blank');
      showError('Grant mic access in the new tab, then try again.');
      return;
    }
    startListening();
  }).catch(() => startListening());
}

function startListening() {
  seen.clear();
  emptyState.style.display = 'none';
  controls.style.display = 'flex';
  setListeningUI(true);
  setStatus('active', 'Listening...');
  startSpeech();
}

listenBtnEmpty.addEventListener('click', handleListenClick);
listenBtnBottom.addEventListener('click', handleListenClick);

function showError(text) {
  errorText.textContent = text;
  errorBanner.style.display = 'flex';
  setTimeout(() => errorBanner.style.display = 'none', 8000);
}

function addTranslation(original, translation) {
  emptyState.style.display = 'none';
  const card = document.createElement('div');
  card.className = 'translation-card';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  card.innerHTML = `
    <div class="translation-original">${escapeHtml(original)}</div>
    <div class="translation-result">${escapeHtml(translation)}</div>
    <div class="translation-time">${time}</div>
  `;
  translationsList.appendChild(card);
  translationsList.scrollTop = translationsList.scrollHeight;
  const cards = translationsList.querySelectorAll('.translation-card');
  if (cards.length > 50) cards[0].remove();
  if (!isListening && cards.length > 0) {
    summarizeBtn.style.display = 'flex';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function translateText(text) {
  try {
    console.log('[API] Sending to backend:', text);
    const response = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    console.log('[API] Response status:', response.status);
    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      console.log('[API] Error:', e);
      return { error: e.error || `Server error ${response.status}` };
    }
    const data = await response.json();
    console.log('[API] Response data:', data);
    return data;
  } catch (e) {
    console.log('[API] Fetch error:', e.message);
    return { error: e.message };
  }
}

// --- CHUNKING ---
const MAX_WAIT = 2000
const BATCH_PAUSE = 800

let batch = []
let debounceTimer = null
let maxWaitTimer = null
let processing = false

function onJargonHit(phrase) {
  batch.push(phrase)

  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(flush, MAX_WAIT)
  }

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flush, BATCH_PAUSE)
}

function flush() {
  if (!batch.length) return
  clearTimeout(debounceTimer)
  clearTimeout(maxWaitTimer)
  debounceTimer = null
  maxWaitTimer = null

  const toSend = [...batch]
  batch = []
  processBatch(toSend)
}

async function processBatch(sentences) {
  if (processing) return
  processing = true

  const combined = sentences.join('. ')
  setStatus('translating', 'Translating...')
  const r = await translateText(combined)
  console.log('[TRANSLATE]', combined, '→', r)

  if (r.error) showError(r.error)
  else if (r.translations?.length > 0) {
    r.translations.forEach(t => {
      if (!t || !t.original || !t.translation) return
      addTranslation(t.original, t.translation)
    })
  }

  processing = false
  if (isListening) setStatus('active', 'Listening...')
}

// --- SPEECH ---
let rec = null;
const seen = new Set();

function startSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showError('Use Chrome.'); return; }

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
      onJargonHit(t);
    }
  };

  rec.onerror = (e) => {
    if (e.error === 'not-allowed') {
      showError('Mic denied.');
      setListeningUI(false);
      controls.style.display = 'flex';
      const hasCards = translationsList.querySelectorAll('.translation-card').length > 0;
      emptyState.style.display = hasCards ? 'none' : 'flex';
    }
  };

  rec.onend = () => {
    if (isListening) setTimeout(() => { try { rec.start(); } catch(e){} }, 30);
  };

  rec.start();
}

errorClose.addEventListener('click', () => errorBanner.style.display = 'none');

// --- SUMMARIZE ---
summarizeBtn.addEventListener('click', openSummary);
summaryClose.addEventListener('click', closeSummary);
summaryModal.addEventListener('click', (e) => { if (e.target === summaryModal) closeSummary(); });
copyBtn.addEventListener('click', copyToClipboard);
