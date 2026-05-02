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

---

## Pinned Tab Slots (v2.7)

### Overview

Numbered "slots" — keyboard-triggered bookmarks that hold a URL. Press the slot's keystroke to jump to that tab; if the tab was closed, the URL is reopened in a new tab. Slot 1 has a default keystroke; slot 2 needs a one-time user binding.

### Two Distinct Bindings

The feature has two separate concepts that look similar but aren't:

1. **Slot → URL binding.** Stored at runtime in `chrome.storage.sync` (key: `pinnedSlots`). Shape: `{ "1": {url, title, favIconUrl, pinnedAt}, "2": ... }`. Set/cleared via the popup UI. Fully dynamic — overwritten any time you click 📌 on a different tab.

2. **Slot → keystroke binding.** Statically declared in `manifest.json` under the `commands` key. The `chrome.commands` API has no runtime registration, so each slot needs its own predeclared command (`goto-slot-1`, `goto-slot-2`). Slot 1 ships with `Cmd+Shift+1` / `Ctrl+Shift+1`; slot 2 has no `suggested_key` and the user binds it once at `chrome://extensions/shortcuts`.

### Why 2 slots, not 9

Two Chrome rules constrain this:

- **Reserved chords.** `Cmd+1` … `Cmd+9` (Mac) and `Ctrl+1` … `Ctrl+9` (Win/Linux) are reserved by Chrome for built-in tab-strip switching. Extension commands cannot bind to them; Chrome silently drops the registration. Workaround: any chord with an extra modifier (Shift/Alt) works — hence `Cmd+Shift+1`.
- **4-default cap.** Chrome enforces a per-extension limit of 4 commands with a `suggested_key`. The extension already used 3 (toggle, back, forward). Only 1 default-keystroke "budget" was left, so only slot 1 ships with a working key out of the box. Slot 2 still works — it just appears as "Not set" in `chrome://extensions/shortcuts` until the user assigns a key.

Adding more slots is a manifest-only change but every additional slot would require manual user binding.

### Command Handler

`background.js → handleGotoSlot(slotNumber, currentWindowId)`:

1. Read `pinnedSlots[slotNumber]` from `chrome.storage.sync`.
2. If no entry, no-op.
3. `chrome.tabs.query({ url: entry.url })` for matches.
4. **Match found:** sort by `lastAccessed` desc; pick first. If `target.windowId !== currentWindowId`, `chrome.windows.update(target.windowId, { focused: true })`. Then `chrome.tabs.update(target.id, { active: true })`.
5. **No match:** `chrome.tabs.create({ url: entry.url, active: true })`.

URL match is **exact-string**, matching favorites semantics. URL with hash or query params is treated as a different page.

### Popup UI

- **Per-tab 📌 button** (next to favorite-star) opens a popover picker. Click 1 or 2 to pin (silent overwrite); click again on a slot the tab is already in to clear it.
- **Pinned Slots section** renders before Recently Closed. Always shows both slot rows even if empty (discoverability). Empty slot 2 shows hint about chrome://extensions/shortcuts. Click a filled slot row to activate the tab (mirrors keystroke behavior).
- **Section hidden** when any chip filter is active (slots are out-of-band from the filtered tab list).

### Storage

`chrome.storage.sync` — slots follow the user across devices. No new permission required (storage already in manifest).

### Files Modified

- **manifest.json**: bumped to v2.7, added `goto-slot-1` (with `suggested_key`) and `goto-slot-2` (no default) commands.
- **background.js**: added `handleGotoSlot()` and routed `goto-slot-1` / `goto-slot-2` cases through the existing command listener.
- **popup.js**: added `pinnedSlots` global state, `loadPinnedSlots`/`savePinnedSlots`/`pinTabToSlot`/`clearSlot`/`activatePinnedSlot`/`renderPinnedSlots`/`createPinnedSlotElement`/`showSlotPicker`. Hooked load into `loadTabs()` and render into `renderTabs()`. Added 📌 button to `createTabElement()`.
- **popup.html**: added two rows to the help modal shortcuts table; rewired `chrome://extensions/shortcuts` button via class so multiple instances work.
- **styles.css**: added `.pinned-slots-container`, `.pinned-slots-header`, `.pinned-slot-row`, `.slot-empty`, `.slot-number-badge`, `.slot-pin-btn`, `.slot-picker`, `.slot-picker-option` styles.
