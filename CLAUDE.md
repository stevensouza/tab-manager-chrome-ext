# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tab Manager - A Chrome extension (Manifest V3) for managing browser tabs with groups, search, filtering, and duplicate detection. Created by Steve Souza as an experimental learning project.

## Development & Testing

### Loading/Testing the Extension

```bash
# In Chrome:
# 1. Navigate to chrome://extensions/
# 2. Enable "Developer mode" (top-right toggle)
# 3. Click "Load unpacked"
# 4. Select: /Users/stevesouza/my/data/claude_code/chrome_ext

# To reload after changes:
# Click the reload icon (🔄) next to "Tab Manager" in chrome://extensions/
```

### Complete Reinstall (if permissions cached)

```bash
# If Chrome caches old permissions:
# 1. Remove extension completely (not just disable)
# 2. Load unpacked again
# This forces Chrome to read fresh manifest.json permissions
```

## Architecture

### File Responsibilities

- **manifest.json** - Extension config, permissions (tabs, tabGroups, sessions, storage, history - NO website content access)
- **background.js** - Service worker that updates badge with tab count AND tracks group metadata for recently closed tabs
- **popup.html** - Popup UI structure (minimal, most elements created dynamically in JS)
- **popup.js** - Main application logic (1400+ lines)
- **styles.css** - All styling including group colors matching Chrome's native groups

### Permissions

- **tabs** - Read tab information (title, URL, etc.)
- **tabGroups** - Read and manage tab groups
- **history** - Access visit counts for tabs
- **sessions** - Access recently closed tabs via chrome.sessions API
- **storage** - Store group metadata for closed tabs (chrome.storage.local)

**NO website content access** - Extension never reads or modifies web page content.

### Core Data Flow (popup.js)

```
loadTabs()
  ↓
  - Fetches allTabs (chrome.tabs.query)
  - Fetches allGroups (chrome.tabGroups.query)
  - Finds activeTabId (for highlighting)
  - Builds urlCounts map (for duplicate detection)
  - Builds visitCounts map (from browser history)
  - Loads recentlyClosedTabs (chrome.sessions + group metadata)
  - Updates tab/group/closed count displays
  - Calls renderTabs()

renderTabs(searchTerm)
  ↓
  - Organizes tabs by groups (organizeTabsByGroup)
  - Sorts groups alphabetically (if group-recent mode)
  - Applies filters: search, duplicate, group (tabMatchesFilters)
  - Renders group headers with tab counts
  - Renders tabs with favicons, badges, close buttons (createTabElement)
  - Renders ungrouped tabs
  - Renders recently closed tabs (renderRecentlyClosedTabs) - ALWAYS LAST
```

### State Management (Global Variables in popup.js)

```javascript
allTabs = []              // All browser tabs
allGroups = []            // All tab groups
activeGroupFilter = null  // Currently filtered group ID (null = show all)
activeTabId = null        // ID of active tab (for highlighting)
urlCounts = {}            // Map of URL → count (for duplicate detection)
visitCounts = {}          // Map of URL → visit count (from history)
currentSearchTerm = ''    // Current search filter text
duplicateFilterActive = false  // "Show Only Duplicates" toggle state
currentSortOption = 'group-recent'  // Default sort mode (v2.2+)
recentlyClosedTabs = []   // Recently closed tabs from sessions API
closedTabsVisible = false // Toggle state for closed tabs section
```

### Filter Logic - Critical Implementation Detail

**Filters use AND logic** - all active filters must match for a tab to be visible.

The `tabMatchesFilters(tab)` function is shared by:
1. `renderTabs()` - for displaying tabs
2. `closeDuplicateTabs()` - for closing only visible duplicates

This ensures "Close Duplicates" respects active filters:
- Search "github" → only closes github duplicates
- Filter by group → only closes duplicates in that group
- Combined filters → respects all simultaneously

### Duplicate Detection Algorithm

```javascript
// 1. Build frequency map
urlCounts = { "https://github.com": 3, "https://gmail.com": 2 }

// 2. Visual badges
if (urlCounts[tab.url] > 1) { show "3×" badge }

// 3. Close duplicates (filter-aware)
visibleTabs = allTabs.filter(tabMatchesFilters)
// Group by URL, keep active tab or first tab, close others
```

### Event Handling Patterns

**Tab Close (Individual):**
```javascript
closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));
// - event.stopPropagation() prevents tab activation
// - Disables button to prevent double-clicks
// - Calls loadTabs() to refresh UI
```

