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

  function showToast(original, translation) {
    const container = ensureToastContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'jargon-toast';
    toast.innerHTML = `
      <div class="jargon-toast-top">
        <svg class="jargon-toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.85 1.58 5.37 4.02 6.96-.34 1.55-1.52 3.14-1.63 3.29-.12.16-.14.37-.05.54.09.18.27.29.47.29 2.58 0 4.63-1.34 5.6-2.18.51.06 1.04.1 1.59.1 5.52 0 10-3.92 10-8.75S17.52 2 12 2zm-4 9.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
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
        showToast(tr.original, tr.translation);
      });
      sendResponse({ success: true });
    }
  });

  // Re-attach UI if YouTube SPA navigation wipes out the body
  window.addEventListener('yt-navigate-finish', () => {
    ensureToastContainer();
  });
})();
