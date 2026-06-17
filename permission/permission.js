const grantBtn = document.getElementById('grantBtn');
const status = document.getElementById('status');

grantBtn.addEventListener('click', async () => {
  grantBtn.disabled = true;
  grantBtn.textContent = 'Requesting...';
  status.textContent = '';
  status.className = 'status';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    status.textContent = 'Microphone access granted! You can close this tab and use the extension.';
    status.className = 'status success';
  } catch (e) {
    status.textContent = `Error: ${e.message}. Please allow mic access and try again.`;
    status.className = 'status error';
    grantBtn.disabled = false;
    grantBtn.textContent = 'Retry';
  }
});

// Check if permission is already granted
navigator.permissions.query({ name: 'microphone' }).then((result) => {
  if (result.state === 'granted') {
    status.textContent = 'Microphone access already granted. You can close this tab.';
    status.className = 'status success';
    grantBtn.style.display = 'none';
  }
});
