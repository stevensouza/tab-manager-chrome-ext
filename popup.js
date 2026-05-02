/*
 * Tab Manager Chrome Extension - Main Popup Logic
 * Created by: Steve Souza
 *
 * This is an experimental learning project.
 * Can be removed at any time.
 */

/*
 * ============================================================================
 * GLOBAL STATE VARIABLES
 * ============================================================================
 * These variables maintain the application state throughout the popup's lifecycle.
 * The popup stays open while visible, but closes when user clicks elsewhere.
 */

// All tabs across all browser windows (fetched via chrome.tabs.query)
let allTabs = [];

// All tab groups across all windows (fetched via chrome.tabGroups.query)
let allGroups = [];

// Set of group IDs that are currently collapsed (accordion UI)
// Persisted to localStorage as JSON array
let collapsedGroups = new Set(
  JSON.parse(localStorage.getItem('tabManagerCollapsedGroups') || '[]')
);

// ID of the currently active tab (highlighted with blue border)
let activeTabId = null;

// Map of URL -> count for duplicate detection
// Example: { "https://github.com": 3, "https://gmail.com": 2 }
let urlCounts = {};

// Map of URL -> visit count from browser history
// Example: { "https://github.com": 42, "https://gmail.com": 156 }
let visitCounts = {};

// Current search term from the search box
let currentSearchTerm = '';

// Whether "Show Only Duplicates" toggle is active
let duplicateFilterActive = false;

// Current sort option (persisted in localStorage)
// Options: 'group-recent', 'default', 'title-asc', 'title-desc', 'url-asc', 'url-desc', 'age-newest', 'age-oldest'
// Default is 'group-recent' (groups A→Z, tabs by recent first)
let currentSortOption = 'group-recent';

// View mode: 'groups' (default) or 'all' (flat sorted list)
// Persisted to localStorage
let viewMode = localStorage.getItem('tabManagerViewMode') || 'groups';

// Recently closed tabs state
// Loaded from chrome.sessions API + group metadata from chrome.storage
let recentlyClosedTabs = [];

// Toggle state for showing/hiding recently closed tabs (persisted in localStorage)
let closedTabsVisible = localStorage.getItem('closedTabsVisible') === 'true';

// controlsCollapsed removed in v2.6 — controls are always visible now

// Favorite sites - stored in chrome.storage.sync for cross-device sync
// Each entry: {url: "https://mail.google.com", title: "Gmail", favIconUrl: "..."}
// URL is origin-only (protocol + hostname) for domain-level matching
let favoriteSites = [];

// Filter chip states (all default to false)
let audioFilterActive = false;
let pinnedFilterActive = false;
let favoritesFilterActive = false;
let oldTabsFilterActive = false;

// When true, multiple chip filters are ANDed together
// When false (default), clicking a chip deselects others (single-select mode)
let combineFiltersMode = false;

// Quick Pick slots — keyboard shortcuts jump to / reopen these URLs
// Stored in chrome.storage.sync as { "1": {url, title, pinnedAt} | null, "2": ..., up to "5" }
// Slot 1 has a default keystroke (Cmd+Shift+1); slots 2–5 are user-assigned at chrome://extensions/shortcuts
// (Chrome's manifest hard-limits 4 default keystrokes per extension and the other three are already used).
const PINNED_SLOT_COUNT = 5;
let pinnedSlots = {};
let picksFilterActive = false;

/*
 * ============================================================================
 * GROUP COLLAPSE/EXPAND HELPERS
 * ============================================================================
 */

function toggleGroupCollapse(groupId) {
  if (collapsedGroups.has(groupId)) {
    collapsedGroups.delete(groupId);
  } else {
    collapsedGroups.add(groupId);
  }
  saveCollapsedGroups();
}

function saveCollapsedGroups() {
  localStorage.setItem('tabManagerCollapsedGroups', JSON.stringify([...collapsedGroups]));
}

function collapseAllGroups() {
  allGroups.forEach(group => collapsedGroups.add(group.id));
  saveCollapsedGroups();
  renderTabs(currentSearchTerm);
}

function expandAllGroups() {
  collapsedGroups.clear();
  saveCollapsedGroups();
  renderTabs(currentSearchTerm);
}

function updateToggleAllIcon() {
  const icon = document.querySelector('.toggle-all-icon');
  if (!icon) return;
  const allCollapsed = allGroups.length > 0 && allGroups.every(g => collapsedGroups.has(g.id));
  icon.textContent = allCollapsed ? '\u25B6' : '\u25BC';
}

/*
 * ============================================================================
 * TAB ORGANIZATION
 * ============================================================================
 */

/**
 * Organizes tabs into their respective groups.
 *
 * Chrome's tab groups are identified by groupId (-1 means ungrouped).
 * This function creates a structure with:
 * - groups: Array of groups, each containing its tabs
 * - ungrouped: Array of tabs not in any group
 *
 * @param {Array} tabs - All tabs from chrome.tabs.query
 * @param {Array} groups - All groups from chrome.tabGroups.query
 * @returns {Object} Organized tabs by group
 */
function organizeTabsByGroup(tabs, groups) {
  const groupMap = new Map();
  const ungrouped = [];

  // Create group containers with metadata (id, title, color)
  groups.forEach(group => {
    groupMap.set(group.id, {
      ...group,
      tabs: []
    });
  });

  // Sort tabs into their groups or ungrouped array
  tabs.forEach(tab => {
    if (tab.groupId === -1) {
      // Chrome uses -1 to indicate "no group"
      ungrouped.push(tab);
    } else {
      const group = groupMap.get(tab.groupId);
      if (group) {
        group.tabs.push(tab);
      }
    }
  });

  return {
    groups: Array.from(groupMap.values()),
    ungrouped: ungrouped
  };
}

/**
 * Builds a map of URL -> count for duplicate detection.
 *
 * Example output: { "https://github.com": 3, "https://gmail.com": 1 }
 * URLs appearing only once won't get duplicate badges.
 *
 * @param {Array} tabs - All tabs
 * @returns {Object} Map of URL to occurrence count
 */
function buildDuplicateMap(tabs) {
  const counts = {};
  tabs.forEach(tab => {
    counts[tab.url] = (counts[tab.url] || 0) + 1;
  });
  return counts;
}

/**
 * Builds a map of URL → total visit count from Chrome history.
 * Called once per loadTabs() to minimize API overhead.
 * Handles missing permissions/failed queries gracefully (defaults to 0).
 *
 * @param {Array} tabs - Array of tabs to get visit counts for
 * @returns {Object} Map of URL -> visit count
 */
async function buildVisitCountsMap(tabs) {
  const visitCounts = {};

  // Check if history API available (may be denied permission)
  if (!chrome.history || !chrome.history.getVisits) {
    console.warn('History API not available - visit counts disabled');
    return visitCounts;
  }

  // Get unique URLs to minimize API calls
  const uniqueUrls = [...new Set(tabs.map(tab => tab.url))];

  // Fetch visit counts for each unique URL
  const promises = uniqueUrls.map(async (url) => {
    try {
      const visits = await chrome.history.getVisits({ url });
      visitCounts[url] = visits ? visits.length : 0;
    } catch (error) {
      console.warn(`Failed to get visits for ${url}:`, error);
      visitCounts[url] = 0; // Default to 0 on error
    }
  });

  // Wait for all history queries to complete
  await Promise.all(promises);

  return visitCounts;
}

/**
 * Sorts an array of tabs based on the current sort option.
 *
 * Sort options:
 * - default: No sorting (maintains group organization)
 * - title-asc/desc: Alphabetical by tab title
 * - url-asc/desc: Alphabetical by URL
 * - age-newest/oldest: By last accessed time
 *
 * @param {Array} tabs - Array of tabs to sort
 * @returns {Array} Sorted array of tabs
 */
function sortTabs(tabs) {
  if (currentSortOption === 'default') {
    return tabs; // No sorting - keep original order
  }

  const sorted = [...tabs]; // Create copy to avoid mutating original

  switch (currentSortOption) {
    case 'title-asc':
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    case 'title-desc':
      return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));

    case 'url-asc':
      return sorted.sort((a, b) => (a.url || '').localeCompare(b.url || ''));

    case 'url-desc':
      return sorted.sort((a, b) => (b.url || '').localeCompare(a.url || ''));

    case 'age-newest':
      // Newest first (highest lastAccessed timestamp)
      return sorted.sort((a, b) => {
        const timeA = a.lastAccessed || 0;
        const timeB = b.lastAccessed || 0;
        return timeB - timeA; // Descending
      });

    case 'age-oldest':
      // Oldest first (lowest lastAccessed timestamp)
      return sorted.sort((a, b) => {
        const timeA = a.lastAccessed || 0;
        const timeB = b.lastAccessed || 0;
        return timeA - timeB; // Ascending
      });

    case 'most-visited':
      // Most visited first (highest visit count)
      return sorted.sort((a, b) => {
        const visitsA = visitCounts[a.url] || 0;
        const visitsB = visitCounts[b.url] || 0;
        return visitsB - visitsA; // Descending
      });

    case 'least-visited':
      // Least visited first (lowest visit count)
      return sorted.sort((a, b) => {
        const visitsA = visitCounts[a.url] || 0;
        const visitsB = visitCounts[b.url] || 0;
        return visitsA - visitsB; // Ascending
      });

    case 'group-recent':
      // Sort by last accessed time (most recent first = descending)
      // Groups are sorted alphabetically in renderTabs()
      return sorted.sort((a, b) => {
        const timeA = a.lastAccessed || 0;
        const timeB = b.lastAccessed || 0;
        return timeB - timeA;  // Descending (most recent first)
      });

    default:
      return tabs;
  }
}

