# Chrome Web Store Listing — Cut the BS

> Last Updated: 2026-06-21

---

## Store Listing

**Extension Name** [REQUIRED]
Cut the BS

**Short Description** [REQUIRED]
Real-time corporate jargon translator. Click the icon, speak, and watch the BS get decoded — live, on any page.

**Detailed Description** [REQUIRED]

Cut the BS listens to your meetings and instantly translates corporate nonsense into plain English — live, right on the page you're looking at.

HOW IT WORKS

Click the extension icon on any tab to activate the floating widget. Hit "Translate the BS" and speak (or let your meeting play). The extension uses your microphone to capture speech, detects corporate jargon in real time, and displays plain-English translations as toast notifications on screen. Translations are broadcast to all open tabs so you can see results even when screen-sharing or switching windows.

KEY FEATURES

Real-time speech recognition using Chrome's built-in Web Speech API — no third-party recording
Instant jargon detection and plain-English translation
Floating widget that works on any website including Google Meet, Zoom web, Microsoft Teams, and Slack
Translation cards shown as non-intrusive overlays — no pop-ups, no tab switching
End-of-session summary: see everything that was decoded in a single readable digest
Free tier with limited daily translations; upgrade for unlimited use
Fully isolated widget using Shadow DOM — zero interference with any website's own layout

HOW TO USE

1. Navigate to any tab where a meeting or jargon-heavy document is open
2. Click the Cut the BS icon in your Chrome toolbar
3. Grant microphone access when prompted
4. Press "Translate the BS" and start speaking or let audio play
5. Watch translations appear automatically — click any card to focus the source tab
6. Press "Stop Translating" when done; click "Cut the BS" to view your full session digest

PRIVACY

Speech recognition runs on-device via Chrome's Web Speech API. Only the detected text transcript (not audio) is sent to our server to identify jargon — it is processed and discarded immediately, never stored. Usage count and premium status are stored locally on your device only. We collect no personal data and use no analytics or tracking.

For questions or support, email support@corporatejargontranslator.com.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Listens to speech on any web page and translates corporate jargon phrases into plain English in real time.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128x128 PNG | READY | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280x800 or 640x400 | READY | store-assets/screenshot-1.png |
| Screenshot 2 [RECOMMENDED] | 1280x800 or 640x400 | READY | store-assets/screenshot-2.png |
| Screenshot 3 [RECOMMENDED] | 1280x800 or 640x400 | NEEDED | store-assets/screenshot-3.png |
| Small Promo Tile [RECOMMENDED] | 440x280 | READY | store-assets/promo-small.png |
| Marquee Promo Tile | 1400x560 | NEEDED | store-assets/promo-marquee.png |

### Screenshot Notes

- Screenshot 1: The floating widget ("Cut the BS" header + "Translate the BS" button) visible
  in the bottom-right corner of a Google Meet or similar meeting page. Shows idle state.
- Screenshot 2: A translation toast card appearing over a corporate-looking web page, showing
  a jargon phrase and its plain-English equivalent.
- Screenshot 3: The session summary ("Cut the BS" digest) showing multiple decoded phrases
  from a session in a clean overlay.

NOTE: Screenshots must be exactly 1280x800 px. Use a screen recording tool set to that
resolution, or crop precisely — the CWS rejects images that are not the exact required size.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Stores the user's usage count (for free-tier limits) and premium status locally on the device using chrome.storage.local. No data is synced off-device. |
| scripting | permissions | Injects the floating translation widget (content.js) and its stylesheet (content.css) into the active tab when the user clicks the extension icon. The widget cannot be displayed without this permission. |
| activeTab | permissions | Grants access to the currently active tab when the user explicitly clicks the extension icon, so the widget can be injected into that specific tab. |
| tabs | permissions | Used in the service worker to query all open tabs and forward translation results to each tab's receiver script, so translation toasts appear on every open page simultaneously (useful when screen-sharing a different tab during a meeting). |
| *://*/* | host_permissions | The extension must inject its content script and broadcast translation toasts to any website the user might have open during a meeting — including Google Meet, Microsoft Teams (web), Slack, Zoom (web), and any internal corporate tools. Restricting to specific domains would prevent the extension from working on any unlisted platform. |

---

## Privacy & Data Use

### Data Collection

Does the extension collect user data? Yes — limited, as described below.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications (speech transcript text) | Yes | Yes — sent to our HTTPS server; discarded after response | Identifying jargon and returning plain-English translations | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity (usage count) | Yes — integer count | No — stored locally only | Enforcing the free-tier usage limit | No |
| Website content | No | No | — | No |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

ACTION REQUIRED: Host store-assets/privacy-policy.html at a publicly accessible URL before
submitting. Recommended: GitHub Pages.

Example URL: https://<yourname>.github.io/corporate-jargon-translator/privacy-policy

---

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free (with optional in-extension upgrade for unlimited translations)

---

## Developer Info

**Publisher Name** [REQUIRED]
Felix Obinna

**Contact Email** [REQUIRED]
support@corporatejargontranslator.com

**Support URL / Email** [RECOMMENDED]
support@corporatejargontranslator.com

**Homepage URL** [RECOMMENDED]
[Add if you have a landing page]

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-06-21 | Initial release. Premium Upgrade Wall, Shadow DOM isolation fixes, tabs permission for multi-tab toast broadcasting, and floating widget with close button. | Draft |

---

## Pre-Submission Checklist

- [x] manifest_version: 3
- [x] All icon files exist at correct sizes (16px, 48px, 128px)
- [x] tabs permission declared (used by service-worker.js chrome.tabs.query)
- [x] activeTab used correctly (triggered only by user clicking extension icon)
- [x] No eval() or inline scripts in extension pages
- [x] Service worker uses no module-level mutable state
- [x] No inline event handlers in HTML
- [x] All async operations have error handling
- [x] return true in all onMessage listeners with async responses
- [ ] Privacy policy hosted at a live, public URL — fill in URL above
- [x] At least 1 screenshot at 1280x800 or 640x400 added to store-assets/
- [x] Publisher name filled in above
- [ ] Store listing copy pasted into Chrome Developer Dashboard
- [ ] Data use disclosure form filled out in Chrome Developer Dashboard
- [x] ZIP created using package-extension.sh (excludes .git, store-assets, .DS_Store)
- [ ] ZIP tested by loading unpacked in Chrome — all features work
- [ ] ZIP uploaded to Chrome Developer Dashboard

---

## Review Notes

### Known Limitations

- The extension requires microphone permission on first use. On restricted pages (chrome://
  pages, extension pages), the widget appears but mic input is unavailable — expected behaviour.
- The Web Speech API requires an internet connection; offline use is not supported.
- The free-tier usage limit is stored in chrome.storage.local. Clearing extension data resets
  the counter.

### Rejection History

No submissions yet.
