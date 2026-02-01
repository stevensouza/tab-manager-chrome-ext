## Favorite Sites Feature (v2.4)

### Overview

"Find or open" behavior — star any tab to save its site as a favorite. When that
site isn't open, it appears grayed out at the bottom of the popup. Click to open it.

### URL Handling — Full-URL Matching (Bookmark-Style)

Favorites store the exact full URL (like bookmarks). Starring a Gmail tab with URL
`https://mail.google.com/mail/u/0/#inbox/FMfcg...` stores that complete URL.

- **Matching:** A favorite is "open" if any tab has the exact same URL
- **Opening:** Clicking an unopened favorite navigates to the exact stored URL
- **Behavior:** Starring one Google Doc doesn't mark all Google Docs as favorited
- **Note:** `getUrlOrigin(url)` helper function exists but is no longer used for favorites

### Storage

- `chrome.storage.sync` — syncs favorites across devices
- Capped at 50 entries (sync quota: 8KB/item, 100KB total)
- Each entry: `{url, title, favIconUrl}`

### Key Functions

- `loadFavoriteSites()` / `saveFavoriteSites()` — sync storage read/write
- `getUrlOrigin(url)` — extracts protocol + hostname (helper, not used for favorites)
- `isFavoriteUrl(url)` — checks if exact URL matches any favorite
- `addFavorite(tab, event)` — star a tab (stores full URL)
- `removeFavorite(url, event)` — remove from favorites
- `openFavoriteSite(site, event)` — open favorite in new tab
- `renderFavoriteSites()` — render unopened favorites section
- `createFavoriteSiteElement(site)` — DOM element for grayed-out favorite
- `updateFavoritesCount()` — update count in toggle button

### Star Button on Open Tabs

Added in `createTabElement()`:
- Empty star if not favorited, filled star if favorited
- Hidden by default, visible on hover (like close button)
- Click toggles favorite status via `addFavorite()` / `removeFavorite()`

### Visual Presentation

- Gold/amber theme (#FFC107 border, #fffbf0 background)
- Opacity 0.7 (grayed out like recently closed)
- Section appears AFTER recently closed (always last)
- Hidden when non-Favorites chip filters are active
