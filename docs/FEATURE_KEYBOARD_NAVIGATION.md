## Keyboard Navigation (v2.3)

### Overview

Global keyboard shortcuts for navigating tabs by recency (lastAccessed timestamp).

### Three Shortcuts

1. **Toggle** (Ctrl+Shift+Up, Mac: Cmd+Shift+Up)
   - Ping-pong between current tab and 2nd most recent tab
   - Most frequently used (quick bounce between two tabs)

2. **Navigate Back** (Ctrl+Shift+Left, Mac: Cmd+Shift+Left)
   - Move to older tab in recency-sorted list
   - Stops at oldest tab (no wrap-around)

3. **Navigate Forward** (Ctrl+Shift+Right, Mac: Cmd+Shift+Right)
   - Move to newer tab in recency-sorted list
   - Stops at current tab (no wrap-around)

### Navigation Model

**Sorted tab list approach (NOT activation sequence tracking):**
- Uses Chrome's built-in `tab.lastAccessed` timestamps
- Each tab appears ONCE in sorted list (no duplicates)
- Navigate through ALL tabs in window, sorted by recency
- Stateless design (queries tabs on each command)

**Example:**
```
User clicks: Suno → Proton → Suno
Sorted list: Suno (current), Proton (2nd), Gmail (3rd), ...

Press Back:
  Suno → Proton → Gmail → The Neuron → ...

NOT:
  Suno → Proton → Suno (old) ← Each tab appears once!
```

### Implementation (background.js)

**Simple stateless design (~80 lines):**
1. On keyboard command, query all tabs in focused window
2. Sort tabs by `lastAccessed` (descending)
3. Find current tab position in sorted array
4. Activate tab at position ± 1
5. No background state tracking needed

**Key functions:**
- `getTabsSortedByRecency(windowId)` - Query and sort tabs
- `handleToggleRecent(windowId)` - Activate 2nd most recent
- `handleNavigateBack(windowId)` - Move to older tab (index + 1)
- `handleNavigateForward(windowId)` - Move to newer tab (index - 1)

**Event listener:**
- `chrome.commands.onCommand` - Routes shortcuts to handlers

### User Configuration

**chrome://extensions/shortcuts:**
- Users can customize all three shortcuts
- Defaults: Ctrl+Shift+Up/Left/Right (Cmd on Mac)
- Shown in help modal (clickable info icon in popup)

### Edge Cases

- **Window-scoped:** Commands only affect focused window
- **Bounds checking:** Back/Forward stop at list ends (no wrap)
- **Single tab:** Commands return early gracefully
- **Multi-window:** Independent navigation per window

### Help Modal (v2.3+)

**Clickable info icon:**
- Removed tooltip (was confusing with delay)
- Click to open modal with:
  - Keyboard shortcuts table
  - Border color legend (tab age)
  - Button to open chrome://extensions/shortcuts

**chrome:// link handling (v2.4):**
- Direct links to `chrome://` URLs don't work in extensions
- Button uses `chrome.tabs.create({url: 'chrome://extensions/shortcuts'})` instead
- Opens shortcuts page in new tab when clicked

**Files modified:**
- popup.html: Modal HTML structure, shortcuts button
- styles.css: Modal styles, kbd tag styling
- popup.js: Modal open/close event handlers, shortcuts button handler