/**
 * Calculates age in minutes for a tab based on lastAccessed timestamp.
 *
 * @param {Object} tab - Chrome tab object
 * @returns {number} Age in minutes, or -1 if unknown
 */
function getTabAgeMinutes(tab) {
  if (!tab.lastAccessed) return -1;
  return (Date.now() - tab.lastAccessed) / (1000 * 60);
}

/**
 * Calculates age class for visual color-coding of tab borders.
 *
 * Color scheme (4 levels):
 * - Green (≤2 hours): Recently accessed
 * - Yellow (≤24 hours): Accessed hours ago
 * - Orange (≤1 week): Days old
 * - Red (>1 week): Very old tabs
 *
 * @param {Object} tab - Chrome tab object
 * @returns {string} CSS class: 'age-recent', 'age-hours', 'age-days', or 'age-week'
 */
function getTabAgeClass(tab) {
  const ageMinutes = getTabAgeMinutes(tab);
  if (ageMinutes < 0) return 'age-unknown';
  if (ageMinutes <= 120) return 'age-recent';      // ≤ 2 hours (green)
  if (ageMinutes <= 1440) return 'age-hours';      // ≤ 24 hours (yellow)
  if (ageMinutes <= 10080) return 'age-days';      // ≤ 1 week (orange)
  return 'age-week';                               // > 1 week (red)
}

/**
 * Formats time since last access in human-readable form.
 *
 * Examples: "Just now", "5m ago", "2h ago", "3d ago"
 *
 * @param {number} timestamp - lastAccessed timestamp (ms)
 * @returns {string} Formatted string
 */
function formatTimeSince(timestamp) {
  if (!timestamp) return 'Never accessed';

  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / (1000 * 60));

  if (ageMinutes < 1) return 'Just now';
  if (ageMinutes < 60) return `${ageMinutes}m ago`;

  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours}h ago`;

  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays}d ago`;
}

/*
 * ============================================================================
 * TAB ACTIONS (Close, Activate)
 * ============================================================================
 */

/**
 * Closes a single tab.
 *
 * IMPORTANT: event.stopPropagation() prevents the click from bubbling up
 * to the tab item, which would activate the tab before closing it.
 *
 * Button is disabled immediately to prevent accidental double-clicks
 * that could close multiple tabs.
 *
 * @param {number} tabId - Chrome tab ID to close
 * @param {Event} event - Click event from close button
 */
async function closeTab(tabId, event) {
  event.stopPropagation(); // Don't activate the tab when closing
  event.preventDefault();  // Extra safety: prevent any default behavior

  // Disable button immediately to prevent double-clicks
  if (event.target) {
    event.target.disabled = true;
  }

  try {
    // Chrome API: Remove ONLY this specific tab by ID (not duplicates)
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error('Error closing tab:', tabId, error);
  }

  // Refresh the UI to reflect changes
  await loadTabs();
}

/**
 * Closes all tabs in a group.
 *
 * Confirms with user if more than 5 tabs to prevent accidental mass closures.
 *
 * @param {number} groupId - Chrome tab group ID
 * @param {Event} event - Click event from group close button
 */
async function closeGroup(groupId, event) {
  event.stopPropagation(); // Don't toggle group filter when closing

  const tabsInGroup = allTabs.filter(tab => tab.groupId === groupId);
  const tabCount = tabsInGroup.length;

  // Confirm if closing many tabs
  if (tabCount > 5) {
    if (!confirm(`Close ${tabCount} tabs in this group?`)) return;
  }

  const tabIds = tabsInGroup.map(tab => tab.id);
  await chrome.tabs.remove(tabIds);
  await loadTabs();
}

/**
 * Activates (switches to) a tab and brings its window to front.
 *
 * Chrome APIs used:
 * - chrome.tabs.update - Makes tab active in its window
 * - chrome.windows.update - Brings window to foreground
 *
 * @param {number} tabId - Chrome tab ID to activate
 * @param {number} windowId - Chrome window ID containing the tab
 */
async function activateTab(tabId, windowId) {
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });
}

/**
 * Restores a recently closed tab using Chrome sessions API.
 *
 * Restoration flow:
 * 1. Try chrome.sessions.restore(sessionId) first (preserves more state)
 * 2. If tab had group info, check if original group still exists
 * 3. If group exists, add restored tab to that group
 * 4. If group deleted, tab stays ungrouped (graceful degradation)
 * 5. If session expired, fallback to creating new tab with URL
 *
 * IMPORTANT: event.stopPropagation() prevents click event bubbling.
 *
 * @param {Object} closedTab - Closed tab object with sessionId, url, groupInfo
 * @param {Event} event - Click event from restore button or row
 */
async function restoreClosedTab(closedTab, event) {
  event.stopPropagation();
  event.preventDefault();

  // Check if original group still exists (if tab was in a group)
  let groupExists = false;
  if (closedTab.groupInfo) {
    try {
      await chrome.tabGroups.get(closedTab.groupInfo.groupId);
      groupExists = true;
    } catch (error) {
      // Group doesn't exist anymore
      groupExists = false;
    }
  }

  // IMPORTANT: If group doesn't exist, don't use sessions.restore()
  // because it might recreate the entire group with all tabs.
  // Instead, create a new tab with just the URL.
  if (closedTab.groupInfo && !groupExists) {
    try {
      // Create new tab without using sessions API
      await chrome.tabs.create({ url: closedTab.url, active: true });
      await loadTabs();
      return;
    } catch (error) {
      console.error('Failed to restore tab as new tab:', error);
      alert('Failed to restore tab');
      return;
    }
  }

  // Group exists (or tab was ungrouped), safe to use sessions.restore()
  try {
    const session = await chrome.sessions.restore(closedTab.sessionId);

    // If tab had group info and group exists, add to that group
    if (closedTab.groupInfo && groupExists && session && session.tab) {
      const restoredTabId = session.tab.id;
      try {
        await chrome.tabs.group({
          tabIds: [restoredTabId],
          groupId: closedTab.groupInfo.groupId
        });
      } catch (groupError) {
        console.error('Failed to add restored tab to group:', groupError);
      }
    }

    await loadTabs();
  } catch (error) {
    console.error('Failed to restore tab via sessions API:', error);

    // Fallback: Create new tab with URL
    try {
      const newTab = await chrome.tabs.create({ url: closedTab.url, active: true });

      // Try to restore to group if info exists and group exists
      if (closedTab.groupInfo && groupExists && newTab) {
        try {
          await chrome.tabs.group({
            tabIds: [newTab.id],
            groupId: closedTab.groupInfo.groupId
          });
        } catch (groupError) {
          console.error('Failed to add new tab to group:', groupError);
        }
      }

      await loadTabs();
    } catch (fallbackError) {
      console.error('Fallback restoration also failed:', fallbackError);
      alert('Failed to restore tab');
    }
  }
}

/**
 * Toggles the pinned state of a tab.
 *
 * Pinned tabs:
 * - Stay at the left side of the tab bar
 * - Can't be accidentally closed
 * - Useful for frequently accessed tabs
 *
 * IMPORTANT: event.stopPropagation() prevents click from activating tab.
 *
 * @param {number} tabId - Chrome tab ID to toggle
 * @param {boolean} currentPinnedState - Current pinned state
 * @param {Event} event - Click event from pin button
 */
async function togglePinTab(tabId, currentPinnedState, event) {
  event.stopPropagation(); // Don't activate tab when toggling pin
  event.preventDefault();

  try {
    await chrome.tabs.update(tabId, { pinned: !currentPinnedState });
  } catch (error) {
    console.error('Error toggling pin state:', tabId, error);
  }

  // Refresh UI to show updated state
  await loadTabs();
}

/**
 * Toggles the muted state of a tab.
 *
 * Muted tabs:
 * - Audio is silenced but video continues playing
 * - Useful for background music/videos
 * - Can be toggled without switching to the tab
 *
 * IMPORTANT: event.stopPropagation() prevents click from activating tab.
 *
 * @param {number} tabId - Chrome tab ID to toggle
 * @param {boolean} currentMutedState - Current muted state
 * @param {Event} event - Click event from mute button
 */
