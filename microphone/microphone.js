document.addEventListener('DOMContentLoaded', () => {
  const allowBtn = document.getElementById('allow-btn');
  const mainState = document.getElementById('main-state');
  const successState = document.getElementById('success-state');
  const errorMessage = document.getElementById('error-message');

  allowBtn.addEventListener('click', async () => {
    errorMessage.style.display = 'none';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We got permission, stop the stream immediately so we don't leave the mic on in this tab
      stream.getTracks().forEach(track => track.stop());
      
      // Update UI to success state
      mainState.style.display = 'none';
      successState.style.display = 'flex';
      
    } catch (err) {
      console.error('[Jargon] Microphone permission error:', err);
      errorMessage.textContent = 'Permission denied. Please click the lock icon in the address bar, allow microphone access, and try again.';
      errorMessage.style.display = 'block';
    }
  });
});
