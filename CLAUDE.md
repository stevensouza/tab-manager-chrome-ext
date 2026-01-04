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

- **manifest.json** - Extension config, permissions (tabs, tabGroups only - NO website content access)
- **background.js** - Service worker that updates badge with tab count (listens to tab create/remove events)
- **popup.html** - Popup UI structure (minimal, most elements created dynamically in JS)
- **popup.js** - Main application logic (350+ lines)
- **styles.css** - All styling including group colors matching Chrome's native groups

### Core Data Flow (popup.js)

```
loadTabs()
  ↓
  - Fetches allTabs (chrome.tabs.query)
  - Fetches allGroups (chrome.tabGroups.query)
  - Finds activeTabId (for highlighting)
  - Builds urlCounts map (for duplicate detection)
  - Updates tab/group count displays
  - Calls renderTabs()

renderTabs(searchTerm)
  ↓
  - Organizes tabs by groups (organizeTabsByGroup)
  - Applies filters: search, duplicate, group (tabMatchesFilters)
  - Renders group headers with tab counts
  - Renders tabs with favicons, badges, close buttons
  - Uses createTabElement() for each tab
```

### State Management (Global Variables in popup.js)

```javascript
allTabs = []              // All browser tabs
allGroups = []            // All tab groups
activeGroupFilter = null  // Currently filtered group ID (null = show all)
activeTabId = null        // ID of active tab (for highlighting)
urlCounts = {}            // Map of URL → count (for duplicate detection)
currentSearchTerm = ''    // Current search filter text
duplicateFilterActive = false  // "Show Only Duplicates" toggle state
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
