let isListening = false;
let toastContainer = null;
let floatingBtn = null;

function createFloatingUI() {
  toastContainer = document.createElement('div');
  toastContainer.id = 'jargon-toast-container';
  document.body.appendChild(toastContainer);

  floatingBtn = document.createElement('div');
  floatingBtn.id = 'jargon-floating-btn';
  floatingBtn.innerHTML = `
    <svg class="jargon-mic" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
    <svg class="jargon-stop" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display:none">
      <rect x="6" y="6" width="12" height="12" rx="2"/>
    </svg>
  `;
  floatingBtn.addEventListener('click', toggleListening);
  document.body.appendChild(floatingBtn);
}

function toggleListening() {
  isListening = !isListening;
  updateButtonUI();
  chrome.runtime.sendMessage({
    type: isListening ? 'START_LISTENING' : 'STOP_LISTENING'
  });
}

function updateButtonUI() {
  const mic = floatingBtn.querySelector('.jargon-mic');
  const stop = floatingBtn.querySelector('.jargon-stop');
  if (isListening) {
    floatingBtn.classList.add('listening');
    mic.style.display = 'none';
    stop.style.display = 'block';
  } else {
    floatingBtn.classList.remove('listening');
    mic.style.display = 'block';
    stop.style.display = 'none';
  }
}

function showToast(original, translation) {
  const toast = document.createElement('div');
  toast.className = 'jargon-toast';
  toast.innerHTML = `
    <div class="jargon-toast-original">${escapeHtml(original)}</div>
    <div class="jargon-toast-translation">${escapeHtml(translation)}</div>
  `;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 8000);

  while (toastContainer.children.length > 5) {
    toastContainer.firstChild.remove();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_TOAST') {
    showToast(msg.original, msg.translation);
  }
  if (msg.type === 'UI_STATE') {
    isListening = msg.isListening;
    updateButtonUI();
  }
});

createFloatingUI();
