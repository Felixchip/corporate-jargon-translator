document.addEventListener('DOMContentLoaded', () => {
  const tweetBtn = document.getElementById('tweet-btn');
  const tweetUrlInput = document.getElementById('tweet-url');
  const verifyBtn = document.getElementById('verify-btn');
  const errorMessage = document.getElementById('error-message');
  
  const mainState = document.getElementById('main-state');
  const successState = document.getElementById('success-state');

  const tweetText = "installed the extension by @misterxchip that translates corporate jargon into what people actually mean, live, during meetings.\nit has not been kind to my manager.";
  
  const linkedinText = `Sat through another meeting today where someone said "let's circle back and align before we move the needle."
Translation: we're not doing this, and nobody's actually agreed on anything.
Found an extension that does this translation live, during meetings, so I've stopped having to do it in my head.`;

  tweetBtn.addEventListener('click', () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank');
  });

  const linkedinBtn = document.getElementById('linkedin-btn');
  linkedinBtn.addEventListener('click', () => {
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(linkedinText)}`;
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
    // Basic regex to check for x.com, twitter.com, or linkedin.com URLs
    const regex = /^https?:\/\/(www\.)?((x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+|linkedin\.com\/(feed\/update\/urn:li:activity:\d+|posts\/[A-Za-z0-9_-]+|in\/[A-Za-z0-9_-]+\/recent-activity))/i;
    
    // For a simpler and more forgiving check since LinkedIn URLs vary wildly:
    const isSocialLink = /^https?:\/\/(www\.)?(x\.com|twitter\.com|linkedin\.com)\/.+/i;

    if (isSocialLink.test(val)) {
      // Valid tweet/post URL! Unlock premium.
      chrome.storage.local.set({ isPremium: true }, () => {
        // Transition UI to success
        mainState.style.display = 'none';
        successState.style.display = 'flex';
      });
    } else {
      // Invalid URL
      errorMessage.textContent = 'Please enter a valid X (Twitter) or LinkedIn URL.';
      errorMessage.style.display = 'block';
    }
  });
});
