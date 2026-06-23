// receiver.js — Automatically injected into all tabs.
// Listens for BROADCAST_TOAST messages and renders the UI.

(function() {
  if (window._jargonReceiverInitialised) return;
  window._jargonReceiverInitialised = true;

  function ensureToastContainer() {
    let container = document.getElementById('jargon-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'jargon-toast-container';
      document.body.appendChild(container);
    }
    return container;
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
        // Ignore fully transparent backgrounds (assume white/light)
        if (rgbMatch.length === 4 && parseFloat(rgbMatch[3]) === 0) {
          return 'jargon-theme-light';
        }
        const r = parseInt(rgbMatch[0], 10);
        const g = parseInt(rgbMatch[1], 10);
        const b = parseInt(rgbMatch[2], 10);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128 ? 'jargon-theme-light' : 'jargon-theme-dark';
      }
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'jargon-theme-dark' 
      : 'jargon-theme-light';
  }

  function showToast(original, translation, sourceTabId) {
    const container = ensureToastContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `jargon-toast ${getThemeClass()}`;
    
    if (sourceTabId) {
      toast.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'FOCUS_TAB', tabId: sourceTabId });
      });
    }

    toast.innerHTML = `
      <div class="jargon-toast-top">
        <svg class="jargon-toast-icon" width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
          <path d="M159.071 32.3516C202.253 32.3517 237.259 67.3578 237.259 110.539C237.259 153.721 202.253 188.726 159.071 188.727H150.982V226.473C150.781 226.443 21.5693 207.523 21.5693 110.539C21.5695 67.3577 56.5754 32.3516 99.7568 32.3516H159.071ZM105 60C99.5 56.0002 92.6836 56.3169 81.5 65.5C77.4943 68.8806 64.7663 79.0258 56 86C47.1642 93.0436 39.0511 100.171 38.5 101C33.5 107 36.12 111.323 37.5 114.5C39.9868 120.025 47.7532 123.107 53 120C56.5195 117.925 65.7974 111.716 78.5 101.5C88.0007 93.8607 88.4974 93.5018 88.5 93.5C88.4982 93.5033 87.7941 94.8353 86.5 99C84.6337 105.006 82.981 111.356 82.7031 113.083C81.5007 121 87.4059 130.083 93 132.5C98.0384 134.778 102.538 134.456 116 127C122.627 123.337 130.754 118.949 134 117.5C140.145 114.671 153.912 109 155.5 109C155.5 109 156.861 110.525 159 121.5C160.172 127.576 161.602 133.569 162.5 135.5C165.468 142.196 172 149.5 180.12 151.21C186.411 152.534 191.697 151.14 199.5 147C206.335 143.342 212.937 139.5 215.5 135C218.386 129.933 216.26 123.829 213.5 121C209.5 117 206.659 116.89 203 117.5C200 118 198.899 118.754 194 122C188.545 125.658 186.5 126 186 125.5C185.992 125.486 184.737 123.362 183.5 116C180.532 99.088 177.677 90.7652 172.5 86C167.878 81.7211 158.544 79.8605 151.5 82C145.494 83.7922 137.804 87.0632 126 93C119.451 96.2376 113.515 98.9932 113.5 99C113.505 98.9862 114.243 97.038 115 93C116.5 85.0001 117 83 116 78C116 76.3043 114.07 72.995 112.481 71.7539C110.62 70.235 109.791 69.0584 109.31 68.0635C109.309 66.0628 106.965 61.4294 105 60Z"/>
        </svg>
        <div class="jargon-toast-original">${escapeHtml(original)}</div>
      </div>
      <div class="jargon-toast-divider"></div>
      <div class="jargon-toast-translation">${escapeHtml(translation)}</div>
    `;
    container.appendChild(toast);

    // Auto-remove after 8 seconds with a fade-out animation
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', (e) => {
        if (e.animationName === 'jargon-fade-out') {
          toast.remove();
        }
      });
    }, 8000);

    while (container.children.length > 5) {
      container.firstChild.remove();
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'BROADCAST_TOAST') {
      message.translations.forEach(tr => {
        if (!tr || !tr.original || !tr.translation) return;
        showToast(tr.original, tr.translation, message.sourceTabId);
      });
      sendResponse({ success: true });
    }
  });

  // Re-attach UI if YouTube SPA navigation wipes out the body
  window.addEventListener('yt-navigate-finish', () => {
    ensureToastContainer();
  });
})();