async function toggleMuteTab(tabId, currentMutedState, event) {
  event.stopPropagation(); // Don't activate tab when toggling mute
  event.preventDefault();

  try {
    await chrome.tabs.update(tabId, { muted: !currentMutedState });
  } catch (error) {
    console.error('Error toggling mute state:', tabId, error);
  }

  // Refresh UI to show updated state
  await loadTabs();
}

/*
 * ============================================================================
 * RENDERING FUNCTIONS
 * ============================================================================
 */

/**
 * Renders all tabs in the UI with active filters applied.
 *
 * FILTER LOGIC (AND operation):
 * - Search filter: Tab title/URL contains search term
 * - Duplicate filter: URL appears more than once
 * - Group filter: Tab belongs to specific group
 * All active filters must match for a tab to be visible.
 *
 * SORT MODES:
 * - Per-group sorting: Tabs sorted within each group (default)
 * - Global sorting: All tabs sorted together with group badges
 *
 * AUTO-DISABLE DUPLICATE FILTER:
 * If "Show Only Duplicates" is active but no duplicates remain,
 * the filter is automatically disabled to avoid confusion.
 *
 * @param {string} searchTerm - Optional search filter
 */
function renderTabs(searchTerm = '') {
  currentSearchTerm = searchTerm;
  const tabList = document.getElementById('tabList');
  tabList.innerHTML = '';

  const organized = organizeTabsByGroup(allTabs, allGroups);
  const lowerSearch = searchTerm.toLowerCase();

  // Combined filter: Tab must match all active filters
  // Uses the shared tabMatchesFilters() which includes search, duplicates,
  // group filter, and all filter chip conditions (audio, pinned, faves, old)
  const matchesAllFilters = (tab) => {
    return tabMatchesFilters(tab);
  };

  // Check if duplicate filter should be auto-disabled
  // Only checks if any duplicates exist at all (ignores other chip filters)
  if (duplicateFilterActive) {
    const hasDupes = allTabs.some(tab => urlCounts[tab.url] > 1);
    if (!hasDupes) {
      duplicateFilterActive = false;
      const dupesChip = document.querySelector('.filter-chip[data-filter="dupes"]');
      if (dupesChip) dupesChip.classList.remove('active');
      saveChipState();
      renderTabs(searchTerm);
      return;
    }
  }

  // ENHANCEMENT: Sort groups alphabetically for group-recent mode
  if (currentSortOption === 'group-recent') {
    organized.groups.sort((a, b) => {
      // Sort groups by title (or color if untitled)
      const nameA = a.title || `${a.color} group`;
      const nameB = b.title || `${b.color} group`;
      return nameA.localeCompare(nameB);
    });
  }

  // ALL VIEW MODE: Flatten all tabs and sort globally
  if (viewMode === 'all') {
    // Collect all tabs (grouped and ungrouped) that match filters
    let allFilteredTabs = [];

    // Add grouped tabs with group metadata
    organized.groups.forEach(group => {
      const filteredTabs = group.tabs.filter(matchesAllFilters);
      filteredTabs.forEach(tab => {
        allFilteredTabs.push({
          tab: tab,
          groupId: group.id,
          groupTitle: group.title,
          groupColor: group.color
        });
      });
    });

    // Add ungrouped tabs
    const filteredUngrouped = organized.ungrouped.filter(matchesAllFilters);
    filteredUngrouped.forEach(tab => {
      allFilteredTabs.push({
        tab: tab,
        groupId: -1,
        groupTitle: null,
        groupColor: null
      });
    });

    // Sort globally
    allFilteredTabs = sortTabs(allFilteredTabs.map(item => item.tab))
      .map(tab => {
        // Find the group metadata for this tab
        return allFilteredTabs.find(item => item.tab.id === tab.id);
      });

    // Render as single flat list with group badges
    allFilteredTabs.forEach(item => {
      const tabElement = createTabElement(item.tab, item.groupColor, item.groupTitle);
      tabList.appendChild(tabElement);
    });

    // Still render pinned slots, recently closed, and favorites after the flat list
    renderPinnedSlots();
    renderRecentlyClosedTabs();
    renderFavoriteSites();
    return; // Exit early - don't use grouped rendering
  }

  // PER-GROUP SORT MODE: Render grouped tabs (default behavior)
  organized.groups.forEach(group => {
    const filteredTabs = sortTabs(group.tabs.filter(matchesAllFilters));
    const groupName = group.title || `${group.color} group`;
    const groupNameMatches = searchTerm && groupName.toLowerCase().includes(lowerSearch);

    // Skip if no matching tabs and group name doesn't match search
    if (filteredTabs.length === 0 && !groupNameMatches) return;

    // Determine collapse state (search auto-expands groups with matching tabs)
    const hasSearchOverride = searchTerm && filteredTabs.length > 0;
    const isCollapsed = collapsedGroups.has(group.id) && !hasSearchOverride;

    // Create group container
    const groupContainer = document.createElement('div');
    groupContainer.className = 'group-container';
    if (isCollapsed) {
      groupContainer.classList.add('collapsed');
    }

    // Create group header with color coding
    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';
    groupHeader.dataset.groupId = group.id;
    groupHeader.dataset.groupColor = group.color; // Used for CSS color matching

    // Collapse/expand chevron indicator
    const chevron = document.createElement('span');
    chevron.className = 'group-chevron';
    chevron.textContent = isCollapsed ? '\u25B6' : '\u25BC';
    groupHeader.appendChild(chevron);

    // Group name
    const groupNameSpan = document.createElement('span');
    groupNameSpan.className = 'group-name';
    groupNameSpan.textContent = groupName;
    groupHeader.appendChild(groupNameSpan);

    // Tab count badge (shows total tabs in group, not just filtered)
    const tabCountSpan = document.createElement('span');
    tabCountSpan.className = 'tab-count';
    tabCountSpan.textContent = ` (${group.tabs.length})`;
    groupHeader.appendChild(tabCountSpan);

    // Close button (appears on hover)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => closeGroup(group.id, e));
    groupHeader.appendChild(closeBtn);

    // Click header to toggle collapse/expand (but not when clicking close button)
    groupHeader.addEventListener('click', (e) => {
      if (e.target === closeBtn) return;
      toggleGroupCollapse(group.id);
      renderTabs(searchTerm);
    });

    groupContainer.appendChild(groupHeader);

    // Wrap tabs in group-tabs div for dotted indent rail
    const groupTabsDiv = document.createElement('div');
    groupTabsDiv.className = 'group-tabs';

    // Only render individual tabs if group is not collapsed
    if (!isCollapsed) {
      filteredTabs.forEach(tab => {
        const tabItem = createTabElement(tab);
        groupTabsDiv.appendChild(tabItem);
      });
    }

    groupContainer.appendChild(groupTabsDiv);
    tabList.appendChild(groupContainer);
  });

  // Update collapse/expand all button icon
  updateToggleAllIcon();

  // Render ungrouped tabs
  const filteredUngrouped = sortTabs(organized.ungrouped.filter(matchesAllFilters));
  if (filteredUngrouped.length > 0) {
    const ungroupedContainer = document.createElement('div');
    ungroupedContainer.className = 'ungrouped-container';

    const ungroupedHeader = document.createElement('div');
    ungroupedHeader.className = 'ungrouped-header';

    const headerText = document.createElement('span');
    headerText.textContent = 'Ungrouped Tabs';
    ungroupedHeader.appendChild(headerText);

    const tabCountSpan = document.createElement('span');
    tabCountSpan.className = 'tab-count';
    tabCountSpan.textContent = ` (${filteredUngrouped.length})`;
    ungroupedHeader.appendChild(tabCountSpan);

    ungroupedContainer.appendChild(ungroupedHeader);

    const ungroupedTabsDiv = document.createElement('div');
    ungroupedTabsDiv.className = 'group-tabs';
    filteredUngrouped.forEach(tab => {
      const tabItem = createTabElement(tab);
      ungroupedTabsDiv.appendChild(tabItem);
    });
    ungroupedContainer.appendChild(ungroupedTabsDiv);

    tabList.appendChild(ungroupedContainer);
  }

  // Render pinned slots (above recently closed)
  renderPinnedSlots();

  // Render recently closed tabs
  renderRecentlyClosedTabs();

  // Render favorite sites (always LAST - after recently closed)
  renderFavoriteSites();
}

/**
 * Renders recently closed tabs section.
 * Always appears LAST (after all groups and ungrouped).
 *
 * Section only displays if:
 * - closedTabsVisible is true (user toggled it on)
 * - recentlyClosedTabs array is not empty
 *
 * Closed tabs respect search filter (title/URL match).
 */
