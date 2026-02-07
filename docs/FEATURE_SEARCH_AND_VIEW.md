## Search Clear, Accordion Groups, and View Toggle (v2.5, updated v2.6)

### Overview

Three UI improvements that enhance search usability, group navigation, and view switching.

### Search Row Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Search tabs and groups...          ✕]  [▼]  [Groups | All] │
└──────────────────────────────────────────────────────────────┘
  ↑ search input + clear button        ↑     ↑ segmented view toggle
                                       ↑ collapse/expand all (hidden in All view)
```

### Feature 1: Search Clear Button

**Behavior:**
- X button appears inside the search box when text is entered
- Click clears all search text, resets filters, and re-focuses the search box
- Hidden when search box is empty
- Also hidden when "Clear Filters" is clicked

**Implementation:**
- `.search-container` wraps the input with relative positioning
- `.search-clear-btn` is absolutely positioned on the right edge
- Show/hide toggled via `style.display` on input events

### Feature 2: Accordion Group Collapse/Expand

**Behavior:**
- Click any group header to collapse/expand its tabs
- Chevron indicator: ▼ (expanded) / ▶ (collapsed)
- Collapse state persisted to localStorage (`tabManagerCollapsedGroups`)
- Search auto-expands collapsed groups that contain matching tabs
- Collapse is purely visual — does NOT affect `tabMatchesFilters()` or Close Duplicates
- Stale group IDs cleaned up in `loadTabs()` (Chrome reassigns IDs on restart)

**Collapse/Expand All button:**
- Small button (▼/▶) on the search row between search box and view toggle
- If any group is expanded → collapses all
- If all groups are collapsed → expands all
- Hidden when view mode is "All" (no groups to collapse)

**Replaces:** Click-to-filter behavior (`activeGroupFilter`) which was removed entirely.

### Feature 3: Segmented View Toggle [Groups | All]

**Behavior:**
- Two-button segmented control on the search row
- **Groups** (default): Tabs organized under colored group headers with accordion collapse
- **All**: Flat sorted list — all tabs shown with group badges (colored pills)
- Active button highlighted in blue (#1A73E8)
- View mode persisted to localStorage (`tabManagerViewMode`)
- Search and all filter chips work in both views

**Replaces:** Hidden "Sort globally (across all groups)" checkbox that only appeared for certain sort modes.

### Key Functions

```javascript
// Collapse helpers (popup.js)
toggleGroupCollapse(groupId)  // Toggle one group
saveCollapsedGroups()         // Persist to localStorage
collapseAllGroups()           // Collapse all + re-render
expandAllGroups()             // Expand all + re-render
updateToggleAllIcon()         // Update ▼/▶ on collapse-all button
```

### localStorage Keys (new in v2.5)

| Key | Value | Default |
|-----|-------|---------|
| `tabManagerCollapsedGroups` | JSON array of group IDs | `[]` |
| `tabManagerViewMode` | `'groups'` or `'all'` | `'groups'` |

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Search + collapsed groups | Auto-expand matching groups | Search results should always be visible |
| Collapse vs filter | Collapse is visual only | Close Duplicates must work across all groups |
| Default state | All groups expanded | Natural expectation |
| Clear Filters effect | Does NOT expand groups | Collapse is a view preference, not a filter |
| View toggle placement | Search row (right side) | Both controls shape what appears below; saves vertical space |
| Collapse-all visibility | Hidden in All view | No groups to collapse in flat list |

### v2.6 UI Redesign Changes

The v2.6 redesign affected the search and view controls area:

1. **Search icon** — Magnifying glass (🔍) inside search box for visual clarity
2. **Always-visible controls** — Removed collapsible controls section; sort dropdown, chips, and action buttons are always visible
3. **Compact header** — Single row: "Tab Manager" left, "N groups · N tabs ℹ️" right
4. **Chip labels shortened** — Dupes, Audio, Pinned, Faves, Stale (descriptive tooltips retained)
5. **[Any | All] mode toggle** — Segmented button replaces AND checkbox for chip combine mode
6. **Close Dupes visibility** — Button only shown when duplicates exist (Option B)
7. **Recently Closed inline header** — Section header with Show/Hide toggle replaces separate button
8. **Dotted indent rail** — `.group-tabs` wrapper on ALL sections for consistent visual hierarchy
9. **Age color key** — Compact colored dots row replaces text footer
10. **"Open →" on favorites** — Hover label on favorite site items
