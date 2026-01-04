/*
 * Tab Manager Chrome Extension - Background Service Worker
 * Created by: Steve Souza
 *
 * This is an experimental learning project.
 * Can be removed at any time.
 *
 * WHAT IS A SERVICE WORKER?
 * Service workers run independently from the popup (even when it's closed).
 * They handle background tasks and respond to browser events.
 * In Manifest V3, service workers replace the older "background pages".
 */

/**
 * Updates the extension icon badge with current tab count.
 *
 * The badge is the small text overlay on the extension icon in Chrome's toolbar.
 * This shows users how many tabs they have without opening the popup.
 *
 * Chrome APIs used:
 * - chrome.tabs.query({}) - Gets all tabs across all windows
 * - chrome.action.setBadgeText() - Sets the badge text
 * - chrome.action.setBadgeBackgroundColor() - Sets badge background color
 */
async function updateBadge() {
  const tabs = await chrome.tabs.query({});
  chrome.action.setBadgeText({ text: String(tabs.length) });
  chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });
}

// Initialize badge when extension first loads
updateBadge();

/**
 * Event listeners keep the badge synchronized with actual tab count.
 *
 * chrome.tabs.onCreated - Fires when user opens a new tab
 * chrome.tabs.onRemoved - Fires when user closes a tab
 * chrome.windows.onFocusChanged - Fires when switching between browser windows
 *   (needed because tabs.query counts tabs across all windows)
 */
chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.windows.onFocusChanged.addListener(updateBadge);
