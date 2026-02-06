# Tab Manager Chrome Extension

**Repository:** https://github.com/stevensouza/tab-manager-chrome-ext

This Chrome extension helps you manage browser tabs with features like search, filtering, sorting, group organization, duplicate detection, pin/mute controls, and age-based visual indicators. **Version 1.0 was built from scratch in less than one hour** using Claude Code—despite having no prior experience with Chrome extension development and no defined requirements at the start. By iterating on ideas in real-time and letting the development process evolve organically, Claude Code helped transform initial concepts into a functional extension. This demonstrates what AI-assisted development can enable: going from zero knowledge to a working product in under 60 minutes.

**Important Context:** I created this extension as a learning experiment with no prior Chrome extension development experience. It has worked well for my personal use, but I can't speak to the code quality or whether it follows Chrome extension best practices. The good news: the extension **only accesses tab metadata** (titles, URLs, and group names) and **does not read or modify any website content or other browser data**—it cannot change anything you've typed, stored, or browsed. See the [Permissions](#permissions) section below for technical details. Use at your own discretion, and feel free to use as-is or modify it however you like.

**Created by:** Steve Souza using Claude Code (01/26)
**Status:** Experimental learning project

## Table of Contents

- [Features](#features)
- [UI Preview](#ui-preview)
- [Installation](#installation)
- [Usage](#usage)
- [Permissions](#permissions)
- [File Structure](#file-structure)
- [Technical Details](#technical-details)
- [Known Limitations](#known-limitations)
- [Development](#development)
- [Changelog](#changelog)
- [License](#license)
- [Support](#support)

## Features

### ⌨️ Keyboard Shortcuts (v2.3)

**Toggle between current and previous tab:**
- Windows/Linux: `Ctrl+Shift+Up`
- Mac: `⌘⇧↑` (Cmd+Shift+Up)

**Navigate to older tab (by last accessed):**
- Windows/Linux: `Ctrl+Shift+Left`
- Mac: `⌘⇧←` (Cmd+Shift+Left)

**Navigate to newer tab (by last accessed):**
- Windows/Linux: `Ctrl+Shift+Right`
- Mac: `⌘⇧→` (Cmd+Shift+Right)

**Customizable** - Change shortcuts at `chrome://extensions/shortcuts`

### ⭐ Favorite Sites (v2.4)
- **Star any tab** - Hover to see ☆ button, click to save site as favorite
- **Domain-level matching** - Stores origin only (e.g., `https://mail.google.com`), ignores paths/session IDs
- **Find or open** - Unopened favorites appear grayed out at bottom of popup, click to open
- **Cross-device sync** - Favorites stored in `chrome.storage.sync`
- **Smart visibility** - Favorites disappear from bottom section when the site is open

### 🏷️ Filter Chips (v2.4)
- **Always visible** - Row of pill buttons above search box (no need to expand controls)
- **5 filter types** - Duplicates, Audio, Pinned, Favorites, Stale (1w+)
- **Single-select default** - Clicking one chip deselects others
- **AND mode** - Check "AND" checkbox to combine multiple filters
- **Clean results** - Recently closed and favorites sections hidden when filtering

### 📂 Collapsible Groups & View Toggle (v2.5)
- **Accordion groups** - Click any group header to collapse/expand its tabs
- **Chevron indicator** - ▼ (expanded) / ▶ (collapsed) on group headers
- **Collapse/Expand All** - Button on search row to toggle all groups at once
- **[Groups | All] toggle** - Segmented control to switch between grouped and flat views
- **Search clear button** - X button inside search box for quick clearing
- **State persisted** - Collapse state and view mode saved to localStorage

### 🔍 Search & Filter
- **Real-time search** - Filter tabs by title or URL
- **Group name search** - Search by tab group names
- **Search auto-expand** - Collapsed groups auto-expand when they contain search matches
- **Clear Filters** - One-click button to reset all filters, chips, and sorting

### 📊 Tab Management
- **Tab count badge** - Shows total tab count in extension icon
- **Group organization** - Visual display of Chrome's native tab groups with matching colors
- **Tab counts** - Shows number of tabs in each group
- **Active tab indicator** - Highlights currently active tab with blue border
- **Pin/Unpin tabs** - Click 📌/📍 button to toggle pin state without switching tabs
- **Mute/Unmute tabs** - Click 🔇/🔊/🔈 button to toggle audio without switching tabs

### 🔄 Sorting
- **10 sort options** - Groups (A→Z) + Recent First (default), Browser Tab Order, Title (A→Z, Z→A), URL (A→Z, Z→A), Age (Newest/Oldest), Most/Least Visited
- **Smart default** - Groups alphabetically, tabs by most recent first within each group
- **Per-group sorting** - Sort tabs within each group (default for most modes)
- **Global sorting** - Optional checkbox to sort all tabs together across groups (disabled for default modes)
  - Shows group badges when globally sorted
  - Persists sort preference across sessions
- **Persistent preferences** - Remembers your sort choice and global sort setting

### ↶ Recently Closed Tabs
- **Session history** - Track last 25 closed tabs with Chrome sessions API
- **Group restoration** - Tabs restore to their original group if it still exists
- **Group badges** - Colored badges show which group the tab will restore to
- **Toggle visibility** - Show/hide recently closed section with button
- **Click to restore** - Click any closed tab or restore button (↶) to reopen
- **Search integration** - Search works on closed tabs (filter by title/URL)
- **Smart fallback** - If original group deleted, tab opens ungrouped
- **Always last** - Recently closed section appears after all groups and ungrouped tabs

### ❌ Close Operations
- **Individual tab close** - Hover over any tab to see close button
- **Close entire groups** - Hover over group header to close all tabs in group (confirms if >5 tabs)
- **Close duplicates** - Removes duplicate tabs while keeping one of each URL
  - Respects active filters (search, group, duplicate filter)
  - Keeps active tab if it's a duplicate, otherwise keeps first tab

### 🔁 Duplicate Detection
- **Visual badges** - Shows "2×", "3×", etc. for duplicate URLs
- **Smart filtering** - Filter to show only tabs with duplicates
- **Filter-aware closing** - Close duplicates only from current view/filters

### 📊 Visit History
- **Visit count badges** - Shows total visits from browser history (blue badge)
- **Most Visited sort** - Sort tabs by frequency of visits
- **Least Visited sort** - Find rarely-used tabs for cleanup
- **Smart thresholds** - Only shows badges for 10+ visits to reduce clutter

### 🎨 Visual Features
- **Favicons** - Website icons displayed next to tab names
- **Color-coded groups** - Matches Chrome's tab group colors (blue, red, yellow, green, pink, purple, cyan, orange, grey)
- **Age-based color coding** - Tab borders indicate last access time:
  - 🟢 Green: ≤ 2 hours (recently accessed)
  - 🟡 Yellow: ≤ 24 hours (accessed hours ago)
  - 🟠 Orange: ≤ 1 week (days old)
  - 🔴 Red: > 1 week (very old tabs)
- **Hover effects** - Clean UI with smooth transitions
- **Interactive badges** - Pin, mute, and close buttons with tactile feedback (scale animations)

## UI Preview

### Default View (Controls Collapsed)
```
┌───────────────────────────────────────────────────────────┐
│ Tab Manager                                          ℹ️   │
│ by Steve Souza & Claude Code (01/26)                      │
│                                                           │
│ Total groups: 3 | Total tabs: 12                         │
│                                                           │
│ [▼ Filters & Sort                                      ]  │ ← Click to expand
│                                                           │
│ [Duplicates] [Audio] [Pinned] [Favorites] [Stale(1w+)] ☐AND │ ← Filter chips
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Search tabs and groups...                             │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🔵 Work (5)                                      [×]│   │ ← Group header
│ └─────────────────────────────────────────────────────┘   │
│  🌐📌🔈 GitHub - Pull Requests      [42]     [☆]  [×]  │ ← Star to favorite
│  📧 Gmail - Inbox             [2×] [89] 🔇   [★]  [×]  │ ← Already favorited
│  📊 Google Sheets - Q1 Data        [156]     [☆]  [×]  │
│  📧 Gmail - Inbox             [2×] [89]      [☆]  [×]  │
│  📝 Notion - Projects                        [☆]  [×]  │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🟢 Research (4)                                  [×]│   │
│ └─────────────────────────────────────────────────────┘   │
│  📄 Wikipedia - React                        [☆]  [×]  │
│  🔍 Stack Overflow - Async Questions  [3×]   [☆]  [×]  │
│  📰 Medium - Web Development                [☆]  [×]  │
│  🔍 Stack Overflow - Async Questions  [3×]   [☆]  [×]  │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Ungrouped Tabs (3)                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│  🎵🔊 YouTube - Music                       [☆]  [×]  │ ← Playing audio
│  🛒 Amazon - Shopping Cart         [2×]     [☆]  [×]  │
│  🛒 Amazon - Shopping Cart         [2×]     [☆]  [×]  │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Recently Closed (3)                                 │   │
│ └─────────────────────────────────────────────────────┘   │
│  📰 CNN News Article          🔵Work    5m ago       [↶]  │
│  🔍 Stack Overflow Question              2h ago      [↶]  │
│  📧 Gmail - Old Email         🟢Research 1d ago      [↶]  │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ⭐ Favorite Sites (1)                               │   │ ← Gold header
│ └─────────────────────────────────────────────────────┘   │
│  🐙 GitHub                                          [×]  │ ← Grayed out, click to open
│                                                           │
│ Created by Steve Souza | Experimental Project             │
└───────────────────────────────────────────────────────────┘
```

### With Controls Expanded
```
┌───────────────────────────────────────────────────────────┐
│ Tab Manager                                          ℹ️   │
│ by Steve Souza & Claude Code (01/26)                      │
│                                                           │
│ Total groups: 3 | Total tabs: 12                         │
│                                                           │
│ [▲ Filters & Sort                                      ]  │ ← Click to collapse
│                                                           │
│ [Close Duplicates] [Show Recently Closed (3)]            │
│ [Sort: Most Visited First ▼]      [Clear Filters]        │
│ ☑ Sort globally (across all groups)                      │
│                                                           │
│ [Duplicates] [Audio] [Pinned] [Favorites] [Stale(1w+)] ☐AND │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Search tabs and groups...                             │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│ [Tab list appears here...]                               │
│                                                           │
│ Created by Steve Souza | Experimental Project             │
└───────────────────────────────────────────────────────────┘
```

### With Sort by Title (A→Z) - Per-Group Mode
```
┌─────────────────────────────────────────┐
│ Tab Manager                        ℹ️   │
│ by Steve Souza & Claude Code (01/26)    │
│                                         │
│ Total tab groups: 3                     │
│ Total tabs: 12                          │
│                                         │
│ [Close Duplicates] [Show Recently ...]  │
│ [Sort: Title (A→Z)▼]      [Clear]      │ ← Sort active
│ ☐ Sort globally (across all groups)    │ ← Checkbox (unchecked)
│ ┌─────────────────────────────────────┐ │
│ │ Search tabs and groups...           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🔵 Work (5)                    [×]│   │
│ └───────────────────────────────────┘   │
│  📧 Gmail - Inbox          [2×] 🔇  [×]  │ ← Sorted alphabetically
│  📧 Gmail - Inbox          [2×]     [×]  │    within Work group
│  🌐📌🔈 GitHub - Pull Req...       [×]   │
│  📊 Google Sheets - Q1 Data       [×]   │
│  📝 Notion - Projects              [×]  │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🟢 Research (4)                [×]│   │
│ └───────────────────────────────────┘   │
│  📰 Medium - Web Dev               [×]  │ ← Sorted alphabetically
│  🔍 Stack Overflow - Async    [3×] [×]  │    within Research group
│  🔍 Stack Overflow - Async    [3×] [×]  │
│  📄 Wikipedia - React              [×]  │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ Ungrouped Tabs (3)                │   │
│ └───────────────────────────────────┘   │
│  🛒 Amazon - Cart             [2×] [×]  │
│  🛒 Amazon - Cart             [2×] [×]  │
│  🎵🔊 YouTube - Music              [×]  │
│                                         │
│ Created by Steve Souza | Experimental   │
└─────────────────────────────────────────┘
```

### With Global Sort (Title A→Z) - All Tabs Together
```
┌─────────────────────────────────────────┐
│ Tab Manager                        ℹ️   │
│ by Steve Souza & Claude Code (01/26)    │
│                                         │
│ Total tab groups: 3                     │
│ Total tabs: 12                          │
│                                         │
│ [Close Duplicates] [Show Recently ...]  │
│ [Sort: Title (A→Z)▼]      [Clear]      │
│ ☑ Sort globally (across all groups)    │ ← Checkbox CHECKED
│ ┌─────────────────────────────────────┐ │
│ │ Search tabs and groups...           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│  🛒 🔘No Group Amazon - Cart  [2×] [×]  │ ← Flat list, alphabetically
│  🛒 🔘No Group Amazon - Cart  [2×] [×]  │    sorted across ALL groups
│  📧 🔵Work Gmail - Inbox     [2×] 🔇[×] │ ← Group badge shown
│  📧 🔵Work Gmail - Inbox     [2×]   [×] │
│  🌐📌🔈🔵Work GitHub - Pull...     [×]   │
│  📊 🔵Work Google Sheets...        [×]  │
│  📰 🟢Research Medium - Web Dev    [×]  │
│  📝 🔵Work Notion - Projects       [×]  │
│  🔍 🟢Research Stack Overflow [3×] [×]  │
│  🔍 🟢Research Stack Overflow [3×] [×]  │
│  🔍 🟢Research Stack Overflow [3×] [×]  │
│  📄 🟢Research Wikipedia - React   [×]  │
│  🎵🔊🔘No Group YouTube - Music    [×]  │
│                                         │
│ Created by Steve Souza | Experimental   │
└─────────────────────────────────────────┘
```

### Legend
- [▼ Filters & Sort] - Toggle button (click to show/hide controls)
- [▲ Filters & Sort] - Controls expanded (click to collapse)
- [Duplicates] [Audio] etc. - Filter chips (click to filter, always visible)
- ☐AND - Combine multiple chip filters (default: single-select)
- 🔵🟢🔴🟡 - Group color badges (in recently closed and global sort mode)
- 🔘No Group - Ungrouped tab badge (gray, appears in global sort mode)
- [×] - Close button (appears on hover for open tabs / favorite sites)
- [↶] - Restore button (always visible for closed tabs)
- [☆] - Add to favorites (appears on hover)
- [★] - Already favorited (click to remove)
- [2×][3×] - Duplicate count badge (orange, current tabs only)
- [42][156] - Visit count badge (blue, total visits from browser history)
- 5m ago, 2h ago, 1d ago - Time since tab was closed (recently closed section)
- 📌 - Pinned tab indicator (clickable toggle)
- 🔇 - Muted tab (clickable toggle)
- 🔊 - Playing audio (clickable to mute)
- 🔈 - Silent tab, mute button (appears on hover)
- Blue left border - Active tab indicator
- 🟢 Green border - Recently accessed (≤2 hours)
- 🟡 Yellow border - Accessed hours ago (≤24 hours)
- 🟠 Orange border - Days old (≤1 week)
- 🔴 Red border - Very old (>1 week)
- Grayed out (grey) - Recently closed tab (not currently open)
- Grayed out (gold border) - Favorite site not currently open
- Favicon emojis - Website icons (🌐📧📊🔍📄📰🎵🛒)
- ℹ️ - Info icon (click to see help modal)

## Installation

### Local Installation (Developer Mode)

1. **Download/Clone** this folder to your computer

2. **Open Chrome Extensions:**
   - Navigate to `chrome://extensions/`
   - Or Menu → More Tools → Extensions

3. **Enable Developer Mode:**
   - Toggle "Developer mode" in the top-right corner

4. **Load Extension:**
   - Click "Load unpacked"
   - Select the `tab-manager-chrome-ext` folder
   - Extension icon appears in toolbar

5. **Pin Extension (Optional):**
   - Click puzzle icon 🧩 in Chrome toolbar
   - Find "Tab Manager"
   - Click pin icon 📌 to keep visible

## Usage

### Basic Operations

**View Tabs:**
- Click extension icon to open popup
- See all tabs organized by groups
- Total tab groups and total tabs displayed at top

**Search Tabs:**
- Type in search box to filter tabs by title, URL, or group name
- Results update in real-time

**Close Tabs:**
- Hover over any tab to see × button
- Click × to close that specific tab
- Hover over group header to close entire group

**Activate Tab:**
- Click any tab in the list to switch to it
- Switches window focus if tab is in another window

### Filter Chips

**Quick Filters (always visible above search box):**
- **Duplicates** - Show only tabs with duplicate URLs
- **Audio** - Show only tabs playing or muting audio
- **Pinned** - Show only pinned tabs
- **Favorites** - Show only favorited sites (open + unopened grayed out)
- **Stale (1w+)** - Show only tabs not accessed in over a week

**Single-select (default):** Clicking one chip deselects others.
**AND mode:** Check the "AND" checkbox to combine multiple filters.

When chips are active, recently closed and favorites sections are hidden for a clean filtered view.

### Favorite Sites

**Add Favorites:**
1. Hover over any tab to see the ☆ star button
2. Click ☆ to save the site as a favorite (stores domain only)
3. Star changes to ★ to indicate it's favorited

**View Unopened Favorites:**
- Favorites not currently open appear grayed out at the bottom (gold border)
- Click to open the site in a new tab
- Section automatically hides when the site is open

**Remove Favorites:**
- Hover over a grayed-out favorite and click × to remove

### Duplicate Management

**View Duplicates:**
1. Orange badges (e.g., "2×") appear on duplicate tabs
2. Click "Duplicates" chip to filter view
3. Click again to show all tabs

**Close Duplicates:**
1. Expand "Filters & Sort" controls
2. Click "Close Duplicates" button
3. Keeps one copy of each duplicate URL
4. Preferentially keeps the active tab
5. Respects all active filters (search, group, chips)

### Filter Combinations

Filters work together (AND logic when AND checkbox is checked):
- Search + Group filter → Shows tabs matching both
- Search + Duplicates chip → Shows duplicates matching search
- Multiple chips + Search → All conditions must match

Click group header again to clear group filter.

### Recently Closed Tabs

**View Recently Closed:**
1. Click "Filters & Sort" to expand controls
2. Click "Show Recently Closed (X)" button to toggle visibility
3. Recently Closed section appears at bottom (after ungrouped tabs)

**Restore Tabs:**
- Click any closed tab to restore it
- Click the restore button (↶) on the right
- Tab opens in original group if group still exists
- If group was deleted, tab opens ungrouped

**Features:**
- Colored badges show which group tab will restore to
- Time badges show when tab was closed (5m ago, 2h ago, etc.)
- Search works on closed tabs (filter by title or URL)
- Tracks last 25 closed tabs (Chrome API limit)
- Toggle state persists (stays on/off across sessions)

## Permissions

**Required permissions:**
- **Read tab information** (`tabs`) - To access tab titles, URLs, and metadata
- **View and manage your tab groups** (`tabGroups`) - To read and display tab group information
- **Read your browsing history** (`history`) - To show visit counts from browser history (data never leaves your browser)
- **Access recently closed tabs** (`sessions`) - To track and restore recently closed tabs
- **Store data** (`storage`) - Group metadata for closed tabs (local), favorite sites synced across devices (sync)

**No website content access** - Extension does not read or modify webpage content.

## File Structure

```
tab-manager-chrome-ext/
├── manifest.json       # Extension configuration
├── background.js       # Badge counter + group metadata tracking for closed tabs
├── popup.html          # Popup UI structure
├── popup.js            # Main logic (search, filter chips, sort, favorites, duplicates, recently closed)
├── styles.css          # Styling (includes filter chips, favorites, interactive buttons, age colors)
├── icons/              # Extension icons (16, 32, 48, 128px)
├── CLAUDE.md           # Development guide for Claude Code
└── README.md           # This file
```

## Technical Details

- **Manifest Version:** 3 (latest Chrome extension standard)
- **Permissions:** `tabs`, `tabGroups`, `history`, `sessions`, `storage`
- **No external dependencies**
- **Pure JavaScript** (no frameworks)
- **Service Worker** for background badge updates + group metadata tracking
- **Chrome APIs:** `chrome.tabs`, `chrome.tabGroups`, `chrome.sessions`, `chrome.storage.local`, `chrome.storage.sync`, `chrome.history`, `chrome.action`, `chrome.windows`

## Known Limitations

- Cannot close special Chrome pages (`chrome://`, `chrome-extension://`)
- Favicon may not load for some websites (shows 📄 placeholder)
- Extension popup closes when clicking tabs (Chrome behavior)

## Development

**Built with:**
- Chrome Extensions Manifest V3
- Vanilla JavaScript
- Chrome APIs: `chrome.tabs`, `chrome.tabGroups`, `chrome.sessions`, `chrome.storage.local`, `chrome.storage.sync`, `chrome.history`, `chrome.action`, `chrome.windows`

**Key Implementation Details:**
- Background service worker tracks group metadata for closed tabs
- Group info stored in `chrome.storage.local` (sessions API doesn't include groups)
- Timestamp matching algorithm pairs session data with group metadata
- Smart caching prevents group info loss during tab close sequence

**Code comments indicate:**
- Created by Steve Souza with Claude Code
- Experimental learning project
- Can be removed at any time

## Changelog

**Version 2.5 (2026-02-06)**
- 🔍 **NEW:** Search clear X button — clears search text in one click
- 📂 **NEW:** Accordion collapse/expand for tab groups — click group header, chevron indicator, state persisted
- 📂 **NEW:** Collapse/Expand All button on search row
- 🔀 **NEW:** Segmented [Groups | All] view toggle — replaces hidden "Sort globally" checkbox
- 🔀 **NEW:** Tooltips on Groups/All toggle buttons
- 🔍 Search auto-expands collapsed groups containing matching tabs
- 💾 Collapse state and view mode persisted to localStorage

**Version 2.4 (2026-01-31)**
- ⭐ **NEW:** Favorite Sites - star any tab to save as favorite, unopened favorites shown grayed out at bottom
- ⭐ **NEW:** Domain-level matching - stores origin only, ignores paths/session IDs (e.g., Gmail → `https://mail.google.com`)
- ⭐ **NEW:** Cross-device sync for favorites via `chrome.storage.sync`
- 🏷️ **NEW:** Filter chips row - Duplicates, Audio, Pinned, Favorites, Stale (1w+) - always visible above search
- 🏷️ **NEW:** Single-select chip mode by default, AND checkbox to combine multiple
- 🏷️ **NEW:** Tooltips on all chips explaining what they filter
- 🧹 **REMOVED:** "Show Only Duplicates" button (replaced by Duplicates chip)
- 🧹 **REMOVED:** Separate Favorites toggle button (section shows automatically)
- 🐛 **FIXED:** Filter chips now properly filter displayed tabs (shared `tabMatchesFilters()`)
- 🐛 **FIXED:** Recently closed and favorites sections now render in global sort mode
- 🎨 Gold/amber theme for favorite sites section (distinguishes from grey recently closed)
- 🎨 Clean chip pill styling with active state highlighting
- ⚡ Recently closed and favorites sections auto-hide when chip filters active

**Version 2.3 (2026-01-30)**
- ⌨️ **NEW:** Keyboard shortcuts for tab navigation
- ⌨️ **NEW:** Toggle between current/previous tab (Ctrl+Shift+Up / Cmd+Shift+Up)
- ⌨️ **NEW:** Navigate through tabs by recency (Ctrl+Shift+Left/Right)
- ℹ️ **NEW:** Clickable help modal with keyboard shortcuts and color legend
- ℹ️ **IMPROVED:** Removed confusing tooltip delay on info icon
- 🎨 User-configurable shortcuts via chrome://extensions/shortcuts
- 📝 Each tab appears once in navigation (sorted by last accessed time)
- 🪟 Window-scoped navigation (commands only affect focused window)

**Version 2.2 (2025-01-27)**
- ✨ **NEW:** Recently Closed Tabs feature - track and restore last 25 closed tabs
- ✨ **NEW:** Group restoration - closed tabs restore to their original group
- ✨ **NEW:** Colored group badges on closed tabs showing restoration target
- ✨ **NEW:** Enhanced default sorting - Groups (A→Z) + Recent First
- ✨ **NEW:** Click entire closed tab row or restore button (↶) to reopen
- 🔒 **NEW:** Added "sessions" permission to access recently closed tabs
- 🔒 **NEW:** Added "storage" permission to save group metadata for closed tabs
- 🎨 Grayed out styling for closed tabs distinguishes from open tabs
- 🎨 Time badges show when tab was closed (5m ago, 2h ago, 1d ago)
- 💾 Toggle state for recently closed section persists via localStorage
- ⚡ Search filter works on recently closed tabs
- 🛡️ Smart fallback: if group deleted, tab opens ungrouped
- 📍 Recently Closed section always appears LAST (after ungrouped tabs)
- 🔧 Groups now sorted alphabetically by default for easier navigation
- 🔧 Within groups, tabs sorted by most recent first (intuitive default)

**Version 2.1 (2025-01-27)**
- ✨ **NEW:** Visit count badges showing total visits from browser history
- ✨ **NEW:** "Most Visited First" sort option
- ✨ **NEW:** "Least Visited First" sort option (find tabs to close)
- ✨ **NEW:** Collapsible controls - hide/show filters & sort with toggle button
- ✨ **NEW:** Wider popup (550px) - more space for tab titles
- 🔒 **NEW:** Added "history" permission to read visit counts
- 📊 Visit badges only show for tabs with 10+ visits (reduces clutter)
- 🎨 Blue visit badges visually distinct from orange duplicate badges
- 🎨 Compact stats - tab/group counts on single line
- 💾 Collapsible state persists via localStorage
- ⚡ Search box always visible with auto-focus

**Version 2.0 (2025-01-26)**
- ✨ **NEW:** Interactive pin/unpin toggle buttons (📌/📍)
- ✨ **NEW:** Interactive mute/unmute toggle buttons (🔇/🔊/🔈)
- ✨ **NEW:** 7 sort options (Title, URL, Age, Default)
- ✨ **NEW:** Global sorting mode with group badges
- ✨ **NEW:** Clear Filters button (one-click reset)
- ✨ **NEW:** localStorage persistence for sort preferences
- ✨ **NEW:** Age-based color coding (🟢🟡🟠🔴 borders)
- 🎨 Improved UI with hover animations and tactile feedback
- 🐛 Fixed tab click handlers to exclude action buttons

**Version 1.0 (2025-01-26)**
- Initial release (built in <1 hour!)
- Search and filter functionality
- Tab groups with color coding
- Duplicate detection and management
- Close individual tabs and groups
- Favicon display
- Active tab highlighting
- Filter-aware duplicate closing
- Removed website content permissions

## License

This is an experimental learning project. Feel free to use, modify, or remove as needed.

## Support

This extension was created as a learning experiment and is not officially supported. Use at your own discretion.

---

**Created by Steve Souza & Claude Code (01/26)**
*Experimental Project*
