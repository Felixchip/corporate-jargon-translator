// Core logic is set up only once per window lifetime.
// But createFloatingUI() is always called on every injection so the button
// is restored after YouTube SPA navigations tear out the DOM.
if (!window._jargonInitialised) {
  window._jargonInitialised = true;

  window._jargonListening     = false;
  window._jargonRec           = null;
  window._jargonSeen          = new Set();
  window._jargonPrevLength    = 0;
  window._jargonPrevText      = '';
  window._jargonBuffer        = '';
  window._jargonTimer         = null;
  window._jargonTranslations  = []; // stores {original, translation} for the session

  // ─── UI ────────────────────────────────────────────────────────────────

  window._jargonCreateUI = function createFloatingUI() {
    if (!document.getElementById('jargon-toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'jargon-toast-container';
      document.body.appendChild(toastContainer);
    }

    if (document.getElementById('jargon-floating-btn')) return;

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
      <span class="jargon-btn-label">Start Translating</span>
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
      // Clear session when starting fresh
      window._jargonTranslations = [];
      window._jargonSeen.clear();
      hideSummarizeBtn();
      startSpeech();
    } else {
      stopSpeech();
      // Always offer a summary after a session
      showSummarizeBtn();
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
      label.textContent  = 'Start Translating';
    }
  }

  // ─── Summarize Button ─────────────────────────────────────────────────────

  function showSummarizeBtn() {
    if (document.getElementById('jargon-summarize-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'jargon-summarize-btn';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
        <polyline points="10,9 9,9 8,9" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span>Summarize Session</span>
    `;
    btn.addEventListener('click', summarizeSession);
    document.body.appendChild(btn);
  }

  function hideSummarizeBtn() {
    const btn = document.getElementById('jargon-summarize-btn');
    if (btn) btn.remove();
  }

  async function summarizeSession() {
    const btn = document.getElementById('jargon-summarize-btn');
    if (btn) {
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
      btn.querySelector('span').textContent = 'Summarizing…';
    }

    if (window._jargonTranslations.length === 0) {
      if (btn) btn.remove();
      showSummaryCard('Nothing to summarize — no jargon was detected this session.');
      return;
    }

    try {
      const data = await chrome.runtime.sendMessage({
        type: 'SUMMARIZE',
        translations: window._jargonTranslations
      });

      if (btn) btn.remove();

      if (data && data.summary) {
        showSummaryCard(data.summary);
      } else if (data && data.error) {
        console.error('[Jargon] Summarize error:', data.error);
        showSummaryCard('Summary failed: ' + data.error);
      }
    } catch (e) {
      console.error('[Jargon] Summarize sendMessage threw:', e.message);
      if (btn) {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.querySelector('span').textContent = 'Summarize Session';
      }
    }
  }

  function showSummaryCard(summary) {
    // Remove existing summary card if any
    const existing = document.getElementById('jargon-summary-card');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = 'jargon-summary-card';
    card.innerHTML = `
      <div class="jargon-summary-header">
        <span class="jargon-summary-badge">Session Summary</span>
        <div class="jargon-summary-actions">
          <button class="jargon-summary-copy" title="Copy to clipboard">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
          <button class="jargon-summary-close" title="Dismiss">✕</button>
        </div>
      </div>
      <div class="jargon-summary-body">${escapeHtml(summary).replace(/\n/g, '<br>')}</div>
    `;

    // Copy button
    card.querySelector('.jargon-summary-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(summary).then(() => {
        const copyBtn = card.querySelector('.jargon-summary-copy');
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
        }, 2000);
      });
    });

    // Dismiss button
    card.querySelector('.jargon-summary-close').addEventListener('click', () => {
      card.classList.add('fade-out');
      card.addEventListener('animationend', () => card.remove());
    });

    document.body.appendChild(card);
  }

  // ─── Translation ─────────────────────────────────────────────────────────

  async function translateAndShow(text) {
    const t = text.trim();
    if (!t) {
      console.log('[Jargon] Skipped translate: text is empty');
      return;
    }
    const key = t.toLowerCase();
    if (window._jargonSeen.has(key)) {
      console.log(`[Jargon] Skipped translate (already seen): "${t}"`);
      return;
    }
    window._jargonSeen.add(key);
    if (window._jargonSeen.size > 50) {
      const first = window._jargonSeen.values().next().value;
      window._jargonSeen.delete(first);
    }
    console.log('[Jargon] Sending translation request to service worker:', t);
    try {
      const data = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text: t });
      console.log('[Jargon] Received response from service worker:', JSON.stringify(data));
      if (!data) {
        console.error('[Jargon] Response from service worker was null/undefined');
        return;
      }
      if (data.error) {
        console.error('[Jargon] Service worker returned error:', data.error);
        return;
      }
      if (data.translations?.length > 0) {
        data.translations.forEach(tr => {
          if (!tr || !tr.original || !tr.translation) return;
          // Store for summary
          window._jargonTranslations.push({ original: tr.original, translation: tr.translation });
        });
      } else {
        console.log('[Jargon] No jargon detected in response');
      }
    } catch (e) {
      console.error('[Jargon] sendMessage threw error:', e.message);
    }
  }

  // ─── Speech Recognition ───────────────────────────────────────────────────

  function startSpeech() {
    // Reset session state
    window._jargonPrevLength = 0;
    window._jargonPrevText   = '';
    window._jargonBuffer     = '';
    clearTimeout(window._jargonTimer);

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
    rec.interimResults = true;
    rec.lang           = 'en-US';

    rec.onresult = (e) => {
      // Build the full current interim transcript from all results in the list
      let currentText = '';
      for (let i = 0; i < e.results.length; i++) {
        currentText += e.results[i][0].transcript;
      }
      currentText = currentText.trim();

      window._jargonBuffer = currentText;

      // Determine dynamic silence timeout:
      // - 1.2s for short fragments (under 5 words) to give them time to finish
      // - 0.9s (900ms) for normal sentences (5-14 words) for standard boundary detection
      // - 0.5s (500ms) for long sentences (15-21 words) to flush on a brief breath
      // - 0.3s (300ms) for very long sentences (22+ words) to force a flush on any pause
      const words = currentText.split(/\s+/).filter(Boolean).length;
      let timeoutMs = 1200;
      if (words >= 22) {
        timeoutMs = 300;
      } else if (words >= 15) {
        timeoutMs = 500;
      } else if (words >= 5) {
        timeoutMs = 900;
      }

      clearTimeout(window._jargonTimer);
      window._jargonTimer = setTimeout(() => {
        const sentence = window._jargonBuffer.trim();
        if (sentence && window._jargonListening) {
          console.log(`[Jargon] Silence (${timeoutMs}ms) — flushing sentence:`, sentence);
          translateAndShow(sentence);
          startSpeech(); // Restart to clear history and prevent merging
        }
      }, timeoutMs);
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
    window._jargonPrevText   = '';
    window._jargonPrevLength = 0;
    window._jargonBuffer     = '';
  }

  // ─── Toast ────────────────────────────────────────────────────────────────

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Toast rendering is now handled by receiver.js listening for BROADCAST_TOAST
}

// Always called on every injection — restores the button if SPA navigation
// removed it from the DOM, even though _jargonInitialised is already true.
console.log('[Jargon] Script injected — creating UI if needed');
window._jargonCreateUI();
