# Tab Manager Chrome Extension

**Repository:** https://github.com/stevensouza/tab-manager-chrome-ext

This Chrome extension helps you manage browser tabs with features like search, filtering, sorting, group organization, duplicate detection, pin/mute controls, and age-based visual indicators. **Version 1.0 was built from scratch in less than one hour** using Claude Code—despite having no prior experience with Chrome extension development and no defined requirements at the start. By iterating on ideas in real-time and letting the development process evolve organically, Claude Code helped transform initial concepts into a functional extension. This demonstrates what AI-assisted development can enable: going from zero knowledge to a working product in under 60 minutes.

**Important Context:** I created this extension as a learning experiment with no prior Chrome extension development experience. It has worked well for my personal use, but I can't speak to the code quality or whether it follows Chrome extension best practices. The good news: the extension **only accesses tab metadata** (titles, URLs, and group names) and **does not read or modify any website content or other browser data**—it cannot change anything you've typed, stored, or browsed. See the [Permissions](#permissions) section below for technical details. Use at your own discretion, and feel free to use as-is or modify it however you like.

**Created by:** Steve Souza using Claude Code (01/26)
**Status:** Experimental learning project

## Table of Contents

- [Features](#features)
- [Browser Compatibility](#browser-compatibility)
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

## Browser Compatibility

**Tested and confirmed working:**
- **Google Chrome** (primary target — Manifest V3)
- **Brave** — Chromium-based; load via `brave://extensions/`, customize keystrokes at `brave://extensions/shortcuts`

**Should work but unverified.** All are Chromium-based and use the same `chrome.*` extension APIs this extension relies on (`tabs`, `tabGroups`, `sessions`, `storage`, `history`, `commands`):
- Microsoft Edge (load via `edge://extensions/`)
- Vivaldi
- Opera
- Arc

**Not supported:**
- **Firefox** — uses a different extension engine. While Firefox supports Manifest V3 in general, this extension relies on `chrome.tabGroups` and `chrome.sessions`, which have limited or no parity in Firefox. A Firefox port would require code changes.
- **Safari** — Apple's Safari Web Extensions model is different; this extension would need to be ported.

If you successfully run this in any of the unverified Chromium browsers, an issue or PR confirming would be welcome.

## Features

### ⌨️ Keyboard Shortcuts (v2.3, expanded v2.7)

**Toggle between current and previous tab:**
- Windows/Linux: `Ctrl+Shift+Up`
- Mac: `⌘⇧↑` (Cmd+Shift+Up)

**Navigate to older tab (by last accessed):**
- Windows/Linux: `Ctrl+Shift+Left`
- Mac: `⌘⇧←` (Cmd+Shift+Left)

**Navigate to newer tab (by last accessed):**
- Windows/Linux: `Ctrl+Shift+Right`
- Mac: `⌘⇧→` (Cmd+Shift+Right)

**Go to Quick Pick slot 1** (v2.7, renamed v2.8) — jumps to the tab saved to slot 1, or reopens it by URL if closed:
- Windows/Linux: `Ctrl+Shift+1`
- Mac: `⌘⇧1` (Cmd+Shift+1)

**Go to Quick Pick slots 2–5** (v2.8) — same behavior, slots 2–5. **Unbound by default** because Chrome only allows 4 default keystrokes per extension and the budget is full. Assign keys once at `chrome://extensions/shortcuts` and they work permanently.

**Customizable** - Change shortcuts at `chrome://extensions/shortcuts`

### 🔖 Quick Pick (v2.7 as "Pinned Tab Slots", renamed + expanded in v2.8)
- **5 numbered slots** holding a URL each. Save via the 🔖 button on any tab row, pick slot 1–5.
- **Keystroke jumps to the slot.** If the tab is open, it activates (and focuses the right window). If the tab is closed, it reopens at the saved URL.
- **Picker color states.** Empty slots show a green border, slots holding another tab show red, and the slot holding *this* tab is solid blue with a ✓ — clear it via the explicit ×.
- **Picks chip.** A "Picks" filter chip in the top row narrows the open-tab list to just the tabs currently saved to a Quick Pick slot.
- **Fully dynamic.** Save CNN to slot 1 today, overwrite with GitHub tomorrow — no config files. Silent overwrite, with a toast confirming the action.
- **Cross-device sync** via `chrome.storage.sync`.
- **Why only slot 1 has a default keystroke?** Chrome reserves `Cmd+1`–`Cmd+9` for built-in tab switching, and manifests can only ship 4 default keystrokes per extension (3 are used by the navigation shortcuts above). Slot 1 ships with a working default; slots 2–5 need a one-time keystroke binding at `chrome://extensions/shortcuts`.

### ⭐ Favorite Sites (v2.4)
- **Star any tab** - Hover to see ☆ button, click to save site as favorite
- **Full-URL matching** - Stores exact URL (bookmark-style), not just domain
- **Find or open** - Unopened favorites appear grayed out at bottom of popup, click to open
- **Cross-device sync** - Favorites stored in `chrome.storage.sync`
- **Smart visibility** - Favorites disappear from bottom section when the site is open

### 🏷️ Filter Chips (v2.4, updated v2.6, v2.8)
- **Always visible** - Row of pill buttons below search box
- **6 filter types** - Dupes, Audio, Pinned, Faves, Stale, Picks (v2.8)
- **Single-select default** - Clicking one chip deselects others
- **[Any | All] mode toggle** - Segmented button to combine multiple filters with AND logic
- **Clean results** - Recently closed and favorites sections hidden when filtering (Quick Pick section stays visible — it's independent of the chip filter)

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
- **Groups view** - Sorts tabs within each group
- **All view** - Sorts all tabs together in a flat list with group badges
- **Persistent preferences** - Remembers your sort choice and view mode across sessions

### ↶ Recently Closed Tabs
- **Session history** - Track last 25 closed tabs with Chrome sessions API
- **Group restoration** - Tabs restore to their original group if it still exists
- **Group badges** - Colored badges show which group the tab will restore to
- **Inline toggle** - Section header with Show/Hide button (no separate controls needed)
- **Click to restore** - Click any closed tab or restore button (↶) to reopen
- **Search integration** - Search works on closed tabs (filter by title/URL)
- **Smart fallback** - If original group deleted, tab opens ungrouped
- **Always last** - Recently closed section appears after all groups and ungrouped tabs

### ❌ Close Operations
- **Individual tab close** - Hover over any tab to see close button
- **Close entire groups** - Hover over group header to close all tabs in group (confirms if >5 tabs)
- **Close duplicates** - Button appears only when duplicates exist, removes extras keeping one of each URL
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

### Groups View (Default)
```
┌────────────────────────────────────────────────────────────────┐
│ Tab Manager                          3 groups · 12 tabs    ℹ️  │
│                                                                │
│ [🔍 Search tabs and groups...       ✕] [▼] [Groups | All]    │
│                                                                │
│ [Dupes] [Audio] [Pinned] [Faves] [Stale] [Picks]   [Any|All]  │
│                                                                │
│ [Sort: Groups A→Z + Recent ▼]  [Clear Filters] [Close Dupes]  │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ▼ 🔵 Work (5)                                          [×]│ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┊  🌐📌🔈 GitHub - Pull Requests   [42]    [☆] [🔖1] [×]    │
│ ┊  📧 Gmail - Inbox          [2×] [89] 🔇  [★] [🔖]  [×]    │
│ ┊  📊 Google Sheets - Q1 Data     [156]    [☆] [🔖]  [×]    │
│ ┊  📧 Gmail - Inbox          [2×] [89]     [☆] [🔖]  [×]    │
│ ┊  📝 Notion - Projects                    [☆] [🔖2] [×]    │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ▶ 🟢 Research (4)                                      [×]│ │
│ └────────────────────────────────────────────────────────────┘ │
│    (collapsed — tabs hidden)                                   │
│                                                                │
│  Ungrouped Tabs (3)                                            │
│ ┊  🎵🔊 YouTube - Music                    [☆] [🔖]  [×]    │
│ ┊  🛒 Amazon - Shopping Cart       [2×]    [☆] [🔖]  [×]    │
│ ┊  🛒 Amazon - Shopping Cart       [2×]    [☆] [🔖]  [×]    │
│                                                                │
│  🔖 Quick Pick     Cmd+Shift+1 jumps to slot 1 · 2–5 user…    │
│ ┊  [1] 🌐 GitHub - Pull Requests                         [×] │
│ ┊  [2] 📝 Notion - Projects                              [×] │
│ ┊  [3] Empty — save a tab via 🔖 button                      │
│ ┊  [4] Empty — save a tab, then assign a key…                │
│ ┊  [5] Empty — save a tab, then assign a key…                │
│                                                                │
│  Recently Closed (3)                         [Show ▾]          │
│ ┊  📰 CNN News Article        🔵Work      5m ago         [↶] │
│ ┊  🔍 Stack Overflow Question              2h ago         [↶] │
│ ┊  📧 Gmail - Old Email       🟢Research   1d ago         [↶] │
│                                                                │
│  ⭐ Favorite Sites (1)                                         │
│ ┊  🐙 GitHub                              Open →         [×] │
│                                                                │
│  ● <2h   ● <24h   ● <1w   ● >1w                               │
└────────────────────────────────────────────────────────────────┘
```

### All View - Sort by Title (A→Z)
```
┌────────────────────────────────────────────────────────────────┐
│ Tab Manager                          3 groups · 12 tabs    ℹ️  │
│                                                                │
│ [🔍 Search tabs and groups...       ✕]        [Groups | All]  │
│                                                    active ↗    │
│ [Dupes] [Audio] [Pinned] [Faves] [Stale] [Picks]   [Any|All]  │
│                                                                │
│ [Sort: Title (A→Z) ▼]  [Clear Filters]                        │
│ ─────────────────────────────────────────────────────────────  │
│                                                                │
│   🛒 Amazon - Shopping Cart  🔘     [2×]  [☆] [🔖]  [×]      │
│   🛒 Amazon - Shopping Cart  🔘     [2×]  [☆] [🔖]  [×]      │
│   📧 Gmail - Inbox           🔵Work [2×]  [★] [🔖]  [×]      │
│   📧 Gmail - Inbox           🔵Work [2×]  [☆] [🔖]  [×]      │
│   🌐 GitHub - Pull Requests  🔵Work       [☆] [🔖1] [×]      │
│   📊 Google Sheets - Q1 Data 🔵Work       [☆] [🔖]  [×]      │
│   📰 Medium - Web Dev        🟢Research   [☆] [🔖]  [×]      │
│   📝 Notion - Projects       🔵Work       [☆] [🔖2] [×]      │
│   🔍 Stack Overflow - Async  🟢Research [3×] [☆] [🔖] [×]    │
│   🔍 Stack Overflow - Async  🟢Research [3×] [☆] [🔖] [×]    │
│   📄 Wikipedia - React       🟢Research   [☆] [🔖]  [×]      │
│   🎵 YouTube - Music         🔘           [☆] [🔖]  [×]      │
│                                                                │
│  ● <2h   ● <24h   ● <1w   ● >1w                               │
└────────────────────────────────────────────────────────────────┘
```

### Legend
- [Dupes] [Audio] [Pinned] [Faves] [Stale] [Picks] - Filter chips (click to filter, always visible). **Picks** (v2.8) shows only tabs saved to a Quick Pick slot.
- [Any | All] - Mode toggle: single-select vs. AND combine for chips
- [Groups | All] - View toggle: grouped with headers vs. flat sorted list
- [▼] button - Collapse/expand all groups (hidden in All view)
- ▼/▶ on group headers - Expanded/collapsed group (click to toggle)
- ┊ - Dotted indent rail (visual grouping for tabs under headers)
- 🔍 in search box - Magnifying glass icon
- ✕ in search box - Clear search text (appears when typing)
- [Show ▾] / [Hide ▴] - Toggle recently closed tabs visibility
- Open → - Hover label on favorite sites (click to open)
- 🔵🟢🔴🟡 - Group color badges (in recently closed and All view)
- 🔘 - Ungrouped tab badge (gray, appears in All view)
- [×] - Close button (appears on hover for open tabs / favorite sites)
- [↶] - Restore button (always visible for closed tabs)
- [☆] - Add to favorites (appears on hover)
- [★] - Already favorited (click to remove)
- [🔖] / [🔖1]…[🔖5] - Quick Pick button (v2.8): empty bookmark or saved-to-slot N. Click to open the picker.
- [2×][3×] - Duplicate count badge (orange, current tabs only)
- [42][156] - Visit count badge (blue, total visits from browser history)
- 5m ago, 2h ago, 1d ago - Time since tab was closed (recently closed section)
- [Close Dupes] - Only visible when duplicates exist
- 📌 - Pinned tab indicator (clickable toggle)
- 🔇 - Muted tab (clickable toggle)
- 🔊 - Playing audio (clickable to mute)
- 🔈 - Silent tab, mute button (appears on hover)
- Blue left border - Active tab indicator
- ● <2h ● <24h ● <1w ● >1w - Age color key (green/yellow/orange/red)
- Grayed out (grey) - Recently closed tab (not currently open)
- Grayed out (gold border) - Favorite site not currently open
- Favicon emojis - Website icons (🌐📧📊🔍📄📰🎵🛒)
- ℹ️ - Info icon (click to see help modal with attribution)

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

**Quick Filters (always visible below search box):**
- **Dupes** - Show only tabs with duplicate URLs
- **Audio** - Show only tabs playing or muting audio
- **Pinned** - Show only pinned tabs
- **Faves** - Show only favorited sites (open + unopened grayed out)
- **Stale** - Show only tabs not accessed in over a week

**Single-select (Any, default):** Clicking one chip deselects others.
**AND mode (All):** Click "All" in the mode toggle to combine multiple filters.

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
1. "Close Dupes" button appears in the action row when duplicates exist
2. Click to remove duplicate tabs, keeping one copy of each URL
3. Preferentially keeps the active tab
4. Respects all active filters (search, group, chips)

### Filter Combinations

Filters work together (AND logic when "All" mode is selected):
- Search + Dupes chip → Shows duplicates matching search
- Multiple chips + Search → All conditions must match

### Recently Closed Tabs

**View Recently Closed:**
1. Recently Closed section header always visible (when closed tabs exist)
2. Click "Show ▾" to expand, "Hide ▴" to collapse
3. Section appears at bottom (after ungrouped tabs)

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

**Version 2.8 (2026-05-02)**
- 🔖 **RENAME:** "Pinned Tab Slots" → **Quick Pick**. Switched the user-facing emoji from 📌 → 🔖 to remove collision with Chrome's native tab pin (still surfaced via the `📌`/`📍` status badge and the "Pinned" filter chip — those keep their vocabulary).
- 🔢 **NEW:** Slot count expanded **2 → 5**. Slot 1 keeps default `Cmd+Shift+1`; slots 2–5 are user-assigned at `chrome://extensions/shortcuts`.
- 🎨 **NEW:** Picker colors are now semantic — green border = empty/available, red border = taken by another tab, solid blue + ✓ = this tab. The current-slot button has an explicit `×` to clear (body click is a no-op).
- 🪧 **NEW:** Toast confirmation on save and clear (single instance, ~1.8 s).
- 🔍 **NEW:** "Picks" filter chip — narrows the open-tab list to tabs saved to a Quick Pick slot. Persisted to localStorage with the other chip states.
- 👁️ **CHANGE:** Quick Pick section is now always visible (no longer hidden when chip filters are active).
- ♿ **A11y:** Picker buttons have descriptive `aria-label`s ("Slot 3, empty" / "Slot 1, currently saved as …" / "Slot 2, this tab is saved here").
- 💡 Per-tab 🔖 tooltip mentions the keystroke for slot 1 and points to `chrome://extensions/shortcuts` for slots 2–5.
- 🔄 Storage shape unchanged (`pinnedSlots["1".."5"]` in `chrome.storage.sync`); v2.7 entries continue to work — no migration needed.

**Version 2.7 (2026-05-02)**
- 📌 **NEW:** Pinned Tab Slots — 2 numbered slots (1, 2) that hold a URL. Press the slot's keystroke to jump to that tab, or reopen by URL if it was closed. (Renamed to "Quick Pick" in v2.8.)
- ⌨️ **NEW:** Keyboard shortcut `Cmd+Shift+1` (Mac) / `Ctrl+Shift+1` (Win/Linux) jumps to slot 1 by default.
- ⌨️ **NEW:** Slot 2 is unbound by default (Chrome's 4-default-keystroke limit) — assign a key once at `chrome://extensions/shortcuts`.
- 🎨 **NEW:** 📌 button on each tab row opens a 1/2 picker to pin to a slot. Silent overwrite when re-pinning.
- 🎨 **NEW:** "Pinned Slots" section in the popup shows both slots; click a row to jump to its tab.
- 🌐 **DOCS:** Added Browser Compatibility section — Chrome and Brave verified, other Chromium browsers (Edge, Vivaldi, Opera, Arc) likely work, Firefox and Safari not supported.

**Version 2.6 (2026-02-06)**
- 🎨 **REDESIGN:** Compact 1-row header (title left, "N groups · N tabs ℹ️" right)
- 🎨 **REDESIGN:** Removed collapsible controls — sort, chips, and actions always visible
- 🔍 **NEW:** Search box magnifying glass icon
- 🏷️ **NEW:** Shortened chip labels (Dupes, Audio, Pinned, Faves, Stale)
- 🏷️ **NEW:** Segmented [Any | All] mode toggle replaces AND checkbox
- ❌ **NEW:** Close Dupes button only appears when duplicates exist (saves space)
- ↶ **NEW:** Recently Closed inline section header with Show/Hide toggle
- 🎨 **NEW:** Dotted indent rail on ALL sections (groups, ungrouped, recently closed, favorites)
- ⭐ **NEW:** "Open →" hover label on favorite sites
- 🎨 **NEW:** Age color key footer (●<2h ●<24h ●<1w ●>1w) replaces text footer
- ℹ️ Attribution moved to help modal
- 🎨 8px border-radius, 4px age borders, tighter spacing throughout
- 🧹 **REMOVED:** Collapsible controls section and toggle button
- 🧹 **REMOVED:** Separate "Show Recently Closed" button
- 🧹 **REMOVED:** AND checkbox (replaced by mode toggle)
- 🧹 **REMOVED:** Text footer (replaced by age key)

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
