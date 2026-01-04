/*
 * Tab Manager Chrome Extension
 * Created by: Steve Souza
 *
 * This is an experimental learning project.
 * Can be removed at any time.
 */

let allTabs = [];
let allGroups = [];
let activeGroupFilter = null;
let activeTabId = null;
let urlCounts = {};
let currentSearchTerm = '';
let duplicateFilterActive = false;

// Organize tabs into groups
function organizeTabsByGroup(tabs, groups) {
  const groupMap = new Map();
  const ungrouped = [];

  // Create group containers
  groups.forEach(group => {
    groupMap.set(group.id, {
      ...group,
      tabs: []
    });
  });

  // Sort tabs into groups
  tabs.forEach(tab => {
    if (tab.groupId === -1) {
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

// Build duplicate URL map
function buildDuplicateMap(tabs) {
  const counts = {};
  tabs.forEach(tab => {
    counts[tab.url] = (counts[tab.url] || 0) + 1;
  });
  return counts;
}

// Close a single tab
async function closeTab(tabId, event) {
  event.stopPropagation(); // Prevent activating the tab

  // Disable button to prevent double-clicks
  if (event.target) {
    event.target.disabled = true;
  }

  try {
    // Only close this specific tab (not duplicates)
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error('Error closing tab:', tabId, error);
  }

  // Reload UI
  await loadTabs();
}

// Close all tabs in a group
async function closeGroup(groupId, event) {
  event.stopPropagation(); // Prevent group filter toggle

  const tabsInGroup = allTabs.filter(tab => tab.groupId === groupId);
  const tabCount = tabsInGroup.length;

  // Confirm if many tabs
  if (tabCount > 5) {
    if (!confirm(`Close ${tabCount} tabs in this group?`)) return;
  }

  const tabIds = tabsInGroup.map(tab => tab.id);
  await chrome.tabs.remove(tabIds);
  await loadTabs();
}

// Activate a tab when clicked
async function activateTab(tabId, windowId) {
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });
}

// Render tabs in the UI
function renderTabs(searchTerm = '') {
  currentSearchTerm = searchTerm;
  const tabList = document.getElementById('tabList');
  tabList.innerHTML = '';

  const organized = organizeTabsByGroup(allTabs, allGroups);
  const lowerSearch = searchTerm.toLowerCase();

  // Filter function
  const matchesSearch = (tab) => {
    if (!searchTerm) return true;
    return tab.title.toLowerCase().includes(lowerSearch) ||
           tab.url.toLowerCase().includes(lowerSearch);
  };

  // Duplicate filter function
  const matchesDuplicateFilter = (tab) => {
    if (!duplicateFilterActive) return true;
    return urlCounts[tab.url] > 1;
  };

  // Combined filter
  const matchesAllFilters = (tab) => {
    return matchesSearch(tab) && matchesDuplicateFilter(tab);
  };

  // Render groups
  organized.groups.forEach(group => {
    const filteredTabs = group.tabs.filter(matchesAllFilters);
    const groupName = group.title || `${group.color} group`;
    const groupNameMatches = searchTerm && groupName.toLowerCase().includes(lowerSearch);

    // Skip group if filtered by another group
    if (activeGroupFilter !== null && activeGroupFilter !== group.id) return;

    // Skip group if no matching tabs AND group name doesn't match
    if (filteredTabs.length === 0 && !groupNameMatches) return;

    // Create group container
    const groupContainer = document.createElement('div');
    groupContainer.className = 'group-container';

    // Create group header
    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';
    groupHeader.dataset.groupId = group.id;
    groupHeader.dataset.groupColor = group.color;

    if (activeGroupFilter === group.id) {
      groupHeader.classList.add('filtered');
    }

    // Group name
    const groupNameSpan = document.createElement('span');
    groupNameSpan.className = 'group-name';
    groupNameSpan.textContent = groupName;
    groupHeader.appendChild(groupNameSpan);

    // Tab count
    const tabCountSpan = document.createElement('span');
    tabCountSpan.className = 'tab-count';
    tabCountSpan.textContent = ` (${group.tabs.length})`;
    groupHeader.appendChild(tabCountSpan);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => closeGroup(group.id, e));
    groupHeader.appendChild(closeBtn);

    // Click header to filter by group (but not on close button)
    groupHeader.addEventListener('click', (e) => {
      if (e.target === closeBtn) return;
      if (activeGroupFilter === group.id) {
        activeGroupFilter = null;
      } else {
        activeGroupFilter = group.id;
      }
      renderTabs(searchTerm);
    });

    groupContainer.appendChild(groupHeader);

    // Render tabs in group
    filteredTabs.forEach(tab => {
      const tabItem = createTabElement(tab);
      groupContainer.appendChild(tabItem);
    });

    tabList.appendChild(groupContainer);
  });

  // Render ungrouped tabs
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

// Create a tab element
function createTabElement(tab) {
  const tabItem = document.createElement('div');
  tabItem.className = 'tab-item';
  tabItem.title = `${tab.title}\n${tab.url}`;

  // Add active class if this is the active tab
  if (tab.id === activeTabId) {
    tabItem.classList.add('active');
  }

  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  favicon.onerror = () => {
    favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="12" font-size="12">📄</text></svg>';
  };
  tabItem.appendChild(favicon);

  // Tab title
  const titleSpan = document.createElement('span');
  titleSpan.className = 'tab-title';
  titleSpan.textContent = tab.title || 'Untitled';
  tabItem.appendChild(titleSpan);

  // Duplicate badge (if duplicate)
  if (urlCounts[tab.url] > 1) {
    const dupBadge = document.createElement('span');
    dupBadge.className = 'duplicate-badge';
    dupBadge.textContent = `${urlCounts[tab.url]}×`;
    dupBadge.title = `${urlCounts[tab.url]} tabs with this URL`;
    tabItem.appendChild(dupBadge);
  }

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));
  tabItem.appendChild(closeBtn);

  // Click to activate tab (but not on close button)
  tabItem.addEventListener('click', (e) => {
    if (e.target === closeBtn) return;
    activateTab(tab.id, tab.windowId);
  });

  return tabItem;
}