function renderRecentlyClosedTabs() {
  if (recentlyClosedTabs.length === 0) {
    return; // Don't render if no closed tabs
  }

  // Hide when any chip filter is active — chips filter open tabs only
  if (anyChipFilterActive()) return;

  const tabList = document.getElementById('tabList');

  // Create container
  const closedContainer = document.createElement('div');
  closedContainer.className = 'closed-tabs-container';

  // Inline clickable header with Show/Hide toggle
  const header = document.createElement('div');
  header.className = 'closed-section-header';

  const headerLeft = document.createElement('span');
  headerLeft.textContent = 'Recently Closed ';
  const countSpan = document.createElement('span');
  countSpan.className = 'tab-count';
  countSpan.textContent = '(' + recentlyClosedTabs.length + ')';
  headerLeft.appendChild(countSpan);
  header.appendChild(headerLeft);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'show-toggle';
  toggleBtn.textContent = closedTabsVisible ? 'Hide \u25B4' : 'Show \u25BE';
  toggleBtn.addEventListener('click', () => {
    closedTabsVisible = !closedTabsVisible;
    localStorage.setItem('closedTabsVisible', closedTabsVisible.toString());
    renderTabs(currentSearchTerm);
  });
  header.appendChild(toggleBtn);

  closedContainer.appendChild(header);

  // Only render tabs when visible
  if (closedTabsVisible) {
    // Apply search filter to closed tabs
    const lowerSearch = currentSearchTerm.toLowerCase();
    const matchesSearch = (tab) => {
      if (!currentSearchTerm) return true;
      const matchesTitle = tab.title.toLowerCase().includes(lowerSearch);
      const matchesUrl = tab.url.toLowerCase().includes(lowerSearch);
      const matchesGroup = tab.groupInfo &&
        (tab.groupInfo.groupTitle?.toLowerCase().includes(lowerSearch) ||
         tab.groupInfo.groupColor?.toLowerCase().includes(lowerSearch));
      return matchesTitle || matchesUrl || matchesGroup;
    };

    const filteredClosedTabs = recentlyClosedTabs.filter(matchesSearch);

    // Wrap in group-tabs div for dotted indent rail
    const groupTabsDiv = document.createElement('div');
    groupTabsDiv.className = 'group-tabs';
    filteredClosedTabs.forEach(closedTab => {
      const tabItem = createClosedTabElement(closedTab);
      groupTabsDiv.appendChild(tabItem);
    });
    closedContainer.appendChild(groupTabsDiv);
  }

  // Append at the END of tabList (after all groups/ungrouped)
  tabList.appendChild(closedContainer);
}

/**
 * Renders favorite sites section.
 * Always appears LAST (after recently closed tabs).
 *
 * Only shows favorites whose origin does NOT match any currently open tab.
 * Respects search filter (title/URL match).
 */
function renderFavoriteSites() {
  if (favoriteSites.length === 0) {
    return;
  }

  // Hide when any chip filter is active (except Favorites chip — that one should show them)
  if (anyChipFilterActive() && !favoritesFilterActive) return;

  const tabList = document.getElementById('tabList');

  // Build set of open URLs for matching
  const openUrls = new Set(allTabs.map(t => t.url));

  // Filter to only unopened favorites
  let unopenedFavorites = favoriteSites.filter(fav => !openUrls.has(fav.url));

  // Apply search filter
  if (currentSearchTerm) {
    const lowerSearch = currentSearchTerm.toLowerCase();
    unopenedFavorites = unopenedFavorites.filter(fav =>
      fav.title.toLowerCase().includes(lowerSearch) ||
      fav.url.toLowerCase().includes(lowerSearch)
    );
  }

  if (unopenedFavorites.length === 0) return;

  // Create container
  const container = document.createElement('div');
  container.className = 'favorite-sites-container';

  // Header
  const header = document.createElement('div');
  header.className = 'favorite-sites-header';

  const headerText = document.createElement('span');
  headerText.textContent = 'Favorite Sites';
  header.appendChild(headerText);

  const countSpan = document.createElement('span');
  countSpan.className = 'tab-count';
  countSpan.textContent = ` (${unopenedFavorites.length})`;
  header.appendChild(countSpan);

  container.appendChild(header);

  // Wrap in group-tabs div for dotted indent rail
  const groupTabsDiv = document.createElement('div');
  groupTabsDiv.className = 'group-tabs';
  unopenedFavorites.forEach(site => {
    const element = createFavoriteSiteElement(site);
    groupTabsDiv.appendChild(element);
  });
  container.appendChild(groupTabsDiv);

  tabList.appendChild(container);
}

/**
 * Creates a DOM element for a favorite site (not currently open).
 *
 * @param {Object} site - Favorite site {url, title, favIconUrl}
 * @returns {HTMLElement} Favorite site element
 */
function createFavoriteSiteElement(site) {
  const tabItem = document.createElement('div');
  tabItem.className = 'tab-item favorite-site';
  tabItem.title = `${site.title}\n${site.url}\n\nClick to open`;

  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  favicon.src = site.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">⭐</text></svg>';
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">⭐</text></svg>';
  };
  tabItem.appendChild(favicon);

  // Title
  const titleSpan = document.createElement('span');
  titleSpan.className = 'tab-title';
  titleSpan.textContent = site.title;
  tabItem.appendChild(titleSpan);

  // "Open →" label (visible on hover)
  const openLabel = document.createElement('span');
  openLabel.className = 'open-link';
  openLabel.textContent = 'Open \u2192';
  tabItem.appendChild(openLabel);

  // Remove button (hidden by default, appears on hover)
  const removeBtn = document.createElement('button');
  removeBtn.className = 'close-btn';
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove from favorites';
  removeBtn.addEventListener('click', (e) => removeFavorite(site.url, e));
  tabItem.appendChild(removeBtn);

  // Click row to open
  tabItem.addEventListener('click', (e) => {
    if (e.target === removeBtn) return;
    openFavoriteSite(site, e);
  });

  return tabItem;
}

/**
 * Creates a DOM element for a single tab.
 *
 * Tab element contains:
 * - Favicon (website icon)
 * - Group badge (when globally sorted - shows group name/color)
 * - Title (truncated if too long)
 * - Duplicate badge (if URL appears multiple times)
 * - Close button (visible on hover)
 *
 * Active tab gets special styling (blue border + background).
 *
 * @param {Object} tab - Chrome tab object with id, title, url, favIconUrl, etc.
 * @param {string} groupColor - Optional group color (for global sort mode)
 * @param {string} groupTitle - Optional group title (for global sort mode)
 * @returns {HTMLElement} Tab element to insert into DOM
 */
