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
        <svg class="jargon-toast-icon" width="20" height="20" viewBox="0 0 48 48" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M18.5 6C10.4919 6 4 12.4919 4 20.5C4 38.5 28 42 28 42V35H29.5C37.5081 35 44 28.5081 44 20.5C44 12.4919 37.5081 6 29.5 6H18.5ZM24 23.5C25.3807 23.5 26.5 22.3807 26.5 21C26.5 19.6193 25.3807 18.5 24 18.5C22.6193 18.5 21.5 19.6193 21.5 21C21.5 22.3807 22.6193 23.5 24 23.5ZM34.5 21C34.5 22.3807 33.3807 23.5 32 23.5C30.6193 23.5 29.5 22.3807 29.5 21C29.5 19.6193 30.6193 18.5 32 18.5C33.3807 18.5 34.5 19.6193 34.5 21ZM16 23.5C17.3807 23.5 18.5 22.3807 18.5 21C18.5 19.6193 17.3807 18.5 16 18.5C14.6193 18.5 13.5 19.6193 13.5 21C13.5 22.3807 14.6193 23.5 16 23.5Z" />
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
