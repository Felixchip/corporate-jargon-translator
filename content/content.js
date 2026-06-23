// content.js — UI only. Speech recognition lives in offscreen document.
// This script creates the floating button and handles toast display.

if (!window._jargonInitialised) {
  window._jargonInitialised = true;
  window._jargonListening = false;
  window._jargonHasSession = false;

  // ─── UI ────────────────────────────────────────────────────────────────

  function createFloatingUI() {
    if (document.getElementById('jargon-shadow-host')) return;

    // Toast container
    if (!document.getElementById('jargon-toast-container')) {
      const tc = document.createElement('div');
      tc.id = 'jargon-toast-container';
      document.body.appendChild(tc);
    }

    // Shadow DOM host
    const host = document.createElement('div');
    host.id = 'jargon-shadow-host';
    Object.assign(host.style, {
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      zIndex: '2147483647',
      width: '320px',
      pointerEvents: 'auto',
      border: 'none',
      background: 'none',
      padding: '0',
      margin: '0',
    });

    const shadow = host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        :host { display: block; }
        * { box-sizing: border-box; }

        #jargon-floating-container {
          width: 320px;
          background: #2b2b2b;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 28px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.45);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #fff;
          overflow: hidden;
          user-select: none;
        }

        .jargon-container-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 20px 12px 20px;
        }

        .jargon-container-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.2px;
          margin: 0;
          padding: 0;
        }

        .jargon-container-close {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
          line-height: 1;
        }
        .jargon-container-close:hover { color: #fff; }

        .jargon-container-divider {
          border: none;
          border-bottom: 1px dashed rgba(255,255,255,0.12);
          margin: 0;
          padding: 0;
        }

        .jargon-container-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          width: 100%;
        }

        #jargon-floating-summarize-btn {
          width: 100%;
          height: 54px;
          border-radius: 9999px;
          background: #ffffff;
          color: #000000;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 8px solid rgba(255,255,255,0.18);
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.3px;
          user-select: none;
        }
        #jargon-floating-summarize-btn:hover {
          transform: translateY(-2px) scale(1.02);
          border-color: rgba(255,255,255,0.25);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }

        #jargon-floating-btn {
          width: 100%;
          height: 54px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #0066ff, #60a5fa);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          border: 8px solid rgba(255,255,255,0.18);
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.3px;
          user-select: none;
        }
        #jargon-floating-btn:hover {
          transform: translateY(-2px) scale(1.02);
          border-color: rgba(255,255,255,0.25);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }
        #jargon-floating-btn:active {
          transform: translateY(1px) scale(0.98);
          border-color: rgba(255,255,255,0.22);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        #jargon-floating-btn.listening {
          background: linear-gradient(90deg, #ff0000, #ff4b4b);
          border-color: rgba(255,255,255,0.18);
          animation: jargon-pulse-glow-red 2.5s infinite;
        }
        #jargon-floating-btn.listening:hover {
          border-color: rgba(255,255,255,0.25);
        }

        .jargon-btn-label { white-space: nowrap; }

        .jargon-mic, .jargon-stop {
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        #jargon-floating-btn:hover .jargon-mic { transform: scale(1.1); }
        #jargon-floating-btn.listening .jargon-stop {
          animation: jargon-stop-shake 1.5s ease infinite;
        }

        @keyframes jargon-pulse-glow-red {
          0%, 100% { box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
          50% { box-shadow: 0 0 0 8px rgba(255,75,75,0.25), 0 8px 20px rgba(0,0,0,0.2); }
        }
        @keyframes jargon-stop-shake {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>

      <div id="jargon-floating-container">
        <div class="jargon-container-header">
          <span class="jargon-container-title">Cut the BS</span>
          <button class="jargon-container-close" title="Close">&#x2715;</button>
        </div>
        <div class="jargon-container-divider"></div>
        <div class="jargon-container-body">
          <div id="jargon-floating-summarize-btn">
            <span class="jargon-summarize-label">Summarize</span>
          </div>
          <div id="jargon-floating-btn">
            <svg class="jargon-mic" width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
              <path d="M159.071 32.3516C202.253 32.3517 237.259 67.3578 237.259 110.539C237.259 153.721 202.253 188.726 159.071 188.727H150.982V226.473C150.781 226.443 21.5693 207.523 21.5693 110.539C21.5695 67.3577 56.5754 32.3516 99.7568 32.3516H159.071ZM105 60C99.5 56.0002 92.6836 56.3169 81.5 65.5C77.4943 68.8806 64.7663 79.0258 56 86C47.1642 93.0436 39.0511 100.171 38.5 101C33.5 107 36.12 111.323 37.5 114.5C39.9868 120.025 47.7532 123.107 53 120C56.5195 117.925 65.7974 111.716 78.5 101.5C88.0007 93.8607 88.4974 93.5018 88.5 93.5C88.4982 93.5033 87.7941 94.8353 86.5 99C84.6337 105.006 82.981 111.356 82.7031 113.083C81.5007 121 87.4059 130.083 93 132.5C98.0384 134.778 102.538 134.456 116 127C122.627 123.337 130.754 118.949 134 117.5C140.145 114.671 153.912 109 155.5 109C155.5 109 156.861 110.525 159 121.5C160.172 127.576 161.602 133.569 162.5 135.5C165.468 142.196 172 149.5 180.12 151.21C186.411 152.534 191.697 151.14 199.5 147C206.335 143.342 212.937 139.5 215.5 135C218.386 129.933 216.26 123.829 213.5 121C209.5 117 206.659 116.89 203 117.5C200 118 198.899 118.754 194 122C188.545 125.658 186.5 126 186 125.5C185.992 125.486 184.737 123.362 183.5 116C180.532 99.088 177.677 90.7652 172.5 86C167.878 81.7211 158.544 79.8605 151.5 82C145.494 83.7922 137.804 87.0632 126 93C119.451 96.2376 113.515 98.9932 113.5 99C113.505 98.9862 114.243 97.038 115 93C116.5 85.0001 117 83 116 78C116 76.3043 114.07 72.995 112.481 71.7539C110.62 70.235 109.791 69.0584 109.31 68.0635C109.309 66.0628 106.965 61.4294 105 60Z"/>
            </svg>
            <svg class="jargon-stop" width="20" height="20" viewBox="0 0 24 24" fill="none" style="display:none">
              <circle cx="12" cy="12" r="12" fill="white"/>
              <rect x="8" y="8" width="8" height="8" fill="#ff1a1a" rx="1.5"/>
            </svg>
            <span class="jargon-btn-label">Translate the BS</span>
          </div>
        </div>
      </div>
    `;

    const btn = shadow.getElementById('jargon-floating-btn');
    btn.addEventListener('click', toggleListening);

    const sumBtn = shadow.getElementById('jargon-floating-summarize-btn');
    sumBtn.addEventListener('click', summarizeSession);

    const closeBtn = shadow.querySelector('.jargon-container-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      host.remove();
    });

    window._jargonShadow = shadow;
    document.body.appendChild(host);
    updateButtonUI();
  }

  // Store on window so it persists across re-injections
  window._jargonCreateUI = createFloatingUI;

  // ─── Toggle Listening ──────────────────────────────────────────────────

  function toggleListening() {
    if (window._jargonListening) {
      window._jargonListening = false;
      window._jargonHasSession = true;
      updateButtonUI();
      chrome.runtime.sendMessage({ type: 'STOP_LISTENING' });
      return;
    }

    // Check usage limits
    chrome.storage.local.get(['usageCount', 'isPremium'], (data) => {
      const isPremium = data.isPremium || false;
      const count = data.usageCount || 0;

      if (!isPremium && count >= 3) {
        window.open(chrome.runtime.getURL('upgrade/upgrade.html'), '_blank');
        return;
      }

      if (!isPremium) {
        chrome.storage.local.set({ usageCount: count + 1 });
      }

      window._jargonListening = true;
      updateButtonUI();
      chrome.storage.local.set({ sessionTranslations: [] });
      chrome.runtime.sendMessage({ type: 'START_LISTENING' });
    });
  }

  // ─── Button State ──────────────────────────────────────────────────────

  function updateButtonUI() {
    const root = window._jargonShadow || document;
    const btn = root.getElementById('jargon-floating-btn');
    const sumBtn = root.getElementById('jargon-floating-summarize-btn');
    if (!btn) return;
    const mic   = btn.querySelector('.jargon-mic');
    const stop  = btn.querySelector('.jargon-stop');
    const label = btn.querySelector('.jargon-btn-label');
    if (window._jargonListening) {
      btn.classList.add('listening');
      mic.style.display  = 'none';
      stop.style.display = 'block';
      label.textContent  = 'Stop Translating';
      if (sumBtn) sumBtn.style.display = 'none';
    } else {
      btn.classList.remove('listening');
      mic.style.display  = 'block';
      stop.style.display = 'none';
      label.textContent  = 'Translate the BS';
      if (sumBtn) sumBtn.style.display = window._jargonHasSession ? 'flex' : 'none';
    }
  }

  // ─── Listen for state changes from service worker ──────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'UI_STATE') {
      window._jargonListening = msg.isListening;
      if (msg.isListening) window._jargonHasSession = true;
      updateButtonUI();
    }
  });

  // ─── Summarize ─────────────────────────────────────────────────────────

  async function summarizeSession() {
    const root = window._jargonShadow || document;
    const btn = root.getElementById('jargon-floating-summarize-btn');
    if (btn) {
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
      btn.querySelector('.jargon-summarize-label').textContent = 'Summarizing…';
    }

    chrome.storage.local.get(['sessionTranslations'], async (resObj) => {
      const translations = resObj.sessionTranslations || [];
      if (translations.length === 0) {
        if (btn) {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.querySelector('.jargon-summarize-label').textContent = 'Summarize';
        }
        showSummaryCard('Nothing to summarize — no jargon was detected this session.');
        return;
      }

      try {
        const data = await chrome.runtime.sendMessage({ type: 'SUMMARIZE', translations });
        if (btn) {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.querySelector('.jargon-summarize-label').textContent = 'Summarize';
        }
        if (data?.summary) {
          showSummaryCard(data.summary);
        } else {
          showSummaryCard('Summary failed: ' + (data?.error || 'empty response'));
        }
      } catch (e) {
        if (btn) {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.querySelector('.jargon-summarize-label').textContent = 'Summarize';
        }
        showSummaryCard('Summary error: ' + e.message);
      }
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getThemeClass() {
    try {
      const bgColor = window.getComputedStyle(document.body).backgroundColor;
      const rgbMatch = bgColor.match(/\d+/g);
      if (rgbMatch && rgbMatch.length >= 3) {
        if (rgbMatch.length === 4 && parseFloat(rgbMatch[3]) === 0) return 'jargon-theme-light';
        const r = parseInt(rgbMatch[0], 10);
        const g = parseInt(rgbMatch[1], 10);
        const b = parseInt(rgbMatch[2], 10);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128 ? 'jargon-theme-light' : 'jargon-theme-dark';
      }
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'jargon-theme-dark' : 'jargon-theme-light';
  }

  function showSummaryCard(summary) {
    const existing = document.getElementById('jargon-summary-card');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = 'jargon-summary-card';
    card.className = `jargon-summary-card ${getThemeClass()}`;
    card.innerHTML = `
      <div class="jargon-toast-top" style="margin-bottom: 8px;">
        <svg class="jargon-toast-icon" width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
          <path d="M159.071 32.3516C202.253 32.3517 237.259 67.3578 237.259 110.539C237.259 153.721 202.253 188.726 159.071 188.727H150.982V226.473C150.781 226.443 21.5693 207.523 21.5693 110.539C21.5695 67.3577 56.5754 32.3516 99.7568 32.3516H159.071ZM105 60C99.5 56.0002 92.6836 56.3169 81.5 65.5C77.4943 68.8806 64.7663 79.0258 56 86C47.1642 93.0436 39.0511 100.171 38.5 101C33.5 107 36.12 111.323 37.5 114.5C39.9868 120.025 47.7532 123.107 53 120C56.5195 117.925 65.7974 111.716 78.5 101.5C88.0007 93.8607 88.4974 93.5018 88.5 93.5C88.4982 93.5033 87.7941 94.8353 86.5 99C84.6337 105.006 82.981 111.356 82.7031 113.083C81.5007 121 87.4059 130.083 93 132.5C98.0384 134.778 102.538 134.456 116 127C122.627 123.337 130.754 118.949 134 117.5C140.145 114.671 153.912 109 155.5 109C155.5 109 156.861 110.525 159 121.5C160.172 127.576 161.602 133.569 162.5 135.5C165.468 142.196 172 149.5 180.12 151.21C186.411 152.534 191.697 151.14 199.5 147C206.335 143.342 212.937 139.5 215.5 135C218.386 129.933 216.26 123.829 213.5 121C209.5 117 206.659 116.89 203 117.5C200 118 198.899 118.754 194 122C188.545 125.658 186.5 126 186 125.5C185.992 125.486 184.737 123.362 183.5 116C180.532 99.088 177.677 90.7652 172.5 86C167.878 81.7211 158.544 79.8605 151.5 82C145.494 83.7922 137.804 87.0632 126 93C119.451 96.2376 113.515 98.9932 113.5 99C113.505 98.9862 114.243 97.038 115 93C116.5 85.0001 117 83 116 78C116 76.3043 114.07 72.995 112.481 71.7539C110.62 70.235 109.791 69.0584 109.31 68.0635C109.309 66.0628 106.965 61.4294 105 60Z"/>
        </svg>
        <div class="jargon-toast-original">Session Summary</div>
        <div class="jargon-summary-actions" style="margin-left: auto;">
          <button class="jargon-summary-copy" title="Copy to clipboard">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
          <button class="jargon-summary-close" title="Dismiss">&#x2715;</button>
        </div>
      </div>
      <div class="jargon-toast-divider"></div>
      <div class="jargon-toast-translation jargon-summary-body" style="border-top: none; padding-top: 0;">${escapeHtml(summary).replace(/\n/g, '<br>')}</div>
    `;

    card.querySelector('.jargon-summary-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(summary).then(() => {
        const copyBtn = card.querySelector('.jargon-summary-copy');
        copyBtn.textContent = '\u2713 Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      });
    });

    card.querySelector('.jargon-summary-close').addEventListener('click', () => {
      card.classList.add('fade-out');
      card.addEventListener('animationend', () => card.remove());
    });

    document.body.appendChild(card);
  }

  // ─── YouTube SPA re-attach ─────────────────────────────────────────────

  window.addEventListener('yt-navigate-finish', () => {
    window._jargonShadow = null;
    createFloatingUI();
  });
}

// Always re-create UI on injection (handles SPA navigations)
if (typeof window._jargonCreateUI === 'function') {
  window._jargonCreateUI();
}
