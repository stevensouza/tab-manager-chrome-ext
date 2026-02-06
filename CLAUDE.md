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
- **popup.js** - Main application logic (1800+ lines)
- **styles.css** - All styling including group colors matching Chrome's native groups

### Permissions

- **tabs** - Read tab information (title, URL, etc.)
- **tabGroups** - Read and manage tab groups
- **history** - Access visit counts for tabs
- **sessions** - Access recently closed tabs via chrome.sessions API
- **storage** - Store group metadata for closed tabs (chrome.storage.local) + favorite sites (chrome.storage.sync)

**NO website content access** - Extension never reads or modifies web page content.

### Core Data Flow (popup.js)

```
DOMContentLoaded
  ↓
  - Restores persisted state from localStorage (v2.4+):
    - Search term (tabManagerSearchTerm)
    - Chip filter states (tabManagerChipState)
    - Sort option, global sort, closed tabs visibility
  - Calls loadTabs()

loadTabs()
  ↓
  - Fetches allTabs (chrome.tabs.query)
  - Fetches allGroups (chrome.tabGroups.query)
  - Finds activeTabId (for highlighting)
  - Builds urlCounts map (for duplicate detection)
  - Builds visitCounts map (from browser history)
  - Loads recentlyClosedTabs (chrome.sessions + group metadata)
  - Loads favoriteSites (chrome.storage.sync)
  - Updates tab/group/closed/favorites count displays
  - Calls renderTabs()

renderTabs(searchTerm)
  ↓
  - Organizes tabs by groups (organizeTabsByGroup)
  - Sorts groups alphabetically (if group-recent mode)
  - Applies filters: search, duplicate, chips (tabMatchesFilters)
  - Renders group headers with chevron, tab counts, collapse/expand on click
  - Renders tabs with favicons, badges, star/close buttons (createTabElement)
  - Renders ungrouped tabs
  - Renders recently closed tabs (renderRecentlyClosedTabs) - hidden when chips active
  - Renders favorite sites (renderFavoriteSites) - ALWAYS LAST, hidden when non-Faves chips active
    - Compares exact URLs (not origins) to determine if favorite is open
```

### State Management (Global Variables in popup.js)

```javascript
allTabs = []              // All browser tabs
allGroups = []            // All tab groups
collapsedGroups = new Set()  // Group IDs that are collapsed (accordion) - PERSISTED to localStorage
activeTabId = null        // ID of active tab (for highlighting)
urlCounts = {}            // Map of URL → count (for duplicate detection)
visitCounts = {}          // Map of URL → visit count (from history)
currentSearchTerm = ''    // Current search filter text - PERSISTED to localStorage
duplicateFilterActive = false  // Duplicates chip state - PERSISTED to localStorage
currentSortOption = 'group-recent'  // Default sort mode (v2.2+) - PERSISTED to localStorage
recentlyClosedTabs = []   // Recently closed tabs from sessions API
closedTabsVisible = false // Toggle state for closed tabs section - PERSISTED to localStorage
favoriteSites = []        // Favorite sites from chrome.storage.sync
audioFilterActive = false // Audio chip state - PERSISTED to localStorage
pinnedFilterActive = false // Pinned chip state - PERSISTED to localStorage
favoritesFilterActive = false // Favorites chip state - PERSISTED to localStorage
oldTabsFilterActive = false // Stale (1w+) chip state - PERSISTED to localStorage
combineFiltersMode = false // AND mode for chips (default: single-select) - PERSISTED to localStorage
```

### Filter Logic - Critical Implementation Detail

**Filters use AND logic** - all active filters must match for a tab to be visible.

The `tabMatchesFilters(tab)` function is shared by:
1. `renderTabs()` - for displaying tabs (via `matchesAllFilters`)
2. `closeDuplicateTabs()` - for closing only visible duplicates

Filters checked (all AND):
- Search term (title/URL match)
- Duplicate filter (chip)
- Audio filter (chip: `tab.audible || tab.mutedInfo?.muted`)
- Pinned filter (chip: `tab.pinned`)
- Favorites filter (chip: origin matches a favorite site)
- Old tabs filter (chip: `lastAccessed > 1 week ago`)

Note: Group collapse (accordion) is purely visual — it does NOT affect `tabMatchesFilters`.
Search auto-expands collapsed groups that contain matching tabs.

This ensures "Close Duplicates" respects active filters:
- Search "github" → only closes github duplicates
- Combined filters → respects all simultaneously

### Filter Chips Behavior

**Single-select mode (default):** Clicking a chip deselects all others.
**AND mode:** Check the "AND" checkbox to combine multiple chips.

**Section visibility:** When any chip is active, recently closed and favorite sites
sections are hidden (chips only filter open tabs). Exception: Favorites chip keeps
the favorite sites section visible.

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

**Group Header (Click to Collapse/Expand):**
```javascript
groupHeader.addEventListener('click', (e) => {
  if (e.target === closeBtn) return; // Don't collapse when closing
  toggleGroupCollapse(group.id);
  renderTabs(searchTerm);
});
// Chevron shows ▶ (collapsed) or ▼ (expanded)
// Collapse state persisted to localStorage (tabManagerCollapsedGroups)
// Search auto-expands collapsed groups with matching tabs
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

## Feature Specifications (see docs/)

Detailed specs are in separate files — read these when modifying a specific feature:
- docs/FEATURE_RECENTLY_CLOSED.md - Recently Closed Tabs (v2.2)
- docs/FEATURE_SORTING.md - Enhanced Default Sorting (v2.2)
- docs/FEATURE_KEYBOARD_NAVIGATION.md - Keyboard Navigation (v2.3)
- docs/FEATURE_FAVORITES.md - Favorite Sites (v2.4)
- docs/FEATURE_FILTER_CHIPS.md - Filter Chips (v2.4)
- docs/FEATURE_STATE_PERSISTENCE.md - State Persistence (v2.4+)

## Version History

- **v2.4** - Favorite Sites + Filter Chips + State Persistence
  - Full-URL favorites (bookmark-style, not domain-level)
  - 5 filter chip types (Duplicates, Audio, Pinned, Favorites, Stale)
  - Single-select and AND mode for chips
  - Persist filter/search state to localStorage across popup sessions
- **v2.3** - Keyboard shortcuts for tab navigation + clickable help modal
- **v2.2** - Recently Closed Tabs + Enhanced Default Sorting (group-recent mode)
- **v2.1** - Visit counts, collapsible UI, wider popup
- **v2.0** - Sort functionality with global/per-group modes
- **v1.x** - Interactive pin/unpin, mute/unmute, visual indicators, age-based color coding