function createTabElement(tab, groupColor = null, groupTitle = null) {
  const tabItem = document.createElement('div');
  tabItem.className = 'tab-item';

  // Tooltip shows full title, URL, and last accessed time
  const lastAccessed = formatTimeSince(tab.lastAccessed);
  tabItem.title = `${tab.title}\n${tab.url}\n\nLast accessed: ${lastAccessed}`;

  // Highlight active tab with special styling
  if (tab.id === activeTabId) {
    tabItem.classList.add('active');
  }

  // Add age-based color coding (green/yellow/orange border)
  const ageClass = getTabAgeClass(tab);
  tabItem.classList.add(ageClass);

  // Favicon - Shows website icon or fallback document emoji
  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  // Fallback if favicon fails to load
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  };
  tabItem.appendChild(favicon);

  // Group badge - Shows group when globally sorted
  if (groupColor !== null) {
    const groupBadge = document.createElement('span');
    groupBadge.className = 'group-badge';

    if (tab.groupId === -1) {
      // Ungrouped tab
      groupBadge.classList.add('ungrouped');
      groupBadge.textContent = 'No Group';
    } else {
      // Tab in a group
      groupBadge.dataset.groupColor = groupColor;
      groupBadge.textContent = groupTitle || `${groupColor} group`;
    }

    tabItem.appendChild(groupBadge);
  }

  // Pinned badge - Clickable button to toggle pin state
  // Shows 📌 for pinned tabs, or pin outline for unpinned (on hover)
  const pinnedBadge = document.createElement('button');
  pinnedBadge.className = tab.pinned ? 'status-badge pinned-badge pinned' : 'status-badge pinned-badge unpinned';
  pinnedBadge.textContent = tab.pinned ? '📌' : '📍';
  pinnedBadge.title = tab.pinned ? 'Click to unpin tab' : 'Click to pin tab';
  pinnedBadge.addEventListener('click', (e) => togglePinTab(tab.id, tab.pinned, e));
  tabItem.appendChild(pinnedBadge);

  // Audio badges - Clickable buttons to toggle mute state
  // Shows 🔇 for muted, 🔊 for audible, or 🔈 for silent tabs (on hover)
  // NOTE: Using optional chaining for null-safety
  const isMuted = tab.mutedInfo?.muted;
  const isAudible = tab.audible;

  const audioBadge = document.createElement('button');
  audioBadge.className = 'status-badge audio-badge';

  if (isMuted) {
    audioBadge.textContent = '🔇';
    audioBadge.title = 'Click to unmute';
    audioBadge.classList.add('muted');
  } else if (isAudible) {
    audioBadge.textContent = '🔊';
    audioBadge.title = 'Click to mute';
    audioBadge.classList.add('audible');
  } else {
    audioBadge.textContent = '🔈';
    audioBadge.title = 'Click to mute (no audio playing)';
    audioBadge.classList.add('silent');
  }

  audioBadge.addEventListener('click', (e) => toggleMuteTab(tab.id, isMuted, e));
  tabItem.appendChild(audioBadge);

  // Tab title (truncated via CSS if too long)
  const titleSpan = document.createElement('span');
  titleSpan.className = 'tab-title';
  titleSpan.textContent = tab.title || 'Untitled';
  tabItem.appendChild(titleSpan);

  // Duplicate badge - Shows "2×", "3×", etc. for duplicate URLs
  if (urlCounts[tab.url] > 1) {
    const dupBadge = document.createElement('span');
    dupBadge.className = 'duplicate-badge';
    dupBadge.textContent = `${urlCounts[tab.url]}×`;
    dupBadge.title = `${urlCounts[tab.url]} tabs with this URL`;
    tabItem.appendChild(dupBadge);
  }

  // Visit count badge - Shows total visits from browser history (≥10 visits)
  const visitCount = visitCounts[tab.url] || 0;
  if (visitCount >= 10) {
    const visitBadge = document.createElement('span');
    visitBadge.className = 'visit-badge';
    visitBadge.textContent = `${visitCount}`;
    visitBadge.title = `${visitCount} visit${visitCount === 1 ? '' : 's'}`;
    tabItem.appendChild(visitBadge);
  }

  // Favorite star button (hidden by default, appears on hover)
  const isFav = isFavoriteUrl(tab.url);
  const favBtn = document.createElement('button');
  favBtn.className = 'favorite-btn' + (isFav ? ' favorited' : '');
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
  favBtn.addEventListener('click', (e) => {
    if (isFavoriteUrl(tab.url)) {
      removeFavorite(tab.url, e);
    } else {
      addFavorite(tab, e);
    }
  });
  tabItem.appendChild(favBtn);

  // Quick Pick button — opens picker to save this tab to a numbered slot
  const currentSlot = getSlotForUrl(tab.url);
  const slotBtn = document.createElement('button');
  slotBtn.className = 'slot-pin-btn' + (currentSlot ? ' pinned-to-slot' : '');
  slotBtn.textContent = currentSlot ? `🔖${currentSlot}` : '🔖';
  if (currentSlot === 1) {
    slotBtn.title = 'Saved in slot 1 — Cmd+Shift+1 jumps here. Click to change.';
  } else if (currentSlot) {
    slotBtn.title = `Saved in slot ${currentSlot} — assign a key at chrome://extensions/shortcuts. Click to change.`;
  } else {
    slotBtn.title = 'Save to a Quick Pick slot for keyboard shortcut access';
  }
  slotBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showSlotPicker(tab, slotBtn);
  });
  tabItem.appendChild(slotBtn);

  // Close button (hidden by default, appears on hover)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));
  tabItem.appendChild(closeBtn);

  // Click tab to activate it (but not when clicking action buttons)
  tabItem.addEventListener('click', (e) => {
    // Don't activate tab when clicking action buttons
    if (e.target === closeBtn || e.target === pinnedBadge || e.target === audioBadge || e.target === favBtn || e.target === slotBtn) {
      return;
    }
    activateTab(tab.id, tab.windowId);
  });

  return tabItem;
}

/**
 * Creates a DOM element for a recently closed tab.
 *
 * Closed tab element contains:
 * - Favicon (website icon, with fallback)
 * - Title (grayed out appearance)
 * - Time closed badge (e.g., "5m ago", "2h ago")
 * - Restore button (↶ icon, always visible)
 *
 * Click entire row OR restore button to restore tab.
 * Grayed out styling indicates tab is not currently open.
 *
 * @param {Object} closedTab - Closed tab object with sessionId, url, title, favIconUrl, closedAt, groupInfo
 * @returns {HTMLElement} Closed tab element to insert into DOM
 */
function createClosedTabElement(closedTab) {
  const tabItem = document.createElement('div');
  tabItem.className = 'tab-item closed-tab';

  // Tooltip shows URL and time closed
  const timeClosed = formatTimeSince(closedTab.closedAt);
  tabItem.title = `${closedTab.title}\n${closedTab.url}\n\nClosed: ${timeClosed}`;

  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  favicon.src = closedTab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  };
  tabItem.appendChild(favicon);

  // Title
  const titleSpan = document.createElement('span');
  titleSpan.className = 'tab-title';
  titleSpan.textContent = closedTab.title;
  tabItem.appendChild(titleSpan);

  // Group badge - Shows which group tab will be restored to (if applicable)
  if (closedTab.groupInfo) {
    const groupBadge = document.createElement('span');
    groupBadge.className = 'closed-group-badge';
    groupBadge.setAttribute('data-group-color', closedTab.groupInfo.groupColor);
    const groupName = closedTab.groupInfo.groupTitle || `${closedTab.groupInfo.groupColor} group`;
    groupBadge.textContent = groupName;
    groupBadge.title = `Will restore to: ${groupName}`;
    tabItem.appendChild(groupBadge);
  }

  // Time closed badge
  const timeBadge = document.createElement('span');
  timeBadge.className = 'closed-time-badge';
  timeBadge.textContent = timeClosed;
  tabItem.appendChild(timeBadge);

  // Restore button (↶ icon, always visible)
  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'restore-btn';
  restoreBtn.textContent = '↶';
  restoreBtn.title = 'Restore tab';
  restoreBtn.addEventListener('click', (e) => restoreClosedTab(closedTab, e));
  tabItem.appendChild(restoreBtn);

  // Click to restore (entire row)
  tabItem.addEventListener('click', (e) => {
    if (e.target === restoreBtn) return;
    restoreClosedTab(closedTab, e);
  });

  return tabItem;
}

/*
 * ============================================================================
 * FILTER FUNCTIONS
 * ============================================================================
 */

/**
 * Toggles the "Show Only Duplicates" filter.
 *
 * When active, only tabs with duplicate URLs are shown.
 * Button styling changes to indicate active state.
 */
function toggleDuplicateFilter() {
  duplicateFilterActive = !duplicateFilterActive;

  // Sync the chip UI
  const dupesChip = document.querySelector('.filter-chip[data-filter="dupes"]');
  if (dupesChip) dupesChip.classList.toggle('active', duplicateFilterActive);

  saveChipState();
  renderTabs(currentSearchTerm);
}

/**
 * Clears all active filters and resets to default view.
 *
 * Resets:
 * - Search box (clears text)
 * - Duplicate filter (deactivates)
 * - Group filter (shows all groups)
 * - Sort option (back to default)
 * - Global sort (unchecked, hidden)
 */
function clearFilters() {
  // Clear search
  const searchBox = document.getElementById('searchBox');
  searchBox.value = '';
  currentSearchTerm = '';
  localStorage.setItem('tabManagerSearchTerm', '');
  const searchClearBtn = document.getElementById('searchClearBtn');
  if (searchClearBtn) searchClearBtn.style.display = 'none';

  // Clear duplicate filter
  duplicateFilterActive = false;

  // Clear filter chip states
  audioFilterActive = false;
  pinnedFilterActive = false;
  favoritesFilterActive = false;
  oldTabsFilterActive = false;
  picksFilterActive = false;

  // Reset all chip UI
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.remove('active');
  });

  // Reset combine mode to single-select (Any)
  combineFiltersMode = false;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === 'any');
  });

  saveChipState();

  // Reset sort to default
  currentSortOption = 'default';
  const sortDropdown = document.getElementById('sortDropdown');
  sortDropdown.value = 'default';
  localStorage.setItem('tabManagerSortOption', 'default');

  // Re-render with cleared filters
  renderTabs('');
}

/**
 * Checks if a tab matches all currently active filters.
 *
 * CRITICAL: This function is shared by both renderTabs() and closeDuplicateTabs()
 * to ensure "Close Duplicates" respects visible/filtered tabs only.
 *
 * Filters applied (AND logic):
 * 1. Search filter - Title/URL contains search term
 * 2. Duplicate filter - URL appears >1 time
 * 3. Group filter - Tab belongs to specific group
 *
 * @param {Object} tab - Chrome tab object
 * @returns {boolean} True if tab passes all active filters
 */
/**
 * Returns true if any chip filter is currently active.
 */
function anyChipFilterActive() {
  return duplicateFilterActive || audioFilterActive || pinnedFilterActive ||
         favoritesFilterActive || oldTabsFilterActive || picksFilterActive;
}

/**
 * Saves current chip filter state to localStorage.
 */
function saveChipState() {
  const state = {
    dupes: duplicateFilterActive,
    audio: audioFilterActive,
    pinned: pinnedFilterActive,
    faves: favoritesFilterActive,
    old: oldTabsFilterActive,
    picks: picksFilterActive,
    combine: combineFiltersMode
  };
  localStorage.setItem('tabManagerChipState', JSON.stringify(state));
}

/**
 * Restores chip filter state from localStorage and updates UI.
 */
