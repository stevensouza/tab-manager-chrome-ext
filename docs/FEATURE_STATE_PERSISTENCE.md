## State Persistence (v2.4+)

### Overview

Filter chip states, AND mode, and search text persist to localStorage so they survive closing and reopening the popup. Users don't lose their filtering context between sessions.

### What Gets Persisted

**localStorage keys:**
- `tabManagerChipState` — JSON object with all chip states and AND mode
- `tabManagerSearchTerm` — Current search box text
- `tabManagerSortOption` — Sort dropdown selection (existed pre-v2.4)
- `tabManagerGlobalSort` — Global sort checkbox state (existed pre-v2.4)
- `tabManagerClosedTabsVisible` — Recently closed section visibility (existed pre-v2.4)

**Chip state structure:**
```javascript
{
  dupes: boolean,      // Duplicates chip
  audio: boolean,      // Audio chip
  pinned: boolean,     // Pinned chip
  faves: boolean,      // Favorites chip
  old: boolean,        // Stale (1w+) chip
  combine: boolean     // AND mode toggle
}
```

### Key Functions

- `saveChipState()` — Saves chip filter states to localStorage
- `restoreChipState()` — Restores chip states on popup open
- Called automatically on DOMContentLoaded and whenever filters change

### Implementation Details

**Save triggers:**
- Clicking any filter chip
- Toggling AND mode checkbox
- Clearing filters (saves empty state)
- Typing in search box (debounced via input event)

**Restore behavior:**
- On popup open, reads from localStorage
- Updates global state variables
- Applies 'active' class to chips
- Sets checkbox states
- Populates search box
- Silently ignores corrupt data

**Note:** Active group filter (clicking group header) is NOT persisted — it resets on popup reopen. This is intentional to avoid confusion if groups change.
