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

// Current search term from the search box
let currentSearchTerm = '';

// Whether "Show Only Duplicates" toggle is active
let duplicateFilterActive = false;

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

  // Disable button immediately to prevent double-clicks
  if (event.target) {
    event.target.disabled = true;
  }

  try {
    // Chrome API: Remove a single tab by ID
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

  // Render grouped tabs
  organized.groups.forEach(group => {
    const filteredTabs = group.tabs.filter(matchesAllFilters);
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
  const filteredUngrouped = organized.ungrouped.filter(matchesAllFilters);
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
}

/**
 * Creates a DOM element for a single tab.
 *
 * Tab element contains:
 * - Favicon (website icon)
 * - Title (truncated if too long)
 * - Duplicate badge (if URL appears multiple times)
 * - Close button (visible on hover)
 *
 * Active tab gets special styling (blue border + background).
 *
 * @param {Object} tab - Chrome tab object with id, title, url, favIconUrl, etc.
 * @returns {HTMLElement} Tab element to insert into DOM
 */
function createTabElement(tab) {
  const tabItem = document.createElement('div');
  tabItem.className = 'tab-item';
  // Tooltip shows full title and URL (helpful for truncated titles)
  tabItem.title = `${tab.title}\n${tab.url}`;

  // Highlight active tab with special styling
  if (tab.id === activeTabId) {
    tabItem.classList.add('active');
  }

  // Favicon - Shows website icon or fallback document emoji
  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  // Fallback if favicon fails to load
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  };
  tabItem.appendChild(favicon);

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

  // Close button (hidden by default, appears on hover)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));
  tabItem.appendChild(closeBtn);

  // Click tab to activate it (but not when clicking close button)
  tabItem.addEventListener('click', (e) => {
    if (e.target === closeBtn) return;
    activateTab(tab.id, tab.windowId);
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

  // Update count displays
  document.getElementById('tabCount').textContent = allTabs.length;
  document.getElementById('groupCount').textContent = allGroups.length;

  // Enable/disable "Close Duplicates" button based on whether duplicates exist
  const hasDuplicates = Object.values(urlCounts).some(count => count > 1);
  const closeBtn = document.getElementById('closeDuplicatesBtn');
  closeBtn.disabled = !hasDuplicates;

  // Render the UI
  renderTabs(currentSearchTerm);
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
 */
document.addEventListener('DOMContentLoaded', () => {
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
});