function restoreChipState() {
  const saved = localStorage.getItem('tabManagerChipState');
  if (!saved) return;
  try {
    const state = JSON.parse(saved);
    duplicateFilterActive = state.dupes || false;
    audioFilterActive = state.audio || false;
    pinnedFilterActive = state.pinned || false;
    favoritesFilterActive = state.faves || false;
    oldTabsFilterActive = state.old || false;
    picksFilterActive = state.picks || false;
    combineFiltersMode = state.combine || false;

    // Update chip UI
    const filterMap = { dupes: duplicateFilterActive, audio: audioFilterActive,
      pinned: pinnedFilterActive, faves: favoritesFilterActive, old: oldTabsFilterActive,
      picks: picksFilterActive };
    document.querySelectorAll('.filter-chip').forEach(chip => {
      const filter = chip.dataset.filter;
      if (filterMap[filter]) chip.classList.add('active');
    });

    // Update mode toggle UI (Any/All buttons)
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active',
        (combineFiltersMode && btn.dataset.mode === 'all') ||
        (!combineFiltersMode && btn.dataset.mode === 'any')
      );
    });
  } catch {
    // Ignore corrupt data
  }
}

function tabMatchesFilters(tab) {
  // Search filter
  if (currentSearchTerm) {
    const lowerSearch = currentSearchTerm.toLowerCase();
    const matchesSearch = tab.title.toLowerCase().includes(lowerSearch) ||
                         tab.url.toLowerCase().includes(lowerSearch);
    if (!matchesSearch) return false;
  }

  // Duplicate filter (only show tabs that appear >1 time)
  if (duplicateFilterActive && urlCounts[tab.url] <= 1) {
    return false;
  }

  // Audio filter (only show tabs playing sound or muted)
  if (audioFilterActive && !tab.audible && !tab.mutedInfo?.muted) {
    return false;
  }

  // Pinned filter (only show pinned tabs)
  if (pinnedFilterActive && !tab.pinned) {
    return false;
  }

  // Favorites filter (only show tabs whose origin is in favorites)
  if (favoritesFilterActive && !isFavoriteUrl(tab.url)) {
    return false;
  }

  // Old tabs filter (only show tabs not accessed in >1 week)
  if (oldTabsFilterActive) {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if ((Date.now() - (tab.lastAccessed || 0)) <= oneWeek) {
      return false;
    }
  }

  // Picks filter (only show tabs saved to a Quick Pick slot)
  if (picksFilterActive && !getSlotForUrl(tab.url)) {
    return false;
  }

  return true;
}

/**
 * Closes all duplicate tabs while keeping one of each URL.
 *
 * FILTER-AWARE: Only operates on currently visible/filtered tabs.
 * - If searching "github" → only closes github duplicates
 * - If filtering by group → only closes duplicates in that group
 * - If both filters active → respects both
 *
 * ALGORITHM:
 * 1. Get visible tabs (respecting all active filters)
 * 2. Group by URL
 * 3. For each URL with >1 tab:
 *    - Keep active tab if it's a duplicate
 *    - Otherwise keep first tab
 *    - Close all others
 */
async function closeDuplicateTabs() {
  // Build list of currently visible tabs based on active filters
  const visibleTabs = allTabs.filter(tabMatchesFilters);

  // Group visible tabs by URL
  const urlGroups = {};
  visibleTabs.forEach(tab => {
    if (!urlGroups[tab.url]) urlGroups[tab.url] = [];
    urlGroups[tab.url].push(tab);
  });

  // Find tabs to close
  const tabsToClose = [];
  Object.values(urlGroups).forEach(tabs => {
    if (tabs.length > 1) {
      // Prefer keeping the active tab (if it's one of the duplicates)
      let keepTab = tabs.find(t => t.id === activeTabId) || tabs[0];

      // Mark all others for closing
      tabs.forEach(tab => {
        if (tab.id !== keepTab.id) {
          tabsToClose.push(tab.id);
        }
      });
    }
  });

  // Show confirmation with context about active filters
  if (tabsToClose.length > 0) {
    let message = `Close ${tabsToClose.length} duplicate tabs? (Keeps one of each URL)`;
    // Indicate if filters are limiting scope
    if (currentSearchTerm || duplicateFilterActive) {
      message = `Close ${tabsToClose.length} duplicate tabs? (Only from currently filtered tabs)`;
    }

    if (confirm(message)) {
      await chrome.tabs.remove(tabsToClose);
      await loadTabs();
    }
  } else {
    alert('No duplicate tabs found in current view!');
  }
}

/*
 * ============================================================================
 * DATA LOADING
 * ============================================================================
 */

/**
 * Loads recently closed tabs from Chrome sessions API.
 * Merges with stored group metadata from background.js.
 *
 * Chrome APIs used:
 * - chrome.sessions.getRecentlyClosed() - Get closed tabs/windows from session history
 * - chrome.storage.local.get() - Retrieve group metadata stored by background.js
 *
 * Returns array of closed tab objects with:
 * - sessionId: For restoration via chrome.sessions.restore()
 * - url, title, favIconUrl: Tab details
 * - closedAt: Timestamp when tab was closed
 * - groupInfo: {groupId, groupTitle, groupColor} if tab was in a group, null otherwise
 */
async function loadRecentlyClosedTabs() {
  try {
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });

    // Load group metadata from storage
    const stored = await chrome.storage.local.get('closedTabGroups');
    const groupMetadata = stored.closedTabGroups || {};

    // Filter to only tabs (exclude windows)
    recentlyClosedTabs = sessions
      .filter(session => session.tab)
      .map(session => {
        const url = session.tab.url;
        // Chrome sessions API returns lastModified in seconds, not milliseconds
        // Convert to milliseconds for consistency with Date.now()
        const closedAt = session.lastModified * 1000;

        // Find matching group metadata (closest timestamp match)
        let groupInfo = null;
        let closestMatch = null;
        let closestTimeDiff = Infinity;

        for (const [key, metadata] of Object.entries(groupMetadata)) {
          if (metadata.url === url) {
            const timeDiff = Math.abs(metadata.closedAt - closedAt);
            if (timeDiff < closestTimeDiff && timeDiff < 5000) { // Within 5 seconds
              closestTimeDiff = timeDiff;
              closestMatch = metadata;
            }
          }
        }

        if (closestMatch) {
          groupInfo = {
            groupId: closestMatch.groupId,
            groupTitle: closestMatch.groupTitle,
            groupColor: closestMatch.groupColor
          };
        }

        return {
          sessionId: session.tab.sessionId,  // For restoration
          url: url,
          title: session.tab.title || 'Untitled',
          favIconUrl: session.tab.favIconUrl,
          closedAt: closedAt,
          groupInfo: groupInfo  // null if wasn't in a group
        };
      });
  } catch (error) {
    console.warn('Failed to load recently closed tabs:', error);
    recentlyClosedTabs = [];
  }
}

/**
 * Loads favorite sites from chrome.storage.sync.
 * Favorites are stored as origin-only URLs for domain-level matching.
 * Capped at 50 entries to stay within sync storage quota.
 */
async function loadFavoriteSites() {
  try {
    const stored = await chrome.storage.sync.get('favoriteSites');
    favoriteSites = stored.favoriteSites || [];
  } catch (error) {
    console.warn('Failed to load favorite sites:', error);
    favoriteSites = [];
  }
}

/**
 * Saves favorite sites to chrome.storage.sync.
 * Enforces a cap of 50 favorites to stay within sync storage quota (100KB total).
 */
async function saveFavoriteSites() {
  // Cap at 50 favorites
  if (favoriteSites.length > 50) {
    favoriteSites = favoriteSites.slice(0, 50);
  }
  try {
    await chrome.storage.sync.set({ favoriteSites });
  } catch (error) {
    console.warn('Failed to save favorite sites:', error);
  }
}

/**
 * Extracts the origin (protocol + hostname) from a URL.
 * Used for domain-level matching of favorites.
 * Example: "https://mail.google.com/mail/u/0/#inbox/abc" → "https://mail.google.com"
 *
 * @param {string} url - Full URL
 * @returns {string} Origin (protocol + hostname), or original URL if parsing fails
 */
function getUrlOrigin(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url;
  }
}

/**
 * Updates the favorites count display in the toggle button.
 * Shows count of unopened favorites (favorites not currently open in any tab).
 */
function updateFavoritesCount() {
  const openUrls = new Set(allTabs.map(t => t.url));
  const unopenedFavCount = favoriteSites.filter(fav => !openUrls.has(fav.url)).length;
  const favCountEl = document.getElementById('favoriteSitesCount');
  if (favCountEl) {
    favCountEl.textContent = unopenedFavCount;
  }
}

/**
 * Checks if a URL matches any favorite site (domain-level matching).
 *
 * @param {string} url - Full tab URL
 * @returns {boolean} True if URL's origin matches a stored favorite
 */
function isFavoriteUrl(url) {
  return favoriteSites.some(fav => fav.url === url);
}

/**
 * Adds a tab as a favorite site. Stores the full URL (like a bookmark).
 *
 * @param {Object} tab - Chrome tab object
 * @param {Event} event - Click event
 */
