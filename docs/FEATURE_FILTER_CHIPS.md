## Filter Chips Feature (v2.4)

### Overview

Row of toggle pill buttons above the search box (always visible, not inside
collapsible controls). Quick way to filter open tabs by type.

### Available Chips

| Chip | Filter Logic | Notes |
|------|-------------|-------|
| Duplicates | `urlCounts[tab.url] > 1` | Replaced old "Show Only Duplicates" button |
| Audio | `tab.audible \|\| tab.mutedInfo?.muted` | Tabs playing or muting sound |
| Pinned | `tab.pinned` | Pinned tabs only |
| Favorites | `isFavoriteUrl(tab.url)` | Tabs whose exact URL is in favorites list |
| Stale (1w+) | `Date.now() - tab.lastAccessed > 7 days` | Tabs not accessed in over a week |

### Single-Select vs AND Mode

- **Default (single-select):** Clicking a chip deselects all others
- **AND mode:** Check the "AND" checkbox to combine multiple chips
- Switching from AND to single-select keeps only the first active chip
- `clearFilters()` resets all chips and AND mode

### Section Visibility Rules

When any chip is active:
- Recently closed section: hidden (chips only filter open tabs)
- Favorite sites section: hidden, UNLESS Favorites chip is active

### Implementation

- Chips rendered in `popup.html` as `.filter-chip` buttons with `data-filter` attribute
- Event listeners in DOMContentLoaded iterate `.filter-chip` elements
- Each chip toggles its state variable and calls `renderTabs()`
- `anyChipFilterActive()` helper used by `renderRecentlyClosedTabs()` and `renderFavoriteSites()`

### UI Changes from Previous Versions

- Removed "Show Only Duplicates" button (replaced by Duplicates chip)
- Controls section now contains: Close Duplicates, Show Recently Closed, Sort dropdown, Clear Filters, Global sort checkbox
