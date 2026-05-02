## Filter Chips Feature (v2.4, expanded v2.8)

### Overview

Row of toggle pill buttons above the search box (always visible, not inside
collapsible controls). Quick way to filter open tabs by type.

### Available Chips

| Chip | data-filter | Filter Logic | Notes |
|------|-------------|--------------|-------|
| Dupes | `dupes` | `urlCounts[tab.url] > 1` | Replaced old "Show Only Duplicates" button |
| Audio | `audio` | `tab.audible \|\| tab.mutedInfo?.muted` | Tabs playing or muting sound |
| Pinned | `pinned` | `tab.pinned` | Chrome's native pinned tabs |
| Faves | `faves` | `isFavoriteUrl(tab.url)` | Tabs whose exact URL is in favorites list |
| Stale | `old` | `Date.now() - tab.lastAccessed > 7 days` | Tabs not accessed in over a week (1w+) |
| Picks (v2.8) | `picks` | `getSlotForUrl(tab.url) !== null` | Tabs saved to a Quick Pick slot |

### Single-Select vs AND Mode

- **Default (single-select):** Clicking a chip deselects all others
- **AND mode:** Toggle the segmented `[Any | All]` control (v2.6) to combine multiple chips with AND logic
- Switching from All to Any keeps only the first active chip
- `clearFilters()` resets all chips and switches back to Any

### Section Visibility Rules

When any chip is active:
- Recently closed section: hidden (chips only filter open tabs)
- Favorite sites section: hidden, UNLESS Favorites chip is active
- **Quick Pick section: always visible (v2.8)** — independent of the chip filter set; the Picks chip itself narrows the open-tab list to just the saved-to-a-slot tabs.

### Implementation

- Chips rendered in `popup.html` as `.filter-chip` buttons with `data-filter` attribute
- Event listeners in DOMContentLoaded iterate `.filter-chip` elements
- Each chip toggles its state variable and calls `renderTabs()`
- `anyChipFilterActive()` helper used by `renderRecentlyClosedTabs()` and `renderFavoriteSites()`

### UI Changes from Previous Versions

- Removed "Show Only Duplicates" button (replaced by Duplicates chip)
- Controls section now contains: Close Duplicates, Show Recently Closed, Sort dropdown, Clear Filters, Global sort checkbox