async function addFavorite(tab, event) {
  event.stopPropagation();
  const url = tab.url;
  // Don't add duplicates
  if (favoriteSites.some(fav => fav.url === url)) return;

  favoriteSites.push({
    url: url,
    title: tab.title || url,
    favIconUrl: tab.favIconUrl || ''
  });

  await saveFavoriteSites();
  updateFavoritesCount();
  renderTabs(currentSearchTerm);
}

/**
 * Removes a favorite site by URL.
 *
 * @param {string} url - Origin URL to remove
 * @param {Event} event - Click event
 */
async function removeFavorite(url, event) {
  event.stopPropagation();
  favoriteSites = favoriteSites.filter(fav => fav.url !== url);
  await saveFavoriteSites();
  updateFavoritesCount();
  renderTabs(currentSearchTerm);
}

/**
 * Opens a favorite site in a new tab.
 *
 * @param {Object} site - Favorite site object {url, title, favIconUrl}
 * @param {Event} event - Click event
 */
async function openFavoriteSite(site, event) {
  event.stopPropagation();
  await chrome.tabs.create({ url: site.url });
  await loadTabs();
}

/*
 * ============================================================================
 * PINNED TAB SLOTS
 * ============================================================================
 * Slots store a URL keyed by slot number. Keystrokes (handled in background.js)
 * jump to the matching open tab or reopen by URL if closed.
 */

async function loadPinnedSlots() {
  try {
    const stored = await chrome.storage.sync.get('pinnedSlots');
    pinnedSlots = stored.pinnedSlots || {};
  } catch (error) {
    console.warn('Failed to load pinned slots:', error);
    pinnedSlots = {};
  }
}

async function savePinnedSlots() {
  try {
    await chrome.storage.sync.set({ pinnedSlots });
  } catch (error) {
    console.warn('Failed to save pinned slots:', error);
  }
}

/**
 * Returns the slot number a tab URL is currently pinned to, or null if none.
 */
function getSlotForUrl(url) {
  for (let n = 1; n <= PINNED_SLOT_COUNT; n++) {
    if (pinnedSlots[String(n)]?.url === url) return n;
  }
  return null;
}

async function pinTabToSlot(tab, slotNumber) {
  pinnedSlots[String(slotNumber)] = {
    url: tab.url,
    title: tab.title || tab.url,
    favIconUrl: tab.favIconUrl || '',
    pinnedAt: Date.now()
  };
  await savePinnedSlots();
  showToast(`Saved to Quick Pick slot ${slotNumber}`);
  renderTabs(currentSearchTerm);
}

async function clearSlot(slotNumber) {
  delete pinnedSlots[String(slotNumber)];
  await savePinnedSlots();
  showToast(`Cleared slot ${slotNumber}`);
  renderTabs(currentSearchTerm);
}

let toastTimer = null;
/**
 * Shows a transient confirmation toast at the bottom of the popup.
 * A second call replaces any in-flight toast.
 */
function showToast(message) {
  let toast = document.getElementById('tmToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tmToast';
    toast.className = 'tm-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 1800);
}

/**
 * Activates the tab saved to Quick Pick slot N (or reopens by URL if closed).
 * Used when clicking a slot row in the popup — mirrors the keystroke handler.
 */
async function activatePinnedSlot(slotNumber) {
  const entry = pinnedSlots[String(slotNumber)];
  if (!entry) return;
  const matches = await chrome.tabs.query({ url: entry.url });
  if (matches.length > 0) {
    matches.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    const target = matches[0];
    const currentWin = await chrome.windows.getCurrent();
    if (target.windowId !== currentWin.id) {
      await chrome.windows.update(target.windowId, { focused: true });
    }
    await chrome.tabs.update(target.id, { active: true });
  } else {
    await chrome.tabs.create({ url: entry.url, active: true });
  }
  window.close(); // close popup so user sees the tab
}

/**
 * Renders the Quick Pick section. Always visible (shows empty rows too)
 * so the user can see which slots exist and which need keystroke binding.
 */
function renderPinnedSlots() {
  // Always render — Quick Pick is independent of chip filters and the section
  // gives at-a-glance discoverability of the saved slots.
  const tabList = document.getElementById('tabList');

  // Skip rendering if all slots are empty AND user has no expectation set
  // (We always render — gives discoverability of the feature.)

  const container = document.createElement('div');
  container.className = 'pinned-slots-container';

  const header = document.createElement('div');
  header.className = 'pinned-slots-header';
  const headerText = document.createElement('span');
  headerText.textContent = '🔖 Quick Pick';
  header.appendChild(headerText);

  const hint = document.createElement('span');
  hint.className = 'pinned-slots-hint';
  hint.textContent = 'Cmd+Shift+1 jumps to slot 1 · slots 2–5 user-assigned at chrome://extensions/shortcuts';
  header.appendChild(hint);

  container.appendChild(header);

  const groupTabsDiv = document.createElement('div');
  groupTabsDiv.className = 'group-tabs';

  for (let n = 1; n <= PINNED_SLOT_COUNT; n++) {
    groupTabsDiv.appendChild(createPinnedSlotElement(n, pinnedSlots[String(n)]));
  }

  container.appendChild(groupTabsDiv);
  tabList.appendChild(container);
}

function createPinnedSlotElement(slotNumber, entry) {
  const row = document.createElement('div');
  row.className = 'tab-item pinned-slot-row' + (entry ? '' : ' slot-empty');

  const badge = document.createElement('span');
  badge.className = 'slot-number-badge';
  badge.textContent = String(slotNumber);
  row.appendChild(badge);

  if (entry) {
    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    favicon.src = entry.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">🔖</text></svg>';
    favicon.onerror = () => {
      favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">🔖</text></svg>';
    };
    row.appendChild(favicon);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = entry.title;
    row.appendChild(titleSpan);

    row.title = `${entry.title}\n${entry.url}\n\nClick to open (or press shortcut)`;

    const clearBtn = document.createElement('button');
    clearBtn.className = 'close-btn';
    clearBtn.textContent = '×';
    clearBtn.title = `Clear slot ${slotNumber}`;
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSlot(slotNumber);
    });
    row.appendChild(clearBtn);

    row.addEventListener('click', (e) => {
      if (e.target === clearBtn) return;
      activatePinnedSlot(slotNumber);
    });
  } else {
    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    if (slotNumber === 1) {
      titleSpan.textContent = 'Empty — save a tab via 🔖 button';
    } else {
      titleSpan.textContent = 'Empty — save a tab, then assign a key at chrome://extensions/shortcuts';
    }
    row.appendChild(titleSpan);
  }

  return row;
}

/**
 * Shows a small picker next to a tab's 🔖 button so the user can save to a numbered slot.
 * States per slot:
 *   - empty (green border)        → click saves this tab
 *   - occupied by other (red bg)  → click overwrites
 *   - this tab (solid blue + ✓)   → click on × clears the slot; body click is a no-op
 * Click outside to dismiss. Only one picker is open at a time.
 */
function showSlotPicker(tab, anchorBtn) {
  // Remove any existing pickers
  document.querySelectorAll('.slot-picker').forEach(el => el.remove());

  const picker = document.createElement('div');
  picker.className = 'slot-picker';

  for (let n = 1; n <= PINNED_SLOT_COUNT; n++) {
    const slotEntry = pinnedSlots[String(n)];
    const currentlyPinnedHere = slotEntry?.url === tab.url;
    const opt = document.createElement('button');
    opt.className = 'slot-picker-option';

    if (currentlyPinnedHere) {
      opt.classList.add('current');
      const numSpan = document.createElement('span');
      numSpan.className = 'slot-num';
      numSpan.textContent = String(n);
      const checkSpan = document.createElement('span');
      checkSpan.className = 'slot-check';
      checkSpan.textContent = '✓';
      const clearBtn = document.createElement('span');
      clearBtn.className = 'slot-picker-clear';
      clearBtn.textContent = '×';
      clearBtn.title = `Clear slot ${n}`;
      clearBtn.setAttribute('role', 'button');
      clearBtn.setAttribute('aria-label', `Clear slot ${n}`);
      clearBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        picker.remove();
        await clearSlot(n);
      });
      opt.append(numSpan, checkSpan, clearBtn);
      opt.title = `Saved in slot ${n} — click × to clear`;
      opt.setAttribute('aria-label', `Slot ${n}, this tab is saved here`);
      // Body click on current slot is a no-op — clearing requires the explicit ×
      opt.addEventListener('click', (e) => e.stopPropagation());
    } else if (slotEntry) {
      opt.classList.add('occupied');
      opt.textContent = String(n);
      opt.title = `Slot ${n} → ${slotEntry.title} (click to overwrite)`;
      opt.setAttribute('aria-label', `Slot ${n}, currently saved as ${slotEntry.title}`);
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        picker.remove();
        await pinTabToSlot(tab, n);
      });
    } else {
      opt.textContent = String(n);
      opt.title = `Save this tab to slot ${n}`;
      opt.setAttribute('aria-label', `Slot ${n}, empty`);
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        picker.remove();
        await pinTabToSlot(tab, n);
      });
    }

    picker.appendChild(opt);
  }

  // Position picker right next to the anchor button (relative parent assumed: tabItem)
  const wrapper = anchorBtn.parentElement;
  wrapper.style.position = 'relative';
  wrapper.appendChild(picker);

  // Outside click closes (deferred so the click that opened it doesn't immediately close it)
  setTimeout(() => {
    const handler = (e) => {
      if (!picker.contains(e.target) && e.target !== anchorBtn) {
        picker.remove();
        document.removeEventListener('click', handler);
      }
    };
    document.addEventListener('click', handler);
  }, 0);
}

