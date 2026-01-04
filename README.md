# Tab Manager Chrome Extension

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

### 🔍 Search & Filter
- **Real-time search** - Filter tabs by title or URL
- **Group name search** - Search by tab group names
- **Show Only Duplicates** - Toggle to view only duplicate tabs
- **Group filtering** - Click group headers to filter by specific groups
- **Clear Filters** - One-click button to reset all filters and sorting

### 📊 Tab Management
- **Tab count badge** - Shows total tab count in extension icon
- **Group organization** - Visual display of Chrome's native tab groups with matching colors
- **Tab counts** - Shows number of tabs in each group
- **Active tab indicator** - Highlights currently active tab with blue border
- **Pin/Unpin tabs** - Click 📌/📍 button to toggle pin state without switching tabs
- **Mute/Unmute tabs** - Click 🔇/🔊/🔈 button to toggle audio without switching tabs

### 🔄 Sorting
- **7 sort options** - Title (A→Z, Z→A), URL (A→Z, Z→A), Age (Newest/Oldest), Default (by group)
- **Per-group sorting** - Sort tabs within each group (default)
- **Global sorting** - Optional checkbox to sort all tabs together across groups
  - Shows group badges when globally sorted
  - Persists sort preference across sessions
- **Persistent preferences** - Remembers your sort choice and global sort setting

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

### Default View (No Filters)
```
┌─────────────────────────────────────────┐
│ Tab Manager                             │
│ by Steve Souza & Claude Code (01/26)    │
│                                         │
│ Total tab groups: 3                     │
│ Total tabs: 12                          │
│                                         │
│ [Show Only Duplicates] [Close Dupes]   │
│ ┌─────────────────────────────────────┐ │
│ │ Search tabs and groups...           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🔵 Work (5)                    [×]│   │ ← Group header (blue)
│ └───────────────────────────────────┘   │
│   🌐 GitHub - Pull Requests       [×]   │ ← Tab with favicon
│   📧 Gmail - Inbox           [2×] [×]   │ ← Duplicate badge
│   📊 Google Sheets - Q1 Data      [×]   │ ← Active tab (blue border)
│   📧 Gmail - Inbox           [2×] [×]   │ ← Another duplicate
│   📝 Notion - Projects            [×]   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🟢 Research (4)                [×]│   │ ← Group header (green)
│ └───────────────────────────────────┘   │
│   📄 Wikipedia - React              [×] │
│   🔍 Stack Overflow - Async    [3×] [×] │
│   📰 Medium - Web Development       [×] │
│   🔍 Stack Overflow - Async    [3×] [×] │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ Ungrouped Tabs (3)                │   │
│ └───────────────────────────────────┘   │
│   🎵 YouTube - Music                [×] │
│   🛒 Amazon - Cart              [2×][×] │
│   🛒 Amazon - Cart              [2×][×] │
│                                         │
│ Created by Steve Souza | Experimental   │
└─────────────────────────────────────────┘
```

### With "Show Only Duplicates" Active
```
┌─────────────────────────────────────────┐
│ Tab Manager                             │
│ by Steve Souza & Claude Code (01/26)    │
│                                         │
│ Total tab groups: 3                     │
│ Total tabs: 12                          │
│                                         │
│ [Show Only Duplicates✓][Close Dupes]   │ ← Toggle active (blue)
│ ┌─────────────────────────────────────┐ │
│ │ Search tabs and groups...           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🔵 Work (5)                    [×]│   │
│ └───────────────────────────────────┘   │
│   📧 Gmail - Inbox           [2×] [×]   │ ← Only duplicates shown
│   📧 Gmail - Inbox           [2×] [×]   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🟢 Research (4)                [×]│   │
│ └───────────────────────────────────┘   │
│   🔍 Stack Overflow - Async    [3×] [×] │
│   🔍 Stack Overflow - Async    [3×] [×] │
│   🔍 Stack Overflow - Async    [3×] [×] │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ Ungrouped Tabs (3)                │   │
│ └───────────────────────────────────┘   │
│   🛒 Amazon - Cart              [2×][×] │
│   🛒 Amazon - Cart              [2×][×] │
│                                         │
│ Created by Steve Souza | Experimental   │
└─────────────────────────────────────────┘
```

### With Search Filter "stack"
```
┌─────────────────────────────────────────┐
│ Tab Manager                             │
│ by Steve Souza & Claude Code (01/26)    │
│                                         │
│ Total tab groups: 3                     │
│ Total tabs: 12                          │
│                                         │
│ [Show Only Duplicates] [Close Dupes]   │
│ ┌─────────────────────────────────────┐ │
│ │ stack                               │ │ ← Search active
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🟢 Research (4)                [×]│   │ ← Only matching group
│ └───────────────────────────────────┘   │
│   🔍 Stack Overflow - Async    [3×] [×] │ ← Matching tabs only
│   🔍 Stack Overflow - Async    [3×] [×] │
│   🔍 Stack Overflow - Async    [3×] [×] │
│                                         │
│ Created by Steve Souza | Experimental   │
└─────────────────────────────────────────┘
```

### Legend
- 🔵🟢🔴🟡 - Group color indicators
- [×] - Close button (appears on hover)
- [2×][3×] - Duplicate count badge (orange)
- Blue left border - Active tab indicator
- Favicon emojis - Website icons (🌐📧📊🔍📄📰🎵🛒)

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
   - Select the `chrome_ext` folder
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

### Duplicate Management

**View Duplicates:**
1. Orange badges (e.g., "2×") appear on duplicate tabs
2. Click "Show Only Duplicates" to filter view
3. Click again to show all tabs

**Close Duplicates:**
1. Click "Close Duplicates" button
2. Keeps one copy of each duplicate URL
3. Preferentially keeps the active tab
4. Respects active filters:
   - If searching "github" → only closes github duplicates
   - If filtering by group → only closes duplicates in that group
   - If "Show Only Duplicates" is on → closes visible duplicates

### Filter Combinations

Filters work together (AND logic):
- Search + Group filter → Shows tabs matching both
- Search + Duplicate filter → Shows duplicates matching search
- All three → Shows duplicates in specific group matching search

Click group header again to clear group filter.

## Permissions

**Required permissions:**
- **Read your browsing history** (`tabs`) - To access tab titles, URLs, and metadata
- **View and manage your tab groups** (`tabGroups`) - To read and display tab group information

**No website content access** - Extension does not read or modify webpage content.

## File Structure

```
chrome_ext/
├── manifest.json       # Extension configuration
├── background.js       # Badge counter (shows tab count)
├── popup.html          # Popup UI structure
├── popup.js            # Main logic (search, filter, close, duplicates)
├── styles.css          # Styling
└── README.md           # This file
```

## Technical Details

- **Manifest Version:** 3 (latest Chrome extension standard)
- **Permissions:** `tabs`, `tabGroups` only
- **No external dependencies**
- **Pure JavaScript** (no frameworks)
- **Service Worker** for background badge updates

## Known Limitations

- Cannot close special Chrome pages (`chrome://`, `chrome-extension://`)
- Favicon may not load for some websites (shows 📄 placeholder)
- Extension popup closes when clicking tabs (Chrome behavior)

## Development

**Built with:**
- Chrome Extensions Manifest V3
- Vanilla JavaScript
- Chrome APIs: `chrome.tabs`, `chrome.tabGroups`, `chrome.action`, `chrome.windows`

**Code comments indicate:**
- Created by Steve Souza
- Experimental learning project
- Can be removed at any time

## Changelog

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
