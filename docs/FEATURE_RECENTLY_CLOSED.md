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
