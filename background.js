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

/**
 * ============================================================================
 * GROUP METADATA TRACKING FOR RECENTLY CLOSED TABS
 * ============================================================================
 *
 * Problem: Chrome's sessions API (chrome.sessions.getRecentlyClosed) doesn't
 * include tab group information. When we restore a closed tab, we don't know
 * which group it belonged to.
 *
 * Solution: Track group metadata in background.js (runs independently of popup)
 * and store it in chrome.storage.local for persistence across browser restarts.
 *
 * Flow:
 * 1. Maintain tabGroupCache (Map) of current tab → group info
 * 2. When tab closes, save its group metadata to chrome.storage.local
 * 3. When restoring tab, popup.js looks up group info by URL+timestamp match
 * 4. If original group still exists, add restored tab to that group
 */

/**
 * Cache of current tab group states.
 * Maps tabId → {url, groupId, groupTitle, groupColor}
 * Updated whenever tabs change groups or URLs.
 */
let tabGroupCache = new Map();

/**
 * Tracks newly created tabs if they're in a group.
 */
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.groupId !== -1) {
    try {
      const group = await chrome.tabGroups.get(tab.groupId);
      tabGroupCache.set(tab.id, {
        url: tab.url,
        groupId: tab.groupId,
        groupTitle: group.title,
        groupColor: group.color
      });
    } catch (error) {
      // Group might not exist
    }
  }
});

/**
 * Updates cache when tabs change groups or URLs.
 * Fires on every tab update (URL change, group assignment, etc.)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only update cache when URL or groupId actually changes
  // This avoids false deletions from temporary ungrouped states
  if (changeInfo.url || changeInfo.groupId !== undefined) {
    if (tab.groupId !== -1) {
      try {
        const group = await chrome.tabGroups.get(tab.groupId);
        tabGroupCache.set(tabId, {
          url: tab.url,
          groupId: tab.groupId,
          groupTitle: group.title,
          groupColor: group.color
        });
      } catch (error) {
        // Group might not exist anymore
        tabGroupCache.delete(tabId);
      }
    }
    // IMPORTANT: Don't delete from cache when ungrouped!
    // When closing a tab with ×, Chrome first ungroups it, then closes it.
    // We want to keep the group info until the tab is actually removed.
  }
});

/**
 * Saves group metadata to storage when tab closes.
 * This allows us to restore tabs to their original groups.
 */
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const cachedInfo = tabGroupCache.get(tabId);
  if (cachedInfo) {
    try {
      // Store in chrome.storage.local keyed by URL+timestamp
      const stored = await chrome.storage.local.get('closedTabGroups');
      let groupMetadata = stored.closedTabGroups || {};

      // Prevent unbounded growth - keep last 100 entries
      const entries = Object.entries(groupMetadata);
      if (entries.length >= 100) {
        // Remove oldest entries
        entries.sort((a, b) => a[1].closedAt - b[1].closedAt);
        entries.splice(0, entries.length - 99);
        groupMetadata = Object.fromEntries(entries);
      }

      // Store with unique key (URL + timestamp)
      groupMetadata[`${cachedInfo.url}_${Date.now()}`] = {
        url: cachedInfo.url,
        groupId: cachedInfo.groupId,
        groupTitle: cachedInfo.groupTitle,
        groupColor: cachedInfo.groupColor,
        closedAt: Date.now()
      };

      await chrome.storage.local.set({ closedTabGroups: groupMetadata });

      // Clean up cache
      tabGroupCache.delete(tabId);
    } catch (error) {
      console.warn('Failed to store group metadata:', error);
    }
  }
});

/**
 * Initialize cache on startup.
 * Loads current tab states when service worker first loads.
 */
chrome.tabs.query({}).then(async (tabs) => {
  for (const tab of tabs) {
    if (tab.groupId !== -1) {
      try {
        const group = await chrome.tabGroups.get(tab.groupId);
        tabGroupCache.set(tab.id, {
          url: tab.url,
          groupId: tab.groupId,
          groupTitle: group.title,
          groupColor: group.color
        });
      } catch (error) {
        // Skip tabs with invalid groups
      }
    }
  }
});
