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

// ============================================================================
// TAB NAVIGATION BY RECENCY
// ============================================================================

/*
 * Tab Manager Chrome Extension
 * Created by: Steve Souza
 *
 * This is an experimental learning project.
 * Can be removed at any time.
 */

// Navigation state per window
const navigationState = new Map();

/**
 * Gets all tabs sorted by lastAccessed (most recent first).
 * Returns array of tabs sorted descending by lastAccessed timestamp.
 */
async function getTabsSortedByRecency(windowId) {
  const tabs = await chrome.tabs.query({ windowId: windowId });
  return tabs.sort((a, b) => {
    const timeA = a.lastAccessed || 0;
    const timeB = b.lastAccessed || 0;
    return timeB - timeA; // Descending (newest first)
  });
}

/**
 * Finds the index of a tab ID in the sorted array.
 */
function findTabIndex(sortedTabs, tabId) {
  return sortedTabs.findIndex(tab => tab.id === tabId);
}

/**
 * Gets or initializes navigation state for a window.
 */
function getNavigationState(windowId) {
  if (!navigationState.has(windowId)) {
    navigationState.set(windowId, {
      sortedTabs: [],
      currentPosition: 0,
      lastUpdateTime: 0
    });
  }
  return navigationState.get(windowId);
}

/**
 * Resets navigation state (called on manual tab switch or timeout).
 */
function resetNavigationState(windowId) {
  console.log('[Tab Manager] Resetting navigation state for window:', windowId);
  navigationState.delete(windowId);
}

// Listen for manual tab activations to reset navigation
chrome.tabs.onActivated.addListener((activeInfo) => {
  const state = navigationState.get(activeInfo.windowId);
  if (state) {
    // Check if this activation was from our navigation (within 500ms)
    const timeSinceUpdate = Date.now() - state.lastUpdateTime;
    if (timeSinceUpdate > 500) {
      // Manual tab switch - reset state
      resetNavigationState(activeInfo.windowId);
    }
  }
});

/**
 * TOGGLE COMMAND - Switch to 2nd most recent tab.
 */
async function handleToggleRecent(windowId) {
  const sortedTabs = await getTabsSortedByRecency(windowId);

  if (sortedTabs.length < 2) {
    return; // Need at least 2 tabs
  }

  // Activate 2nd most recent tab (index 1)
  await chrome.tabs.update(sortedTabs[1].id, { active: true });
}

/**
 * BACK COMMAND - Navigate to older tab in sorted list.
 */
async function handleNavigateBack(windowId) {
  console.log('[Tab Manager] handleNavigateBack called for window:', windowId);

  const state = getNavigationState(windowId);
  const currentTime = Date.now();

  // Initialize or refresh sorted tabs if state is empty or stale (>30 seconds)
  if (state.sortedTabs.length === 0 || (currentTime - state.lastUpdateTime) > 30000) {
    console.log('[Tab Manager] Initializing navigation state');
    state.sortedTabs = await getTabsSortedByRecency(windowId);

    // Find current active tab
    const activeTabs = await chrome.tabs.query({ active: true, windowId: windowId });
    if (activeTabs.length === 0) {
      console.log('[Tab Manager] No active tab found, returning');
      return;
    }

    state.currentPosition = findTabIndex(state.sortedTabs, activeTabs[0].id);
    console.log('[Tab Manager] Initial position:', state.currentPosition, 'Total tabs:', state.sortedTabs.length);
  }

  // Move to next position (older tab)
  const nextPosition = state.currentPosition + 1;
  console.log('[Tab Manager] Current position:', state.currentPosition, 'Next position:', nextPosition, 'Total:', state.sortedTabs.length);

  if (nextPosition >= state.sortedTabs.length) {
    console.log('[Tab Manager] Already at oldest tab, returning');
    return; // Already at oldest tab
  }

  // Update position and timestamp
  state.currentPosition = nextPosition;
  state.lastUpdateTime = currentTime;

  const targetTab = state.sortedTabs[nextPosition];
  console.log('[Tab Manager] Activating tab at position:', nextPosition, 'Tab ID:', targetTab.id, 'Title:', targetTab.title);
  await chrome.tabs.update(targetTab.id, { active: true });
}

/**
 * FORWARD COMMAND - Navigate to newer tab in sorted list.
 */
async function handleNavigateForward(windowId) {
  console.log('[Tab Manager] handleNavigateForward called for window:', windowId);

  const state = getNavigationState(windowId);

  // Can't go forward if we haven't navigated back yet
  if (state.sortedTabs.length === 0 || state.currentPosition === 0) {
    console.log('[Tab Manager] Already at newest position or no navigation state');
    return;
  }

  // Move to previous position (newer tab)
  const prevPosition = state.currentPosition - 1;
  console.log('[Tab Manager] Current position:', state.currentPosition, 'Previous position:', prevPosition);

  if (prevPosition < 0) {
    console.log('[Tab Manager] Already at newest tab, returning');
    return; // Already at newest tab
  }

  // Update position and timestamp
  state.currentPosition = prevPosition;
  state.lastUpdateTime = Date.now();

  const targetTab = state.sortedTabs[prevPosition];
  console.log('[Tab Manager] Activating tab at position:', prevPosition, 'Tab ID:', targetTab.id, 'Title:', targetTab.title);
  await chrome.tabs.update(targetTab.id, { active: true });
}

/**
 * GO-TO-SLOT COMMAND - Activate the tab pinned to slot N, or reopen by URL if closed.
 *
 * Slots are stored in chrome.storage.sync under the 'pinnedSlots' key as
 * { "1": { url, title, pinnedAt }, "2": ... }. Empty slots are no-ops.
 * If the tab is in a different window, the window is focused first.
 */
async function handleGotoSlot(slotNumber, currentWindowId) {
  const { pinnedSlots = {} } = await chrome.storage.sync.get('pinnedSlots');
  const entry = pinnedSlots[String(slotNumber)];
  if (!entry || !entry.url) {
    console.log('[Tab Manager] Slot', slotNumber, 'is empty');
    return;
  }

  const matches = await chrome.tabs.query({ url: entry.url });
  if (matches.length > 0) {
    matches.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    const target = matches[0];
    if (target.windowId !== currentWindowId) {
      await chrome.windows.update(target.windowId, { focused: true });
    }
    await chrome.tabs.update(target.id, { active: true });
  } else {
    await chrome.tabs.create({ url: entry.url, active: true });
  }
}

/**
 * Command listener - Routes keyboard shortcuts to handlers.
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[Tab Manager] Command received:', command);

  // Get current focused window
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  const currentWindow = windows.find(w => w.focused);
  console.log('[Tab Manager] Focused window:', currentWindow?.id);

  if (!currentWindow) {
    console.log('[Tab Manager] No focused window found, returning');
    return; // No focused window
  }

  switch (command) {
    case 'toggle-recent-tab':
      console.log('[Tab Manager] Calling handleToggleRecent');
      await handleToggleRecent(currentWindow.id);
      break;
    case 'navigate-tab-back':
      console.log('[Tab Manager] Calling handleNavigateBack');
      await handleNavigateBack(currentWindow.id);
      break;
    case 'navigate-tab-forward':
      console.log('[Tab Manager] Calling handleNavigateForward');
      await handleNavigateForward(currentWindow.id);
      break;
    case 'goto-slot-1':
      await handleGotoSlot(1, currentWindow.id);
      break;
    case 'goto-slot-2':
      await handleGotoSlot(2, currentWindow.id);
      break;
    default:
      console.log('[Tab Manager] Unknown command:', command);
  }
});
