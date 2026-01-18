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

// Currently selected group filter (null = show all groups, number = specific group ID)
// Users activate this by clicking group headers
let activeGroupFilter = null;

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

// Whether to sort globally (across all groups) or within each group
// Only applies when currentSortOption is not 'default'
let globalSortEnabled = false;

// Recently closed tabs state
// Loaded from chrome.sessions API + group metadata from chrome.storage
let recentlyClosedTabs = [];

// Toggle state for showing/hiding recently closed tabs (persisted in localStorage)
let closedTabsVisible = localStorage.getItem('closedTabsVisible') === 'true';

// Collapsed state for filter/sort controls section (persisted in localStorage)
let controlsCollapsed = localStorage.getItem('controlsCollapsed') === 'true';

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

  // Search filter: Check if tab matches search term
  const matchesSearch = (tab) => {
    if (!searchTerm) return true;
    return tab.title.toLowerCase().includes(lowerSearch) ||
           tab.url.toLowerCase().includes(lowerSearch);
  };

  // Duplicate filter: Check if tab is a duplicate (URL appears >1 time)
  const matchesDuplicateFilter = (tab) => {
    if (!duplicateFilterActive) return true;
    return urlCounts[tab.url] > 1;
  };

  // Combined filter: Tab must match all active filters
  const matchesAllFilters = (tab) => {
    return matchesSearch(tab) && matchesDuplicateFilter(tab);
  };

  // Check if duplicate filter should be auto-disabled
  if (duplicateFilterActive) {
    const visibleTabs = allTabs.filter(matchesAllFilters);
    if (visibleTabs.length === 0) {
      // No duplicates remaining - auto-disable filter
      duplicateFilterActive = false;
      const toggleBtn = document.getElementById('duplicateToggle');
      toggleBtn.classList.remove('active');
      // Re-render without the duplicate filter
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

  // GLOBAL SORT MODE: Flatten all tabs and sort globally
  if (globalSortEnabled && currentSortOption !== 'default' && currentSortOption !== 'group-recent') {
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

    return; // Exit early - don't use grouped rendering
  }

  // PER-GROUP SORT MODE: Render grouped tabs (default behavior)
  organized.groups.forEach(group => {
    const filteredTabs = sortTabs(group.tabs.filter(matchesAllFilters));
    const groupName = group.title || `${group.color} group`;
    const groupNameMatches = searchTerm && groupName.toLowerCase().includes(lowerSearch);

    // Skip if filtering by different group
    if (activeGroupFilter !== null && activeGroupFilter !== group.id) return;

    // Skip if no matching tabs and group name doesn't match search
    if (filteredTabs.length === 0 && !groupNameMatches) return;

    // Create group container
    const groupContainer = document.createElement('div');
    groupContainer.className = 'group-container';

    // Create group header with color coding
    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';
    groupHeader.dataset.groupId = group.id;
    groupHeader.dataset.groupColor = group.color; // Used for CSS color matching

    // Visual indicator when filtering by this group
    if (activeGroupFilter === group.id) {
      groupHeader.classList.add('filtered');
    }

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

    // Click header to toggle group filter (but not when clicking close button)
    groupHeader.addEventListener('click', (e) => {
      if (e.target === closeBtn) return;
      // Toggle: click again to clear filter
      if (activeGroupFilter === group.id) {
        activeGroupFilter = null;
      } else {
        activeGroupFilter = group.id;
      }
      renderTabs(searchTerm);
    });

    groupContainer.appendChild(groupHeader);

    // Render individual tabs in group
    filteredTabs.forEach(tab => {
      const tabItem = createTabElement(tab);
      groupContainer.appendChild(tabItem);
    });

    tabList.appendChild(groupContainer);
  });

  // Render ungrouped tabs (only if not filtering by a specific group)
  const filteredUngrouped = sortTabs(organized.ungrouped.filter(matchesAllFilters));
  if (filteredUngrouped.length > 0 && activeGroupFilter === null) {
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

    filteredUngrouped.forEach(tab => {
      const tabItem = createTabElement(tab);
      ungroupedContainer.appendChild(tabItem);
    });

    tabList.appendChild(ungroupedContainer);
  }

  // Render recently closed tabs (always LAST)
  renderRecentlyClosedTabs();
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
  if (!closedTabsVisible || recentlyClosedTabs.length === 0) {
    return; // Don't render if hidden or empty
  }

  const tabList = document.getElementById('tabList');

  // Create container (similar to ungrouped-container)
  const closedContainer = document.createElement('div');
  closedContainer.className = 'closed-tabs-container';

  // Header
  const header = document.createElement('div');
  header.className = 'closed-tabs-header';

  const headerText = document.createElement('span');
  headerText.textContent = 'Recently Closed';
  header.appendChild(headerText);

  const tabCountSpan = document.createElement('span');
  tabCountSpan.className = 'tab-count';
  tabCountSpan.textContent = ` (${recentlyClosedTabs.length})`;
  header.appendChild(tabCountSpan);

  closedContainer.appendChild(header);

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

  // Render each closed tab
  filteredClosedTabs.forEach(closedTab => {
    const tabItem = createClosedTabElement(closedTab);
    closedContainer.appendChild(tabItem);
  });

  // Append at the END of tabList (after all groups/ungrouped)
  tabList.appendChild(closedContainer);
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

  // Close button (hidden by default, appears on hover)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));
  tabItem.appendChild(closeBtn);

  // Click tab to activate it (but not when clicking action buttons)
  tabItem.addEventListener('click', (e) => {
    // Don't activate tab when clicking action buttons
    if (e.target === closeBtn || e.target === pinnedBadge || e.target === audioBadge) {
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

  const toggleBtn = document.getElementById('duplicateToggle');
  toggleBtn.classList.toggle('active', duplicateFilterActive);

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

  // Clear duplicate filter
  duplicateFilterActive = false;
  const duplicateToggle = document.getElementById('duplicateToggle');
  duplicateToggle.classList.remove('active');

  // Clear group filter
  activeGroupFilter = null;

  // Reset sort to default
  currentSortOption = 'default';
  const sortDropdown = document.getElementById('sortDropdown');
  sortDropdown.value = 'default';

  // Reset global sort
  globalSortEnabled = false;
  const globalSortCheckbox = document.getElementById('globalSortCheckbox');
  globalSortCheckbox.checked = false;
  document.getElementById('globalSortContainer').style.display = 'none';

  // Save to localStorage
  localStorage.setItem('tabManagerSortOption', 'default');
  localStorage.setItem('tabManagerGlobalSort', 'false');

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

  // Group filter (only show tabs in selected group)
  if (activeGroupFilter !== null && tab.groupId !== activeGroupFilter) {
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
    if (currentSearchTerm || duplicateFilterActive || activeGroupFilter !== null) {
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

  // Update count displays
  document.getElementById('tabCount').textContent = allTabs.length;
  document.getElementById('groupCount').textContent = allGroups.length;

  // Update closed tabs count (will be 0 if element doesn't exist yet)
  const closedTabsCountEl = document.getElementById('closedTabsCount');
  if (closedTabsCountEl) {
    closedTabsCountEl.textContent = recentlyClosedTabs.length;
  }

  // Enable/disable "Close Duplicates" button based on whether duplicates exist
  const hasDuplicates = Object.values(urlCounts).some(count => count > 1);
  const closeBtn = document.getElementById('closeDuplicatesBtn');
  closeBtn.disabled = !hasDuplicates;

  // Render the UI
  renderTabs(currentSearchTerm);
}

/**
 * Toggle the visibility of filter/sort controls section.
 * State is persisted in localStorage so it remembers user preference.
 */
function toggleControls() {
  controlsCollapsed = !controlsCollapsed;
  localStorage.setItem('controlsCollapsed', controlsCollapsed);

  const section = document.getElementById('controlsSection');
  const button = document.getElementById('toggleControls');

  if (controlsCollapsed) {
    section.classList.add('collapsed');
    button.classList.remove('expanded');
  } else {
    section.classList.remove('collapsed');
    button.classList.add('expanded');
  }
}

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

  // Restore saved global sort preference from localStorage
  const savedGlobalSort = localStorage.getItem('tabManagerGlobalSort');
  if (savedGlobalSort === 'true') {
    globalSortEnabled = true;
    document.getElementById('globalSortCheckbox').checked = true;
  }

  // Show/hide global sort checkbox based on sort option
  const globalSortContainer = document.getElementById('globalSortContainer');
  if (currentSortOption !== 'default' && currentSortOption !== 'group-recent') {
    globalSortContainer.style.display = 'block';
  }

  // Initialize collapsible controls state
  const section = document.getElementById('controlsSection');
  const button = document.getElementById('toggleControls');

  if (controlsCollapsed) {
    section.classList.add('collapsed');
    button.classList.remove('expanded');
  } else {
    section.classList.remove('collapsed');
    button.classList.add('expanded');
  }

  // Add toggle listener for collapsible controls
  button.addEventListener('click', toggleControls);

  // Load and display all tabs
  loadTabs();

  // Real-time search as user types
  const searchBox = document.getElementById('searchBox');
  searchBox.addEventListener('input', (e) => {
    renderTabs(e.target.value);
  });

  // Auto-focus search box on popup open
  searchBox.focus();

  // Toggle "Show Only Duplicates" filter
  document.getElementById('duplicateToggle').addEventListener('click', toggleDuplicateFilter);

  // "Close Duplicates" button
  document.getElementById('closeDuplicatesBtn').addEventListener('click', closeDuplicateTabs);

  // Toggle recently closed tabs visibility
  const closedTabsToggle = document.getElementById('closedTabsToggle');
  if (closedTabsVisible) {
    closedTabsToggle.classList.add('active');
  }
  closedTabsToggle.addEventListener('click', () => {
    closedTabsVisible = !closedTabsVisible;
    localStorage.setItem('closedTabsVisible', closedTabsVisible.toString());
    closedTabsToggle.classList.toggle('active', closedTabsVisible);
    renderTabs(currentSearchTerm);
  });

  // Sort dropdown - Save preference, show/hide global sort checkbox, and re-render
  document.getElementById('sortDropdown').addEventListener('change', (e) => {
    currentSortOption = e.target.value;
    localStorage.setItem('tabManagerSortOption', currentSortOption);

    // Show/hide global sort checkbox
    // Hide for default and group-recent modes (designed for per-group sorting)
    if (currentSortOption === 'default' || currentSortOption === 'group-recent') {
      globalSortContainer.style.display = 'none';
      globalSortEnabled = false;
      document.getElementById('globalSortCheckbox').checked = false;
    } else {
      globalSortContainer.style.display = 'block';
    }

    renderTabs(currentSearchTerm);
  });

  // Global sort checkbox - Toggle global sorting
  document.getElementById('globalSortCheckbox').addEventListener('change', (e) => {
    globalSortEnabled = e.target.checked;
    localStorage.setItem('tabManagerGlobalSort', globalSortEnabled.toString());
    renderTabs(currentSearchTerm);
  });

  // "Clear Filters" button
  document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
});