/**
 * Loads all tabs and groups from Chrome, updates UI.
 *
 * This is the main data refresh function, called:
 * - On popup open (DOMContentLoaded)
 * - After closing tabs
 * - After any action that changes tab state
 *
 * Chrome APIs used:
 * - chrome.tabs.query({}) - Get all tabs (all windows)
 * - chrome.tabGroups.query({}) - Get all tab groups
 * - chrome.tabs.query({active: true, currentWindow: true}) - Get active tab
 */
async function loadTabs() {
  // Fetch all tabs across all windows
  allTabs = await chrome.tabs.query({});

  // Fetch all tab groups
  allGroups = await chrome.tabGroups.query({});

  // Clean up stale collapsed group IDs (groups that no longer exist)
  const currentGroupIds = new Set(allGroups.map(g => g.id));
  let staleRemoved = false;
  for (const id of collapsedGroups) {
    if (!currentGroupIds.has(id)) {
      collapsedGroups.delete(id);
      staleRemoved = true;
    }
  }
  if (staleRemoved) saveCollapsedGroups();

  // Get currently active tab for highlighting
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  activeTabId = activeTab?.id;

  // Build duplicate detection map
  urlCounts = buildDuplicateMap(allTabs);

  // Build visit counts map from browser history
  visitCounts = await buildVisitCountsMap(allTabs);

  // Load recently closed tabs
  await loadRecentlyClosedTabs();

  // Load favorite sites
  await loadFavoriteSites();

  // Load pinned tab slots
  await loadPinnedSlots();

  // Update count displays
  document.getElementById('tabCount').textContent = allTabs.length;
  document.getElementById('groupCount').textContent = allGroups.length;

  // Show/hide "Close Duplicates" button based on whether duplicates exist (Option B)
  const hasDuplicates = Object.values(urlCounts).some(count => count > 1);
  const closeDupesBtn = document.getElementById('closeDuplicatesBtn');
  closeDupesBtn.style.display = hasDuplicates ? '' : 'none';

  // Render the UI
  renderTabs(currentSearchTerm);
}

// toggleControls() removed in v2.6 — controls are always visible now

/*
 * ============================================================================
 * INITIALIZATION
 * ============================================================================
 */

/**
 * Initialize extension when popup opens.
 *
 * Sets up event listeners for:
 * - Search box input (real-time filtering)
 * - Duplicate toggle button
 * - Close duplicates button
 * - Sort dropdown (with global sort checkbox visibility)
 * - Global sort checkbox
 * - Clear filters button
 *
 * Also restores saved sort and global sort preferences from localStorage.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved sort preference from localStorage
  const savedSort = localStorage.getItem('tabManagerSortOption');
  if (savedSort) {
    currentSortOption = savedSort;
    document.getElementById('sortDropdown').value = savedSort;
  }

  // Restore saved chip filter state from localStorage
  restoreChipState();

  // Initialize view toggle from persisted state
  const collapseAllBtn = document.getElementById('toggleAllGroups');
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewMode);
  });
  // Hide collapse-all button in All view
  collapseAllBtn.classList.toggle('hidden', viewMode === 'all');

  // Collapse/Expand All groups toggle
  collapseAllBtn.addEventListener('click', () => {
    const allCollapsed = allGroups.length > 0 && allGroups.every(g => collapsedGroups.has(g.id));
    if (allCollapsed) {
      expandAllGroups();
    } else {
      collapseAllGroups();
    }
  });

  // View toggle: Groups vs All
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view;
      localStorage.setItem('tabManagerViewMode', viewMode);
      // Update active button styling
      document.querySelectorAll('.view-toggle-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === viewMode);
      });
      // Show/hide collapse-all button (only relevant in groups view)
      collapseAllBtn.classList.toggle('hidden', viewMode === 'all');
      renderTabs(currentSearchTerm);
    });
  });

  // Restore saved search term from localStorage
  const savedSearch = localStorage.getItem('tabManagerSearchTerm');
  if (savedSearch) {
    currentSearchTerm = savedSearch;
    document.getElementById('searchBox').value = savedSearch;
  }

  // Load and display all tabs
  loadTabs();

  // Real-time search as user types
  const searchBox = document.getElementById('searchBox');
  const searchClearBtn = document.getElementById('searchClearBtn');
  searchBox.addEventListener('input', (e) => {
    localStorage.setItem('tabManagerSearchTerm', e.target.value);
    searchClearBtn.style.display = e.target.value ? 'flex' : 'none';
    renderTabs(e.target.value);
  });

  // Clear search button
  searchClearBtn.addEventListener('click', () => {
    searchBox.value = '';
    currentSearchTerm = '';
    localStorage.setItem('tabManagerSearchTerm', '');
    searchClearBtn.style.display = 'none';
    renderTabs('');
    searchBox.focus();
  });

  // Show clear button if search was restored from localStorage
  if (searchBox.value) {
    searchClearBtn.style.display = 'flex';
  }

  // Auto-focus search box on popup open
  searchBox.focus();

  // "Close Duplicates" button
  document.getElementById('closeDuplicatesBtn').addEventListener('click', closeDuplicateTabs);

  // Filter chips - each toggles a filter and re-renders
  const chipFilterMap = {
    dupes: () => duplicateFilterActive,
    audio: () => audioFilterActive,
    pinned: () => pinnedFilterActive,
    faves: () => favoritesFilterActive,
    old: () => oldTabsFilterActive,
    picks: () => picksFilterActive
  };

  const setChipFilter = (name, value) => {
    switch (name) {
      case 'dupes': duplicateFilterActive = value; break;
      case 'audio': audioFilterActive = value; break;
      case 'pinned': pinnedFilterActive = value; break;
      case 'faves': favoritesFilterActive = value; break;
      case 'old': oldTabsFilterActive = value; break;
      case 'picks': picksFilterActive = value; break;
    }
  };

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      const wasActive = chipFilterMap[filter]();

      if (!combineFiltersMode) {
        // Single-select: deactivate all other chips first
        document.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('active');
        });
        // Clear all chip filter states
        duplicateFilterActive = false;
        audioFilterActive = false;
        pinnedFilterActive = false;
        favoritesFilterActive = false;
        oldTabsFilterActive = false;
        picksFilterActive = false;
      }

      // Toggle the clicked chip
      setChipFilter(filter, !wasActive);
      chip.classList.toggle('active', !wasActive);

      saveChipState();
      renderTabs(currentSearchTerm);
    });
  });

  // Mode toggle: Any (single-select) vs All (AND combine)
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      combineFiltersMode = (mode === 'all');
      // Update button active states
      document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
      if (!combineFiltersMode) {
        // Switching to single-select: keep only the first active chip
        const activeChips = document.querySelectorAll('.filter-chip.active');
        if (activeChips.length > 1) {
          const keepFilter = activeChips[0].dataset.filter;
          // Clear all
          document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
          duplicateFilterActive = false;
          audioFilterActive = false;
          pinnedFilterActive = false;
          favoritesFilterActive = false;
          oldTabsFilterActive = false;
          picksFilterActive = false;
          // Re-activate just the first one
          setChipFilter(keepFilter, true);
          activeChips[0].classList.add('active');
          renderTabs(currentSearchTerm);
        }
      }
      saveChipState();
    });
  });

  // Sort dropdown - Save preference and re-render
  document.getElementById('sortDropdown').addEventListener('change', (e) => {
    currentSortOption = e.target.value;
    localStorage.setItem('tabManagerSortOption', currentSortOption);
    renderTabs(currentSearchTerm);
  });

  // "Clear Filters" button
  document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

  // ============================================================================
  // HELP MODAL
  // ============================================================================

  /*
   * Tab Manager Chrome Extension
   * Created by: Steve Souza
   *
   * This is an experimental learning project.
   * Can be removed at any time.
   */

  const infoIcon = document.getElementById('infoIcon');
  const helpModal = document.getElementById('helpModal');
  const closeModal = document.querySelector('.close-modal');

  // Open modal when info icon clicked
  infoIcon.addEventListener('click', () => {
    helpModal.style.display = 'block';
  });

  // Open chrome://extensions/shortcuts via chrome.tabs.create (direct links blocked).
  // Wired by class so multiple instances in the help modal share one handler.
  document.querySelectorAll('.shortcuts-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  });

  // Close modal when X clicked
  closeModal.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.style.display = 'none';
    }
  });
});
