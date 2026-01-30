# ThoughtBox - Future Project Requirements

**Status:** Brainstorming / Planning Phase
**Created:** 2026-01-28
**Starting Point:** Tab Manager Chrome Extension (current project)

**Related Resources:**
- **Claude.ai Web Project:** "ThoughtBox" - Contains discussions on tag hierarchies, meta-tagging (tagging tags), and advanced tag organization patterns
- **Tab Manager Feature Ideas:** See `docs/FEATURE_IDEAS.md` for extensive brainstorming (some features belong here, not Tab Manager)

## Project Vision

A personal knowledge management system that allows users to save, organize, and annotate web content with AI-assisted features.

**Think of it as:** A hybrid between bookmark manager + web clipper + personal research assistant

## Core Concept

Move beyond temporary tab management to permanent knowledge storage with:
- Save any URL with metadata
- Organize with tags (manual + AI-generated)
- Capture highlights/excerpts from pages (like Kindle highlights)
- Store snapshots of interesting content
- Advanced search and filtering

## Technical Architecture

### Storage: IndexedDB

**Why IndexedDB (not chrome.storage.local):**
- Need to store thousands of URLs (vs. 25 recent tabs)
- Page snapshots/screenshots (binary data, MBs per item)
- Text excerpts/highlights (KB per page)
- chrome.storage.local limit (5-10MB) would be exhausted quickly

