// Core logic is set up only once per window lifetime.
// But createFloatingUI() is always called on every injection so the button
// is restored after YouTube SPA navigations tear out the DOM.
if (!window._jargonInitialised) {
  window._jargonInitialised = true;

  window._jargonListening = false;
  window._jargonRec      = null;
  window._jargonSeen     = new Set();
  window._jargonNextIndex = 0;
  window._jargonTimer    = null;
  window._jargonPending  = '';

  const SILENCE_DELAY = 1200; // 1.2 seconds of silence signals a complete sentence/thought

  // ─── UI ────────────────────────────────────────────────────────────────

  window._jargonCreateUI = function createFloatingUI() {
    if (document.getElementById('jargon-floating-btn')) return;

    const toastContainer = document.createElement('div');
    toastContainer.id = 'jargon-toast-container';
    document.body.appendChild(toastContainer);

    const btn = document.createElement('div');
    btn.id = 'jargon-floating-btn';
    btn.innerHTML = `
      <svg class="jargon-mic" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
      <svg class="jargon-stop" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
      <span class="jargon-btn-label">Start Listening</span>
    `;
    btn.addEventListener('click', toggleListening);
    document.body.appendChild(btn);
    updateButtonUI();
    console.log('[Jargon] UI created');
  };

  // Re-attach UI after YouTube SPA navigation replaces the page body
  window.addEventListener('yt-navigate-finish', () => {
    console.log('[Jargon] yt-navigate-finish — re-attaching UI');
    window._jargonCreateUI();
  });

  function toggleListening() {
    window._jargonListening = !window._jargonListening;
    console.log('[Jargon] toggleListening → listening:', window._jargonListening);
    updateButtonUI();
    if (window._jargonListening) {
      startSpeech();
    } else {
      stopSpeech();
      window._jargonSeen.clear();
    }
  }

  function updateButtonUI() {
    const btn = document.getElementById('jargon-floating-btn');
    if (!btn) return;
    const mic   = btn.querySelector('.jargon-mic');
    const stop  = btn.querySelector('.jargon-stop');
    const label = btn.querySelector('.jargon-btn-label');
    if (window._jargonListening) {
      btn.classList.add('listening');
      mic.style.display  = 'none';
      stop.style.display = 'block';
      label.textContent  = 'Stop';
    } else {
      btn.classList.remove('listening');
      mic.style.display  = 'block';
      stop.style.display = 'none';
      label.textContent  = 'Start Listening';
    }
  }

  // ─── Translation ─────────────────────────────────────────────────────────

  async function translateAndShow(text) {
    const t = text.trim();
    if (!t || t.length < 5) return;
    const key = t.toLowerCase();
    if (window._jargonSeen.has(key)) return;
    window._jargonSeen.add(key);
    if (window._jargonSeen.size > 30) {
      const first = window._jargonSeen.values().next().value;
      window._jargonSeen.delete(first);
    }
    console.log('[Jargon] Translating:', t);
    try {
      // Relay through the service worker — YouTube's CSP blocks direct fetches
      // to external origins from content scripts.
      const data = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text: t });
      console.log('[Jargon] API response:', JSON.stringify(data));
      if (!data || data.error) return;
      if (data.translations?.length > 0) {
        data.translations.forEach(tr => {
          if (!tr || !tr.original || !tr.translation) return;
          showToast(tr.original, tr.translation);
        });
      }
    } catch (e) {
      console.warn('[Jargon] sendMessage failed:', e.message);
    }
  }

  // ─── Speech Recognition ───────────────────────────────────────────────────

  function startSpeech() {
    // Reset chunk index
    window._jargonNextIndex = 0;

    // Always tear down any previous instance before creating a new one.
    if (window._jargonRec) {
      const old = window._jargonRec;
      old.onend = old.onerror = old.onresult = null;
      try { old.stop(); } catch (_) {}
      window._jargonRec = null;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.error('[Jargon] SpeechRecognition not available');
      return;
    }

    const rec = new SR();
    window._jargonRec = rec;
    rec.continuous     = true;
    rec.interimResults = true; // Keep interim true so we get fast results, but check isFinal
    rec.lang           = 'en-US';

    rec.onresult = (e) => {
      let currentText = '';
      for (let i = window._jargonNextIndex; i < e.results.length; i++) {
        currentText += e.results[i][0].transcript;
      }
      
      window._jargonPending = currentText.trim();
      const targetNextIndex = e.results.length;
      
      console.log('[Jargon] Interim accumulated:', window._jargonPending);

      // Reset the silence timer on any speech input
      clearTimeout(window._jargonTimer);
      window._jargonTimer = setTimeout(() => {
        if (window._jargonPending && window._jargonListening) {
          const textToSend = window._jargonPending;
          window._jargonPending = '';
          window._jargonNextIndex = targetNextIndex; // Lock in the results we just translated
          
          console.log('[Jargon] Silence detected. Translating chunk:', textToSend);
          translateAndShow(textToSend);
        }
      }, SILENCE_DELAY);
    };

    rec.onerror = (e) => {
      console.warn('[Jargon] SpeechRecognition error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        window._jargonListening = false;
        updateButtonUI();
      }
    };

    rec.onend = () => {
      console.log('[Jargon] onend — still listening:', window._jargonListening);
      if (window._jargonListening) {
        setTimeout(() => {
          if (window._jargonListening) startSpeech();
        }, 300);
      }
    };

    try {
      rec.start();
      console.log('[Jargon] SpeechRecognition started');
    } catch (e) {
      console.error('[Jargon] rec.start() threw:', e.message);
      setTimeout(() => { if (window._jargonListening) startSpeech(); }, 1000);
    }
  }

  function stopSpeech() {
    const rec = window._jargonRec;
    if (rec) {
      rec.onend = rec.onerror = rec.onresult = null;
      try { rec.stop(); } catch (_) {}
      window._jargonRec = null;
    }
    clearTimeout(window._jargonTimer);
    window._jargonPending = '';
  }

  // ─── Toast ────────────────────────────────────────────────────────────────

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showToast(original, translation) {
    // Self-heal: re-create UI if SPA navigation tore it out
    let container = document.getElementById('jargon-toast-container');
    if (!container) {
      window._jargonCreateUI();
      container = document.getElementById('jargon-toast-container');
    }
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'jargon-toast';
    toast.innerHTML = `
      <div class="jargon-toast-original">${escapeHtml(original)}</div>
      <div class="jargon-toast-translation">${escapeHtml(translation)}</div>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 8000);
    while (container.children.length > 5) {
      container.firstChild.remove();
    }
  }
}

// Always called on every injection — restores the button if SPA navigation
// removed it from the DOM, even though _jargonInitialised is already true.
console.log('[Jargon] Script injected — creating UI if needed');
window._jargonCreateUI();