// Toggle duplicate filter
function toggleDuplicateFilter() {
  duplicateFilterActive = !duplicateFilterActive;

  const toggleBtn = document.getElementById('duplicateToggle');
  toggleBtn.classList.toggle('active', duplicateFilterActive);

  renderTabs(currentSearchTerm);
}

// Check if tab matches all active filters
function tabMatchesFilters(tab) {
  // Search filter
  if (currentSearchTerm) {
    const lowerSearch = currentSearchTerm.toLowerCase();
    const matchesSearch = tab.title.toLowerCase().includes(lowerSearch) ||
                         tab.url.toLowerCase().includes(lowerSearch);
    if (!matchesSearch) return false;
  }

  // Duplicate filter
  if (duplicateFilterActive && urlCounts[tab.url] <= 1) {
    return false;
  }

  // Group filter
  if (activeGroupFilter !== null && tab.groupId !== activeGroupFilter) {
    return false;
  }

  return true;
}

// Close all duplicate tabs (keep one of each) - only from visible/filtered tabs
async function closeDuplicateTabs() {
  // Build list of currently visible tabs based on active filters
  const visibleTabs = allTabs.filter(tabMatchesFilters);

  // Group visible tabs by URL
  const urlGroups = {};
  visibleTabs.forEach(tab => {
    if (!urlGroups[tab.url]) urlGroups[tab.url] = [];
    urlGroups[tab.url].push(tab);
  });

  // Find tabs to close (only from visible set)
  const tabsToClose = [];
  Object.values(urlGroups).forEach(tabs => {
    if (tabs.length > 1) {
      // Keep active tab if it's a duplicate, otherwise keep first tab
      let keepTab = tabs.find(t => t.id === activeTabId) || tabs[0];

      // Close all others
      tabs.forEach(tab => {
        if (tab.id !== keepTab.id) {
          tabsToClose.push(tab.id);
        }
      });
    }
  });

  // Confirm with context about filters
  if (tabsToClose.length > 0) {
    let message = `Close ${tabsToClose.length} duplicate tabs? (Keeps one of each URL)`;
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

// Load and display all tabs
async function loadTabs() {
  allTabs = await chrome.tabs.query({});
  allGroups = await chrome.tabGroups.query({});

  // Get active tab
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  activeTabId = activeTab?.id;

  // Build duplicate map
  urlCounts = buildDuplicateMap(allTabs);

  // Update counts
  document.getElementById('tabCount').textContent = allTabs.length;
  document.getElementById('groupCount').textContent = allGroups.length;

  // Enable/disable close duplicates button
  const hasDuplicates = Object.values(urlCounts).some(count => count > 1);
  const closeBtn = document.getElementById('closeDuplicatesBtn');
  closeBtn.disabled = !hasDuplicates;

  renderTabs(currentSearchTerm);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadTabs();

  // Search box listener
  document.getElementById('searchBox').addEventListener('input', (e) => {
    renderTabs(e.target.value);
  });

  // Duplicate toggle listener
  document.getElementById('duplicateToggle').addEventListener('click', toggleDuplicateFilter);

  // Close duplicates button listener
  document.getElementById('closeDuplicatesBtn').addEventListener('click', closeDuplicateTabs);
});