**Recommended Library:** [idb](https://github.com/jakearchibald/idb) - Promise wrapper for cleaner API

### Proposed Data Model

```javascript
// Object Stores (tables):

1. bookmarks
   - id (auto-increment)
   - url (string, indexed)
   - title (string)
   - favicon (string/blob)
   - savedAt (timestamp, indexed)
   - visitCount (number)
   - lastVisited (timestamp)
   - notes (text)
   - aiSummary (text)

2. tags
   - id (auto-increment)
   - name (string, unique index)
   - color (string)
   - aiGenerated (boolean)
   - createdAt (timestamp)

3. bookmarkTags (many-to-many relationship)
   - id (auto-increment)
   - bookmarkId (indexed)
   - tagId (indexed)

4. highlights
   - id (auto-increment)
   - bookmarkId (indexed)
   - text (string)
   - startOffset (number)
   - endOffset (number)
   - color (string)
   - note (text)
   - createdAt (timestamp)

5. snapshots
   - id (auto-increment)
   - bookmarkId (indexed)
   - screenshot (Blob - binary image data)
   - html (string - full page HTML snapshot)
   - createdAt (timestamp)
```

### Query Capabilities Needed

```javascript
// Complex queries IndexedDB enables:
- "All URLs tagged 'coding' AND 'AI'"
- "Highlights from last 7 days"
- "Find pages containing text 'neural networks'"
- "Untagged items needing review"
- "Most visited bookmarks in 'music' category"

// Example with idb:
const db = await openDB('ThoughtBox', 1);
const coding = await db.getAllFromIndex('bookmarkTags', 'tagId', codingTagId);
```

## Feature Roadmap (Incremental)

### Phase 1: Basic Bookmark Management
- "Save this tab" button (persist beyond current session)
- Basic metadata: URL, title, favicon, savedAt
- View saved bookmarks list
- Delete bookmarks

### Phase 2: Manual Tagging
- Create/edit/delete tags
- Assign multiple tags to bookmarks
- Filter bookmarks by tag(s)
- Tag color coding
- Tag autocomplete

### Phase 3: AI-Assisted Tagging
- Analyze page title/URL to suggest tags
- User approves/edits AI suggestions
- Optional: Analyze page content for better suggestions
- Learn from user corrections

### Phase 4: Highlights/Excerpts
- Text selection on web pages → save highlight
- Store with position/context
- Color-code highlights
- Add notes to highlights
- View all highlights for a bookmark
- **Requires content script injection**

### Phase 5: Snapshots
- Screenshot current visible area
- Store as Blob in IndexedDB
- Optional: Save full HTML snapshot for offline viewing
- Thumbnail previews in bookmark list

### Phase 6: Advanced Features (TBD)
- Full-text search across saved content
- AI summaries of saved pages
- Smart collections (auto-tag based on rules)
- Export/import data
- Duplicate detection across saved bookmarks
- Related bookmark suggestions

## Chrome Extension Permissions Implications

### Current Tab Manager Permissions
```json
{
  "permissions": ["tabs", "tabGroups", "storage", "history", "sessions"]
}
```
**No `<all_urls>` permission** - Intentionally minimal permissions

### ThoughtBox Required Permissions

**For highlights/content extraction:**
```json
{
  "permissions": ["tabs", "tabGroups", "storage", "activeTab"],
  "host_permissions": ["<all_urls>"],  // Required for content scripts
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]  // Text selection, highlighting
  }]
}
```

**Trade-off:**
- More powerful features = scarier permission warning
- Users see: "Read and change all your data on all websites"

**Alternative Approach:**
- Use `activeTab` permission (less scary)
- User must click extension icon on each page before saving highlights
- More friction but better privacy perception

## Similar Tools (Reference/Inspiration)

- **Raindrop.io** - Tag-based bookmark manager
- **Notion Web Clipper** - Save + highlight + annotate
- **Pocket** - Save articles with tags, offline reading
- **Hypothesis** - Web annotation tool
- **Zotero** - Research/citation manager

## Privacy & Data Ownership

**Core Principle: All data stays local**
- IndexedDB is 100% local (no network)
- No cloud sync (unless explicitly added later)
- No telemetry/analytics
- User owns all data
- Export capability for data portability

## Migration Path from Tab Manager

**Keep Tab Manager as standalone project:**
- Lightweight tab management
- Recently closed tabs feature
- Duplicate detection
- Group filtering

**ThoughtBox starts as fork:**
- Copy core architecture (manifest, popup structure)
- Add IndexedDB layer
- Build bookmark management on top
- Optionally integrate with tab manager features

**Potential Integration:**
- "Save this tab to ThoughtBox" button in Tab Manager
- ThoughtBox can import recently closed tabs
- Shared UI patterns and styling

## Advanced Tag Features (From Claude.ai ThoughtBox Project + Tab Manager Brainstorming)

### Tag Hierarchies (Tag DAG - Directed Acyclic Graph)

**Core Concept:** Tags can have parent tags, and a tag can have multiple parents

**Example Structure:**
```
tab-manager (tag)
  └─ bug23 (child tag)
      └─ auth (grandchild tag)

backend (tag)
  └─ bug23 (same tag, different parent)

Result: bug23 appears in TWO tree paths:
  - tab-manager.bug23.auth
  - backend.bug23.auth
```

**Key Properties:**
- Drop direction establishes parent → child relationship
- Same tag can appear under multiple parents
- Paths follow directed edges: `parent.child.grandchild`
- Search supports both flat ("bug23") and hierarchical ("tab-manager.bug23")

**Data Model:**
```javascript
// Option A: Store relationships as directed edges
tagRelationships = [
  { parent: "tab-manager", child: "bug23", created: 1234567890 },
  { parent: "backend", child: "bug23", created: 1234567891 },
  { parent: "bug23", child: "auth", created: 1234567893 }
]

// Option B: Store parent/child lists on each tag
tag = {
  id: "bug23",
  name: "bug23",
  description: "Bug #23 - auth timeout issue",
  parents: ["tab-manager", "backend"],
  children: ["auth"],
  color: "red",
  icon: "🐛"
}
```

**Recommendation:** Use edge list (Option A) for cleaner graph operations

**UI Implications:**
- Tree view shows tag in multiple places
- Visual indicator (⭐) marks primary/canonical location
- Clicking any instance shows same items (it's the same tag)

**Challenges:**
- Must prevent cycles (A → B → A)
- Visual clutter (tag appears many places)
- Deletion logic (remove edge vs. delete tag entirely)

### Wildcard Search for Hierarchical Paths

**Purpose:** Pattern matching in tag paths

**Syntax:**
```
* = Match any tag at this level (single level)
? = Match single character in tag name
** = Match any depth (zero or more levels)

Examples:
  tab-manager.*.auth
    → Matches: tab-manager.bug23.auth ✅
    → Matches: tab-manager.urgent.auth ✅
    → Does NOT match: tab-manager.auth ❌ (no middle level)

  tab-manager.bug??
    → Matches: tab-manager.bug01 ✅
    → Matches: tab-manager.bug23 ✅
    → Does NOT match: tab-manager.bug1 ❌ (only 1 char)

  tab-manager.**
    → All descendants (any depth)
    → Matches: bug23, bug23.auth, bug23.auth.timeout, etc.

  *.auth
    → Any tag with "auth" as direct child
    → Matches: bug23.auth, backend.auth, urgent.auth
```

**Implementation:**
- Convert wildcard pattern to regex
- Match segment-by-segment in path
- Prune non-matches early (performance)

**Phase 1:** Implement `*` and `?` only
**Phase 2:** Add `**` for multi-level matching
**Phase 3:** Optional character classes `[0-9]`, `[a-z]` if needed

### Projects (Soft Hierarchy + Flexible Tags)

**Core Concept:** Projects are containers with optional parent/child relationships

**Data Model:**
```javascript
project = {
  id: "bug-23",                    // Immutable ID (generated)
  name: "Auth Bug Investigation",  // Mutable display name
  description: "Investigating login timeout issue",

  // Optional hierarchy (soft, not required)
  parentProject: "tab-manager",    // Optional: parent project ID

  // What belongs to this project
  members: {
    groups: [groupId42, groupId43],     // Chrome groups (with all tabs)
    links: ["url1", "url2"],            // Individual saved links
    tags: ["auth", "urgent", "backend"] // Items with ANY of these tags
  },

  // Project metadata
  color: "red",
  icon: "🐛",
  created: 1234567890,
  lastOpened: 1234567890,
  archived: false
}
```

**Key Features:**
- Groups are first-class project members
- Individual links can belong to projects
- Sub-projects supported (bug-23 under tab-manager)
- Renaming works (ID ≠ name)
- Hierarchy is OPTIONAL (can have flat projects)
- Tags provide cross-cutting flexibility

**Example Hierarchy:**
```
tab-manager (parent project)
  ├─ bug-23 (child project)
  ├─ feature-2 (child project)
  └─ refactor-core (child project)
```

**Operations:**
- Open project → opens all groups, links, and items with project tags
- Rename project → preserves ID, updates display name only
- Create sub-project → sets parentProject field

**Why This Works:**
- Structure when you want it (parent/child projects)
- Flexibility when you need it (tags across projects)
- No forced hierarchies (can use flat projects)
- Cross-cutting views (filter by tag across all projects)

### Meta-Tagging (Tagging Tags)

**Status:** Documented in Claude.ai ThoughtBox project

**Key Insight:** Instead of "tagging tags," use tag DAG where tags have parent/child relationships

**Example:**
- Drop "Python" onto "Programming Languages" → creates edge
- Drop "Python" onto "Data Science Tools" → creates another edge
- Python appears under both parents in tree view
- Filtering "Python" shows all Python items (any path)
- Filtering "Programming Languages.Python" shows Python items via that path

**This unifies:**
- Tags (flexible, cross-cutting)
- Hierarchies (structured, navigable)
- Meta-tags (tags about tags → just parent/child relationships)

## Open Questions / TBD

1. **AI Integration:**
   - Use Claude API (requires API key, costs money)
   - Use local model (heavy, slow)
   - Use browser's built-in AI APIs (Gemini Nano - experimental)
   - **New:** Pass existing tags + descriptions to AI for consistency

2. **Content Extraction:**
   - Just highlights or full-text indexing?
   - How to handle dynamic/JS-rendered content?
   - PDF support?

3. **UI/UX:**
   - Popup (like Tab Manager) or full page?
   - Side panel (Chrome 114+)?
   - Separate management interface?
   - How to visualize tag DAG without confusion?

4. **Sync/Backup:**
   - Local only (current vision)
   - Optional cloud backup?
   - Self-hosted sync server?

5. **Performance:**
   - How many bookmarks before IndexedDB slows down?
   - Pagination strategy?
   - Background indexing?
   - Tag DAG query performance (graph traversal)

6. **Tag Hierarchy Limits:**
   - Can a tag have unlimited parents? → Probably limit to 3-5
   - Max hierarchy depth? → Maybe 5 levels to prevent over-nesting
   - Cycle prevention strategy?

## Next Steps (When Ready to Start)

1. Create new repo: `thoughtbox-chrome-ext`
2. Fork Tab Manager code as starting point
3. Design IndexedDB schema (mockup data model)
4. Prototype basic bookmark save/list (Phase 1)
5. Test IndexedDB performance with realistic data (100-1000 bookmarks)
6. Evaluate permission requirements
7. Build iteratively (Phase 2, 3, 4...)

## Notes

- This document is a living brainstorm - requirements will evolve
- Tab Manager project stays frozen as reference implementation
- ThoughtBox becomes the knowledge management evolution

---

**Last Updated:** 2026-01-28
**Status:** Requirements gathering phase - no code yet