**Group Header (Click to Filter):**
```javascript
groupHeader.addEventListener('click', (e) => {
  if (e.target === closeBtn) return; // Don't filter when closing
  activeGroupFilter = (activeGroupFilter === group.id) ? null : group.id;
  renderTabs(searchTerm);
});
```

## Chrome Extension Specifics

### Permissions Philosophy

**ONLY use `tabs` and `tabGroups` permissions** - Never add:
- ❌ `host_permissions` or `<all_urls>`
- ❌ `scripting` permission
- ❌ Website content access

The extension previously had word count feature requiring script injection - this was **intentionally removed** to eliminate scary "Read and change all your data on all websites" permission warning.

### Tab Group Colors

Chrome supports 9 group colors: grey, blue, red, yellow, green, pink, purple, cyan, orange

Map these in CSS using `data-group-color` attribute:
```css
.group-header[data-group-color="blue"] { background-color: #1A73E8; }
```

### Ungrouped Tabs

Tabs not in any group have `tab.groupId === -1`

### Service Worker (background.js)

Runs independently of popup. Updates badge even when popup closed.
Uses `chrome.action.setBadgeText()` and `chrome.action.setBadgeBackgroundColor()`.

## UI/UX Design Patterns

### Hover-Based Close Buttons

Close buttons (×) are hidden by default, appear on hover:
```css
.close-btn { opacity: 0; }
.tab-item:hover .close-btn { opacity: 0.6; }
```

### Active Tab Indicator

