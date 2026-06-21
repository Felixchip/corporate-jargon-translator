document.addEventListener('DOMContentLoaded', () => {
  const tweetBtn = document.getElementById('tweet-btn');
  const tweetUrlInput = document.getElementById('tweet-url');
  const verifyBtn = document.getElementById('verify-btn');
  const errorMessage = document.getElementById('error-message');
  
  const mainState = document.getElementById('main-state');
  const successState = document.getElementById('success-state');

  const tweetText = "installed the extension by @misterxchip that translates corporate jargon into what people actually mean, live, during meetings.\nit has not been kind to my manager.";
  
  tweetBtn.addEventListener('click', () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank');
  });

  tweetUrlInput.addEventListener('input', () => {
    errorMessage.style.display = 'none';
    const val = tweetUrlInput.value.trim();
    if (val.length > 0) {
      verifyBtn.disabled = false;
    } else {
      verifyBtn.disabled = true;
    }
  });

  verifyBtn.addEventListener('click', () => {
    const val = tweetUrlInput.value.trim();
    // Basic regex to check if it's a valid x.com or twitter.com status URL
    const regex = /^https?:\/\/(www\.)?(x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+/i;
    
    if (regex.test(val)) {
      // Valid tweet URL! Unlock premium.
      chrome.storage.local.set({ isPremium: true }, () => {
        // Transition UI to success
        mainState.style.display = 'none';
        successState.style.display = 'flex';
      });
    } else {
      // Invalid URL
      errorMessage.textContent = 'Please enter a valid X (Twitter) status URL.';
      errorMessage.style.display = 'block';
    }
  });
});
