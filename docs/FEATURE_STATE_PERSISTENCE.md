## State Persistence (v2.4+)

### Overview

Filter chip states, AND mode, search text, view mode, and group collapse states persist to localStorage so they survive closing and reopening the popup. Users don't lose their filtering context between sessions.

### What Gets Persisted

**localStorage keys:**
- `tabManagerChipState` — JSON object with all chip states and AND mode
- `tabManagerSearchTerm` — Current search box text
- `tabManagerSortOption` — Sort dropdown selection (existed pre-v2.4)
- `tabManagerViewMode` — 'groups' or 'all' segmented toggle (v2.5)
- `tabManagerCollapsedGroups` — JSON array of collapsed group IDs (v2.5)
- `closedTabsVisible` — Recently closed section visibility (existed pre-v2.4)

**Chip state structure:**
```javascript
{
  dupes: boolean,      // Duplicates chip
  audio: boolean,      // Audio chip
  pinned: boolean,     // Pinned chip (Chrome native pin)
  faves: boolean,      // Favorites chip
  old: boolean,        // Stale (1w+) chip
  picks: boolean,      // Quick Pick chip (v2.8) — tabs saved to a slot
  combine: boolean     // AND mode toggle (segmented [Any | All] in v2.6+)
}
```

**Note:** Quick Pick slot data itself lives in `chrome.storage.sync` under key `pinnedSlots` (cross-device sync) — NOT in localStorage. Only the `picks` chip's on/off state is in localStorage.

### Key Functions

- `saveChipState()` — Saves chip filter states to localStorage
- `restoreChipState()` — Restores chip states on popup open
- Called automatically on DOMContentLoaded and whenever filters change

### Implementation Details

**Save triggers:**
- Clicking any filter chip
- Toggling the `[Any | All]` mode segmented control
- Clearing filters (saves empty state)
- Typing in search box (debounced via input event)

**Restore behavior:**
- On popup open, reads from localStorage
- Updates global state variables
- Applies 'active' class to chips
- Sets `[Any | All]` mode-button active state
- Populates search box
- Silently ignores corrupt data

**Note:** Group collapse state IS persisted (v2.5), but Chrome reassigns group IDs on browser restart, so stale IDs are cleaned up in `loadTabs()`. After a browser restart, all groups start expanded.