Active tab has:
- Blue left border (3px solid #1A73E8)
- Light blue background (#e8f0fe)
- Detected via `chrome.tabs.query({active: true, currentWindow: true})`

### Duplicate Badge Styling

Orange background (#E8710A), white text, shows count like "2×" or "3×"

### Confirmation Dialogs

- Group close: Confirm if >5 tabs
- Duplicate close: Always confirm, message indicates filter scope:
  - No filters: "Close X duplicate tabs? (Keeps one of each URL)"
  - With filters: "Close X duplicate tabs? (Only from currently filtered tabs)"

## Common Modifications

### Adding New Filter Type

1. Add state variable (e.g., `let pinnedFilterActive = false`)
2. Update `tabMatchesFilters()` to check new condition
3. Add UI control in popup.html
4. Wire up event listener in DOMContentLoaded

### Changing Permissions

**Always test permission changes by:**
1. Completely removing extension
2. Reloading unpacked
3. Checking chrome://extensions for permission warnings

### Attribution Requirements

All JS files have header comment:
```javascript
/*
 * Tab Manager Chrome Extension
 * Created by: Steve Souza
 *
 * This is an experimental learning project.
 * Can be removed at any time.
 */
```

Footer in popup.html:
```html
<div class="footer">
  Created by Steve Souza | Experimental Project
</div>
```

## Critical Bug Fixes Applied

### Individual Tab Close Bug (Fixed)

**Issue:** Clicking × on one duplicate tab was closing all tabs with that URL.

**Fix:** Added defensive code in `closeTab()`:
- Disable button immediately to prevent double-clicks
- Explicit try-catch around `chrome.tabs.remove(tabId)`
- Comment: "Only close this specific tab (not duplicates)"

### Close Duplicates Filter-Awareness (Added)

**Enhancement:** "Close Duplicates" button now respects all active filters using `tabMatchesFilters()` shared function.

This ensures closing duplicates only affects visible/filtered tabs, not all tabs browser-wide.

## Recently Closed Tabs Feature (v2.2)

### Overview

Track and restore the last 25 closed tabs with original group restoration.

### Visual Presentation

- Displayed as a special section inline with groups
- **Always appears LAST** (after all regular groups, including ungrouped)
- Grayed out appearance with restore icon (↶) instead of close button
- Toggle button to show/hide section: "Show Recently Closed (X)"

### Data Architecture

**Two-part system:**

1. **Tab data** - From `chrome.sessions.getRecentlyClosed()` API
   - URL, title, favicon, closedAt timestamp
   - Provided by Chrome automatically

2. **Group metadata** - From background.js tracking
   - groupId, groupTitle, groupColor
   - Stored in `chrome.storage.local` (sessions API doesn't include groups)
   - Background.js maintains cache of current tab states
   - When tab closes, saves group info keyed by URL+timestamp

### Background.js Group Tracking

**Flow:**

```javascript
// Maintain cache of current tab → group mapping
tabGroupCache = new Map() // tabId → {url, groupId, groupTitle, groupColor}

// Update cache when tabs change
chrome.tabs.onUpdated → update tabGroupCache

// When tab closes, save to storage
chrome.tabs.onRemoved → save groupMetadata to chrome.storage.local

// On startup, initialize cache
chrome.tabs.query → populate tabGroupCache
```

**Storage format:**

```javascript
chrome.storage.local.closedTabGroups = {
  "https://github.com_1234567890": {
    url: "https://github.com",
    groupId: 42,
    groupTitle: "Work",
    groupColor: "blue",
    closedAt: 1234567890
  },
  // ... (keeps last 100 entries to prevent unbounded growth)
}
```

### Matching Algorithm (popup.js)

When loading closed tabs, matches sessions data with group metadata:

1. Get sessions from `chrome.sessions.getRecentlyClosed()`
2. Load group metadata from `chrome.storage.local`
3. For each closed tab:
   - Find metadata entries with matching URL
   - Pick closest timestamp match (within 5 seconds)
   - Attach groupInfo if found, null otherwise

### Group Restoration

**When restoring a tab:**

1. Try `chrome.sessions.restore(sessionId)` first
2. If tab had `groupInfo`:
   - Check if original group still exists (`chrome.tabGroups.get(groupId)`)
   - If exists: add tab to that group
   - If deleted: tab stays ungrouped (graceful degradation)
3. If session restore fails:
   - Fallback to `chrome.tabs.create({url})`
   - Still attempts group restoration if info exists

**Key insight:** Group restoration is best-effort, never fails restoration.

### Search Integration

- Closed tabs respect search filter (title/URL match)
- Filtered dynamically in `renderRecentlyClosedTabs()`

### UI Behavior

- Click tab row OR restore button (↶) to restore
- Grayed out styling indicates tab is not currently open
- Time badge shows "5m ago", "2h ago", "3d ago", etc.
- Toggle button state persisted in localStorage

### Limitations

- Chrome sessions API limit: 25 tabs (enforced by Chrome API)
- Group metadata storage limit: 100 entries (auto-prunes oldest)
- Timestamp matching tolerance: 5 seconds (handles async timing)
- Incognito tabs excluded automatically by Chrome

## Enhanced Default Sorting (v2.2)

### New Default: Group-Recent Mode

**Behavior:**

- **Groups:** Sorted alphabetically by title (A→Z)
  - Unnamed groups use color name ("blue group", "red group", etc.)
- **Within each group:** Tabs sorted by `lastAccessed` (most recent first = descending)
- **Special positions:**
  - Ungrouped tabs: After all named groups
  - Recently Closed: Always LAST

### Implementation

**Group sorting (renderTabs):**

```javascript
if (currentSortOption === 'group-recent') {
  organized.groups.sort((a, b) => {
    const nameA = a.title || `${a.color} group`;
    const nameB = b.title || `${b.color} group`;
    return nameA.localeCompare(nameB);
  });
}
```

**Tab sorting (sortTabs):**

```javascript
case 'group-recent':
  return sorted.sort((a, b) => {
    const timeA = a.lastAccessed || 0;
    const timeB = b.lastAccessed || 0;
    return timeB - timeA;  // Descending (most recent first)
  });
```

### Why This Is Better

- **Intuitive:** Most recently used tabs at top of each group
- **Organized:** Groups alphabetically for easy navigation
- **Consistent:** Predictable ordering vs. random browser tab order

### Global Sort Disabled

Group-recent mode is designed for **per-group sorting only**.

Global sort checkbox is hidden when:
- `currentSortOption === 'default'` (browser tab order)
- `currentSortOption === 'group-recent'` (NEW)

This prevents user confusion about incompatible modes.

### Dropdown Options

```html
<option value="group-recent">Sort: Groups (A→Z) + Recent First (Default)</option>
<option value="default">Sort: Browser Tab Order</option>
<!-- Other sort options... -->
```

### Backward Compatibility

Users with saved `localStorage.getItem('tabManagerSortOption')` preference:
- If set to 'default': Still uses browser tab order
- If set to other mode: Retains preference
- **New users:** Default to 'group-recent'

## Version History

- **v2.2** - Recently Closed Tabs + Enhanced Default Sorting (group-recent mode)
- **v2.1** - Visit counts, collapsible UI, wider popup
- **v2.0** - Sort functionality with global/per-group modes
- **v1.x** - Interactive pin/unpin, mute/unmute, visual indicators, age-based color coding
