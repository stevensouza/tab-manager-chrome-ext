# Feature Ideas for Tab Manager

*Ideas generated during brainstorming sessions - not committed features*

---

## High-Impact Features

### 1. Session/Workspace Management ⭐ MOST REQUESTED
**Problem:** Switching between projects/contexts (work research → personal → different work project)

**Solution:**
- Save entire tab state as named sessions ("React Research", "Trip Planning", "Bug Investigation")
- Quick-switch between saved sessions
- Auto-save current session before closing browser
- Hybrid mode: Keep some tabs persistent across sessions

**Why impactful:** Solves tab hoarding and context switching

---

### 2. Tab Suspend/Memory Management
**Problem:** 88 tabs = browser eating 4+ GB RAM, fans spinning

**Solution:**
- Auto-suspend tabs not visited in X days/hours
- Visual indicator for suspended tabs (grayed out)
- Click to reload on demand
- Show memory saved: "52 tabs suspended, saved 2.1 GB"

**Why impactful:** Keeps tabs visible/searchable but browser fast

**Technical notes:**
- Chrome doesn't provide memory API for extensions
- Would need to track tab state and use chrome.tabs.discard()
- Could estimate memory saved using heuristics

---

### 3. Extended Archive with Full-Text Search
**Problem:** Recently Closed limited to 25, fear of losing research

**Solution:**
- Unlimited local archive of closed tabs (store in chrome.storage)
- Full metadata: URL, title, favicon, group, close date, notes
- Search archive (not just active tabs)
- Restore with original group context
- "Archive Group" button (close but searchable)

**Why impactful:** Eliminates "tab bankruptcy" fear, makes closing safe

**Technical notes:**
- chrome.storage.local has ~5MB limit (need to handle quota)
- Could store 1000+ tabs with URL+title+metadata
- Consider IndexedDB for unlimited storage

---

### 4. Tab Aging & Cleanup Suggestions
**Problem:** 30 tabs opened weeks ago, forgotten, cluttering view

**Solution:**
- Badge showing age: "14d" for tabs not visited in 2 weeks
- Auto-suggest cleanup: "12 tabs untouched in 30 days - archive them?"
- Filter: "Show tabs older than X days"
- One-click bulk archive old tabs per group

**Why impactful:** You already track `lastAccessed`, this makes it actionable

**Technical notes:**
- Already have tab.lastAccessed from Chrome API
- Could add age calculation to existing badge system
- Age ranges: <1 day, 1-7 days, 7-30 days, >30 days

---

### 5. Bulk Actions & Multi-Select
**Problem:** Managing 88 tabs one-at-a-time is tedious

**Solution:**
- Checkbox mode: select multiple tabs
- Bulk: close, move to group, suspend, archive, bookmark
- Smart select: "All tabs from github.com", "All older than 7 days"

**Why impactful:** Scales to heavy users, huge time-saver

**UI considerations:**
- Toggle checkbox mode (button in header)
- Visual feedback for selected count
- Bulk action bar appears when items selected

---

### 6. Tab Notes & Context
**Problem:** Future-you doesn't remember why you opened "Untitled document - Google Docs"

**Solution:**
- Quick notes field per tab (stored in chrome.storage)
- Shows in search results
- Example: "Article about React hooks - found via HN, read later"

**Why impactful:** Makes tabs self-documenting for research

**Storage:**
```javascript
tabNotes = {
  "https://docs.google.com/document/d/abc123": {
    note: "Article about React hooks - found via HN, read later",
    created: 1234567890,
    modified: 1234567890
  }
}
```

---

## Lower Effort, High Value

### 7. Smart Auto-Group Suggestions
- "You have 8 GitHub tabs - create group?"
- "Create group from these 5 tabs opened in last hour?"
- Pattern detection: same domain, opened together, visited together

### 8. Reading Queue Mode
- Mark tabs "to read" (star icon)
- Separate section like Recently Closed
- Estimate reading time using visit count heuristic
- "Mark as read" → auto-archive

### 9. Export/Share
- Export group as markdown list with titles + URLs
- Export all tabs, filtered tabs, or specific group
- Share research with colleagues
- Backup tab state to file (JSON)
- Import tab state from file

**Export format example:**
```markdown
# Work Research - Exported 2026-01-24

## React Documentation (5 tabs)
- [React Hooks](https://react.dev/hooks)
- [useEffect Guide](https://react.dev/useEffect)
...

## GitHub Issues (3 tabs)
- [Issue #123](https://github.com/...)
```

---

## Feature Ideas from User Brainstorming

### 10. Tag System with Metadata (2026-01-24) ⭐ NEW
**Concept:** Multi-dimensional organization beyond groups

**Description:**
- Tags as flexible labels (many-to-many vs groups' one-to-many)
- Tags can apply to tabs, groups, or both
- Each tag has metadata: description, color, auto-rules, etc.
- Manual or AI-generated tags
- Operations: "Open all [tag]", "Close all [tag]", filter by tag

**Use cases:**
- Tag "urgent" across multiple groups
- Tag single tab: "read-later" + "coding" + "reference"
- Tag entire groups: Group "Work Emails" → tags "work" + "communication"
- Open all "news" items (groups + individual tabs)
- Search/filter by tag combinations

**Metadata possibilities:**
- **description** (required) - What this tag represents
- **color** - Visual coding (distinct from group colors)
- **auto-tag rules** - Regex patterns for URLs (auto-tag github.com/* as "coding")
- **creation date** - When tag was created
- **parent tags** - Hierarchical organization ("tech" → "coding", "tech" → "news")
- **icon** - Emoji or icon for visual identification

**Technical considerations:**
- Storage: chrome.storage.local for tag-to-URL mapping
- AI generation options:
  - **Level 1: Pattern-based** (No permissions needed)
    - Domain matching: `*.github.com` → `coding`
    - Title keywords: "recipe" → `cooking`
    - URL patterns: `/docs/` → `documentation`
  - **Level 2: Local analysis** (Minimal permissions)
    - Extract page title keywords (already have this)
    - Analyze URL structure
    - Look at visit patterns (visited with other coding tabs → probably coding)
  - **Level 3: LLM-based** (User opt-in, API key required) ⭐
    - Send URL + title + **existing tags with descriptions** to Claude API
    - AI suggests tags from existing set OR proposes new ones
    - User approves/rejects (builds training data)
    - **Key advantage:** AI can assign to existing tags automatically, maintaining consistency
    - Example prompt: "Given tags: 'coding' (programming work), 'news' (current events), 'urgent' (needs immediate attention) - suggest tags for: https://github.com/issues/security-alert"
- UI: Tag chips on tabs, tag filter/search, tag management panel
- Performance: Index for fast tag lookups on 100+ tabs

**Integration with existing features:**
- Tags + session management: Save/restore by tag
- Tags + recently closed: Preserve tags when archiving
- Tags + search: Search within tagged items
- Tags + sorting: Sort by tag priority

**Example workflow:**
```
1. User manually tags GitHub tabs as "coding" + "work"
2. Tags Google Docs as "writing" + "personal"
3. Filters by "work" tag → sees GitHub tabs + work groups
4. Clicks "Open all news" → opens all items tagged "news"
5. Auto-tag rule: *.stackexchange.com → "coding" + "reference"
```

**Comparison: Tags vs Groups**

| Feature | Groups | Tags |
|---------|--------|------|
| Tab membership | One group only | Multiple tags |
| Visual in Chrome | Yes (native) | No (extension-only) |
| Organization | Hierarchical sections | Cross-cutting labels |
| Metadata | Title, color | Description, color, rules, hierarchy |
| Best for | Project boundaries | Attributes/characteristics |
| Example | "Work Email" group | "urgent", "read-later", "reference" tags |

**Complexity:** HIGH (new storage layer, UI, operations)
**Impact:** VERY HIGH (power-user feature, enables new workflows)

---

### 11. Read/Unread Status Tracking ⭐ NEW (2026-01-24)
**Problem:** Hard to track which articles/newsletters you've actually read vs just clicked

**Use case:**
- Neuron newsletter tabs - which ones have you actually read?
- Research papers - clicked to save, but haven't read yet
- Long articles - read halfway, want to mark unread until finished

**Solution:**
- Manual read/unread toggle (not automatic on click)
- Visual indicator: unread badge (bold title?), read checkmark
- Filter: "Show only unread"
- Smart features:
  - "Mark group as read" bulk action
  - Auto-mark as read after X seconds of active tab focus (optional)
  - Reading progress tracking: "50% read" (advanced feature)

**Storage:**
```javascript
readStatus = {
  "https://neuron.com/newsletter/123": {
    read: false,
    markedAt: 1234567890,
    readingProgress: 0.5,  // Optional: 50% scrolled
    timeSpentReading: 180  // Optional: seconds actively reading
  }
}
```

**UI elements:**
- Toggle button on each tab (click to mark read/unread)
- Unread count badge: "12 unread in this group"
- Filter: Show unread only
- Bulk actions: "Mark all as read", "Mark old as read"

**Integration:**
- Tags: "unread" tag auto-applied/removed (or separate system)
- Archive: Track read status in archived items
- Sessions: "Open all unread tabs" for morning reading routine
- Export: Include read/unread status in exports

**Why impactful:**
- Solves "analysis paralysis" of too many open articles
- Makes tab manager into reading queue manager
- Reduces guilt of closing tabs ("I marked it read, so I'm done")

**Complexity:** MEDIUM (storage + UI toggles)
**Impact:** HIGH (transforms tab manager into reading workflow tool)

---

### 12. Enhanced Notes & Link Metadata ⭐ CRITICAL (2026-01-24)
**Problem:** URLs alone don't capture context, insights, or why you saved something

**Expansion of Feature #6 with richer metadata:**

**Solution:**
- Rich text notes per URL (markdown support)
- Metadata fields:
  - **Notes/Summary:** Free-form text describing content
  - **Key quotes:** Save important excerpts
  - **Why saved:** Reasoning for keeping this link
  - **Related to:** Link to other tabs/projects
  - **Source:** Where you found this (HN, Twitter, colleague, etc.)
  - **Date added:** Auto-tracked
  - **Last viewed:** Auto-tracked
  - **Read status:** Integration with Feature #11

**Storage:**
```javascript
linkMetadata = {
  "https://example.com/article": {
    notes: "Explains React Server Components well. Key insight: server components don't send JS to client.",
    keyQuotes: [
      "Server Components never re-render, they run once on the server",
      "Use .server.js extension for server components"
    ],
    whySaved: "Need to implement this pattern for dashboard project",
    relatedUrls: ["https://react.dev/rsc", "https://github.com/my/project"],
    source: "Hacker News frontpage",
    tags: ["coding", "react", "reference"],
    readStatus: "unread",
    dateAdded: 1234567890,
    lastViewed: 1234567900,
    viewCount: 3
  }
}
```

**UI:**
- Quick note field (one-liner) visible inline
- "Expand" to full note editor with all fields
- Search notes content (full-text search)
- Show notes in search results

**Why this is CRITICAL for research manager:**
- Transforms tabs from "I have this open" to "Here's WHY I have this and WHAT I learned"
- Makes knowledge persistent beyond active tabs
- Enables building personal knowledge base

**Complexity:** MEDIUM-HIGH (rich UI for note editing)
**Impact:** CRITICAL (foundation for research management evolution)

---

---

## 🚀 Project Vision: Evolution Beyond Tab Manager (2026-01-24)

### From Tab Manager → Research & Knowledge Manager

**Current state:** Chrome extension for managing open tabs (groups, search, duplicates, recently closed)

**Vision:** Comprehensive research and reading management system that handles:
1. **Active tabs** (current)
2. **Saved bookmarks/links** (new) - like Delicious
3. **Reading queue** (new) - like Pocket/Instapaper
4. **Research projects** (new) - organized workspaces with notes
5. **Knowledge base** (new) - personal wiki of saved knowledge

### Comparison: Delicious + More

**What Delicious had:**
- Save links with tags
- Notes/descriptions
- Public/private bookmarks
- Discover what others are bookmarking
- Browser extension for quick save
- Full-text search

**What we'd add beyond Delicious:**
- ✅ **Active tab integration** - manage open tabs AND saved links together
- ✅ **Read/unread tracking** - reading workflow management
- ✅ **Rich metadata** - notes, quotes, sources, related links
- ✅ **AI tagging** - auto-suggest tags using LLM
- ✅ **Session/workspace management** - organize by research project
- ✅ **Smart organization** - groups + tags (multi-dimensional)
- ✅ **Recently closed** - bridge between active and archived
- ✅ **Privacy-first** - no social features, local-first storage
- ✅ **Research-focused** - designed for deep work, not just bookmarking

### Competing Tools & Our Differentiation

**Pocket/Instapaper:**
- Focus: Reading queue (save for later)
- Missing: No tab management, weak organization (tags only)
- **Our advantage:** Unified tabs + saved links, richer organization (groups + tags + sessions)

**Raindrop.io:**
- Focus: Bookmark manager with collections
- Missing: No active tab management, no read/unread workflow
- **Our advantage:** Manage what's open NOW alongside what's saved

**OneTab:**
- Focus: Convert tabs to list (memory saving)
- Missing: No organization, no metadata, no search
- **Our advantage:** Rich organization, notes, tags, search, sessions

**Notion/Obsidian:**
- Focus: Note-taking and knowledge base
- Missing: Not designed for tab/link management, heavyweight
- **Our advantage:** Lightweight, browser-integrated, link-first design

### Architecture: Two Modes or One Unified System?

**Option A: Dual-mode (Tab Manager + Bookmark Manager)**
```
┌─ Tab Manager Mode ─────────┐  ┌─ Research Library Mode ──────┐
│ - Active tabs              │  │ - Saved links                │
│ - Recently closed (25)     │  │ - Archived tabs (unlimited)  │
│ - Groups (Chrome native)   │  │ - Collections (custom)       │
│ - Quick operations         │  │ - Rich metadata              │
│ [Switch to Library →]      │  │ [← Switch to Tabs]           │
└────────────────────────────┘  └──────────────────────────────┘
```

**Option B: Unified View**
```
┌─ Research Manager ─────────────────────────────────────┐
│  Filters: [📂 All] [🟢 Open] [📚 Saved] [👓 Unread]   │
│  Tags: coding×23  news×12  urgent×5                    │
│  Search: [________________________] 🔍                  │
├────────────────────────────────────────────────────────┤
│  🟢 OPEN TABS                                          │
│    📂 Work Research (5 open)                           │
│      • GitHub Issue #123 [🟢 open] [👓 unread]        │
│      • React Docs [🟢 open] [✓ read] 💾📝            │
│                                                         │
│  📚 SAVED LINKS                                        │
│    📂 React Learning (12 saved)                        │
│      • React Server Components [💾 saved] [👓 unread] │
│        📝 "Explains RSC well - key insight: ..."      │
│      • useEffect Guide [💾 saved] [✓ read] ⭐        │
│                                                         │
│  🕒 RECENTLY CLOSED (7)                                │
│      • CNN Article [closed 2h ago] [👓 unread]        │
└────────────────────────────────────────────────────────┘

Symbols:
🟢 = Currently open in browser
💾 = Saved/bookmarked (may or may not be open)
👓 = Unread
✓ = Read
📝 = Has notes
⭐ = Favorited/starred
```

**Recommendation: Start with Dual-mode, evolve to Unified**
- Phase 1: Keep current Tab Manager, add separate "Library" view
- Phase 2: Merge views with smart filters (show open/saved/all)
- Reason: Easier incremental development, less risky

### New Permissions Needed

**Current permissions:**
- tabs, tabGroups, sessions, storage, history ✅

**Would need to add:**
- **storage** (already have) - for unlimited bookmark storage
- **bookmarks** (optional) - sync with Chrome bookmarks
- **NO new privacy concerns** - still no website content access

**Storage strategy:**
- chrome.storage.local (5MB) - active tabs, recent metadata
- IndexedDB (unlimited) - archived links, notes, full metadata
- Optional sync: chrome.storage.sync or external service

### User Workflows Enabled

**Research Project Workflow:**
```
1. Start new research: "Learn React Server Components"
2. Create session: "RSC Learning"
3. Open 10 tabs, tag all with "react" + "learning"
4. Add notes to key tabs: "This explains it well"
5. Mark some as read, some unread
6. Close session (saves all tabs with metadata)
7. Week later: Reopen "RSC Learning" session
8. Continue reading, add more tabs/notes
9. Export session as markdown: "RSC Learning Notes.md"
```

**Daily Reading Workflow:**
```
1. Morning: Open "News" session (saved news sources)
2. Browse headlines, save interesting articles
3. Tag as "read-later" + "urgent" or "background"
4. Lunch: Filter "urgent" + "unread" → reading queue
5. Mark as read, add quick notes on key articles
6. Evening: Archive read articles (searchable later)
7. "Close all read tabs" → clean workspace
```

**Code Research Workflow:**
```
1. Debugging issue: Open GitHub, Stack Overflow, docs
2. Tag all with "bug-fix-auth" (project-specific tag)
3. Add notes: "This SO answer helped - used approach #2"
4. Save key tabs to "Auth Reference" collection
5. Close tabs when bug fixed
6. Month later: Similar bug → search "auth" in library
7. Find saved tabs with notes from previous solution
```

### Technical Architecture Changes

**Current architecture:**
```
popup.js (1400 lines) → Chrome APIs (tabs, groups, sessions, storage)
                     → Renders UI in popup.html
```

**Future architecture (modular):**
```
┌─ UI Layer ─────────────────────────────────────────────┐
│  popup.html/popup.js - Main interface                  │
│  library.html/library.js - Research library view       │
│  note-editor.html - Rich note editing                  │
└────────────────────────────────────────────────────────┘
          ↓
┌─ Data Layer ───────────────────────────────────────────┐
│  data-manager.js - Abstract data operations            │
│    ├─ tab-manager.js - Active tabs (Chrome API)        │
│    ├─ bookmark-manager.js - Saved links (IndexedDB)    │
│    ├─ session-manager.js - Workspaces/sessions         │
│    ├─ tag-manager.js - Tag operations                  │
│    └─ search-engine.js - Full-text search              │
└────────────────────────────────────────────────────────┘
          ↓
┌─ Storage Layer ────────────────────────────────────────┐
│  Chrome Storage (5MB) - Active state, prefs            │
│  IndexedDB (unlimited) - Archived links, notes         │
│  Optional: Cloud sync service                          │
└────────────────────────────────────────────────────────┘
          ↓
┌─ Background Services ──────────────────────────────────┐
│  background.js - Badge updates, auto-tagging           │
│  ai-service.js - LLM tagging (optional)                │
│  sync-service.js - Cloud backup (optional)             │
└────────────────────────────────────────────────────────┘
```

### Migration Path: Tab Manager → Research Manager

**Phase 1: Foundation (Current + Quick Wins)**
- ✅ Current tab manager functionality
- ✅ Recently closed tabs (done)
- ➕ Tab notes (simple text field)
- ➕ Read/unread tracking
- ➕ Export tabs to markdown

**Phase 2: Tags & Organization**
- ➕ Tag system (manual tags)
- ➕ Enhanced notes (rich metadata)
- ➕ Session management (save/restore tab sets)
- ➕ Extended archive (unlimited, searchable)

**Phase 3: Research Library**
- ➕ Separate "Library" view for saved links
- ➕ Save links without opening tabs
- ➕ Full-text search (tabs + saved links)
- ➕ Collections (like groups, but for saved links)

**Phase 4: AI & Advanced Features**
- ➕ AI tagging (LLM-based, opt-in)
- ➕ Smart suggestions ("Save this for Project X")
- ➕ Reading analytics (time spent, completion rate)
- ➕ Related link discovery (find similar saved items)

**Phase 5: Knowledge Management**
- ➕ Link relationships (graph view)
- ➕ Note linking (wiki-style [[links]])
- ➕ Project workspaces (multi-session management)
- ➕ Export to external tools (Obsidian, Notion, etc.)

### Decision Point: New Project or Evolution?

**Option A: Evolve current Tab Manager**
- ✅ Continuity for existing users
- ✅ Leverage existing codebase
- ❌ Risk feature bloat
- ❌ Harder to maintain focus

**Option B: New "Research Manager" project**
- ✅ Clean slate, better architecture
- ✅ Clear product vision from start
- ✅ Can coexist with Tab Manager
- ❌ Duplicated effort
- ❌ Split user base

**Recommendation: Evolve current project with modular architecture**
- Keep Tab Manager as "core mode"
- Add Research Library as "advanced mode"
- Users choose which features to enable (progressive disclosure)
- Code stays modular (easy to maintain/test)

### Target Users

**Current user:** Developer with 50-100 tabs, uses groups, needs duplicate detection

**Future user:** Knowledge worker / researcher / student who:
- Opens 20+ tabs daily for research
- Saves 100+ articles/links per month
- Works on multiple projects simultaneously
- Needs to recall "where did I see that article about X?"
- Wants to build personal knowledge base over time

### Success Metrics

**Current (tab management):**
- Tabs managed, duplicates closed, groups created

**Future (research management):**
- Links saved per week
- Read/unread completion rate
- Sessions created/used
- Search usage (finding saved knowledge)
- Notes/metadata added (engagement with knowledge capture)
- Time saved vs. alternative tools (Pocket + OneTab + Delicious)

---

## Implementation Priority (Revised for Research Manager Vision)

### 🎯 Path 1: Tab Manager Enhancement (Conservative)
*Keep current scope, add polish and power features*

**Phase 1 - Quick Wins:**
1. Tab aging badges (extend existing badge system)
2. Export/share (simple JSON/markdown output)
3. Read/unread tracking (manual toggle)
4. Basic tab notes (simple text field)

**Phase 2 - Core Power Features:**
1. Extended archive (extend recently closed to unlimited)
2. Session management (save/restore tab sets)
3. Tag system MVP (manual tags, basic filtering)

**Phase 3 - Polish:**
1. Bulk actions & multi-select UI
2. Tab suspend/memory management
3. Smart auto-group suggestions

### 🚀 Path 2: Research Manager Evolution (Ambitious)
*Transform into comprehensive knowledge management tool*

**Phase 1 - Foundation (Build on current Tab Manager):**
1. ✅ Current functionality (done)
2. ✅ Recently closed tabs (done in v2.2)
3. **Read/unread tracking** - manual marking (Feature #11)
4. **Enhanced notes** - rich metadata per URL (Feature #12)
5. **Export to markdown** - preserve notes + read status
6. Refactor codebase for modularity (data-manager.js, etc.)

**Phase 2 - Tags & Organization:**
1. **Tag system MVP** (Feature #10)
   - Manual tags with descriptions
   - Tag filtering and search
   - Tags on tabs (not groups yet)
2. **Extended archive** - unlimited storage via IndexedDB (Feature #3)
3. **Session management** - save/restore entire workspaces (Feature #1)
4. **Bulk actions** - multi-select and batch operations (Feature #5)

**Phase 3 - Research Library (New Capabilities):**
1. **Separate Library view** - saved links independent of open tabs
2. **Save link without opening** - quick save from context menu
3. **Full-text search** - search across tabs, saved links, notes
4. **Collections** - organize saved links (like groups for bookmarks)
5. **Unified view option** - toggle between tabs-only / library-only / combined

**Phase 4 - AI & Intelligence:**
1. **AI tagging Level 1** - pattern-based auto-tagging
2. **AI tagging Level 2** - local keyword extraction
3. **AI tagging Level 3** - LLM-based with existing tag awareness
4. **Smart suggestions** - "Save this to Project X?" based on tags
5. **Related link discovery** - find similar saved items

**Phase 5 - Knowledge Management:**
1. **Tag hierarchy** - parent/child tag relationships
2. **Link relationships** - manually link related items
3. **Project workspaces** - multi-session management
4. **Reading analytics** - time tracking, completion rates
5. **Export integrations** - Obsidian, Notion, Markdown

### 🤔 Recommended Approach: Hybrid Path

**Start conservative, expand based on usage:**

1. **Next 2-4 weeks (Quick wins that move toward vision):**
   - Read/unread tracking (Feature #11)
   - Enhanced notes with metadata (Feature #12)
   - Export to markdown (Feature #9)
   - Extended archive with unlimited storage (Feature #3)

2. **Next 1-2 months (Core research features):**
   - Tag system MVP (Feature #10)
   - Session management (Feature #1)
   - Full-text search (tabs + archive + notes)

3. **Next 3-6 months (Research Library):**
   - Separate Library view
   - Save links without opening tabs
   - Collections for saved links
   - Unified view option

4. **Future (Advanced features, user-driven):**
   - AI tagging (if users request it)
   - Reading analytics (if data shows usage)
   - External integrations (if users need it)

**Decision gates:**
- After each phase, evaluate: Is this useful? Are people using it?
- Pivot if users want simpler tool (stay Tab Manager)
- Expand if users want knowledge management (become Research Manager)

---

## Notes

- All features respect existing permission philosophy (NO website content access)
- Storage limits: chrome.storage.local ~5MB, consider IndexedDB for unlimited
- UI space limited by popup size (600x800px max recommended)
- Performance: Test with 500+ tabs (some users have this many)

## Open Design Questions

### Q2: Can Tags Be Tagged? (Tag Hierarchies vs Tag Relationships) (2026-01-24)

**User's exploration:**
> "would it be helpful to be able to tag tags? for example what would it mean if tab-manager was tagged with bug23. could that be accessible as tab-manager.bug23 or could order be optional bug23.tab-manager is just as valid or it could be viewed that way but we also remember what was dropped on what and that could be the primary hierarchy"

**The insight:** Combine strengths of tags (flexible) and hierarchies (structured) into one system.

#### What Does "Tag a Tag" Mean?

**Four possible interpretations:**

#### Interpretation 1: Traditional Parent/Child Hierarchy
```
tab-manager (parent tag)
  └─ bug23 (child tag)
      └─ auth (grandchild tag)

Rules:
- bug23 IS A tab-manager tag
- Items tagged "bug23" automatically inherit "tab-manager"
- One parent only (strict hierarchy)
- Access: tab-manager.bug23.auth

❌ Problem: Rigid - bug23 can't also be under "backend" parent
```

#### Interpretation 2: Tag Associations (Bidirectional, Order Doesn't Matter)
```
tab-manager <---> bug23 <---> auth

Rules:
- Tags are "related" or "associated"
- No parent/child, just connections
- Navigate in any direction
- Search "bug23" might show related "tab-manager"

❌ Problem: No structure for display - just a graph
✅ Flexible but lacks navigable hierarchy
```

#### Interpretation 3: Tag Composition (Order Creates Different Tags)
```
Drop bug23 onto tab-manager → "tab-manager.bug23" (composite tag)
Drop tab-manager onto bug23 → "bug23.tab-manager" (different composite tag)

Rules:
- Order matters, creates distinct composite tags
- Both components still searchable independently
- Example: "urgent.coding" ≠ "coding.urgent"

❌ Problem: Might create tag explosion
❌ Users won't understand why order matters
```

#### Interpretation 4: Soft Hierarchies with Multiple Perspectives ⭐ (User's Intent)
```
Drop bug23 onto tab-manager:
  - Creates relationship: tab-manager → bug23
  - Primary display path: tab-manager.bug23
  - But bug23 is ALSO searchable as standalone tag
  - Bug23 can have MULTIPLE parents

Example:
  Drop bug23 onto tab-manager → tab-manager.bug23
  Drop bug23 onto backend → backend.bug23

Result: bug23 appears in TWO places in tree view:
  tab-manager/
    └─ bug23
  backend/
    └─ bug23

But filtering by "bug23" alone → shows ALL bug23 items (regardless of hierarchy)
```

**This is a Tag DAG (Directed Acyclic Graph)** - tags can have multiple parents!

#### Concrete Examples

**Example 1: Same tag in multiple hierarchies**
```
Project tags:
  tab-manager/
    └─ bug23
  backend/
    └─ bug23

Tag "bug23" has TWO parents, appears in both trees

Operations:
  - Navigate tree → "tab-manager" → "bug23" (shows hierarchy)
  - Search "bug23" → shows ALL items (ignores hierarchy)
  - Filter "tab-manager + bug23" → intersection (items in that path)
```

**Example 2: Deep nested tags with multiple paths**
```
Create tags by dropping:
  - Drop "auth" onto "backend" → backend.auth
  - Drop "bug23" onto "auth" → backend.auth.bug23
  - Drop "bug23" onto "urgent" → urgent.bug23

Tree view shows:
  backend/
    └─ auth/
        └─ bug23
  urgent/
    └─ bug23

Same "bug23" tag, visible in multiple paths
Search "bug23" → finds everything with bug23 tag
```

**Example 3: Remembering "drop direction" establishes parent-child relationship**
```
You drop bug23 onto tab-manager:
  - Creates directed edge: tab-manager → bug23
  - tab-manager is parent, bug23 is child
  - Valid path: "tab-manager.bug23"
  - Invalid path: "bug23.tab-manager" (wrong direction)

Later drop bug23 onto backend:
  - Creates directed edge: backend → bug23
  - backend is parent, bug23 is child
  - Valid path: "backend.bug23"

Later drop auth onto bug23:
  - Creates directed edge: bug23 → auth
  - bug23 is parent, auth is child
  - Valid path: "bug23.auth"

Result: bug23 has TWO parents (tab-manager, backend) and ONE child (auth)

"Primary" means: In each pairwise relationship, which is the parent?
  - In (tab-manager, bug23): tab-manager is primary (parent)
  - In (backend, bug23): backend is primary (parent)
  - In (bug23, auth): bug23 is primary (parent)

No global "primary parent" - just directional edges.
```

#### Data Model (Directed Graph of Tags)

```javascript
// Option A: Store parent/child lists on each tag
tag = {
  id: "bug23",
  name: "bug23",
  description: "Bug #23 - auth timeout issue",

  // Tags that are parents of this tag (this tag is their child)
  parents: ["tab-manager", "backend", "urgent"],

  // Tags that are children of this tag (this tag is their parent)
  children: ["auth", "timeout-issue"],

  color: "red",
  icon: "🐛",
  created: 1234567890
}

// Option B: Store relationships as directed edges (cleaner for graphs)
tagRelationships = [
  { parent: "tab-manager", child: "bug23", created: 1234567890 },
  { parent: "backend", child: "bug23", created: 1234567891 },
  { parent: "urgent", child: "bug23", created: 1234567892 },
  { parent: "bug23", child: "auth", created: 1234567893 },
  { parent: "bug23", child: "timeout-issue", created: 1234567894 }
]

// Separate tag metadata (keeps tags simple)
tags = {
  "bug23": {
    name: "bug23",
    description: "Bug #23 - auth timeout issue",
    color: "red",
    icon: "🐛",
    created: 1234567890
  },
  "tab-manager": {
    name: "tab-manager",
    description: "Tab Manager Chrome Extension project",
    color: "blue",
    icon: "📦",
    created: 1234560000
  }
}
```

**Recommendation:** Use Option B (edge list) - cleaner for graph operations, easier to query paths.

**Valid paths for bug23:**
```
From parents to bug23:
  - tab-manager.bug23 ✅
  - backend.bug23 ✅
  - urgent.bug23 ✅

From bug23 to children:
  - bug23.auth ✅
  - bug23.timeout-issue ✅

Deep paths (multi-hop):
  - tab-manager.bug23.auth ✅ (tab-manager → bug23 → auth)
  - backend.bug23.auth ✅ (backend → bug23 → auth)
  - urgent.bug23.timeout-issue ✅ (urgent → bug23 → timeout-issue)

Invalid (wrong direction):
  - bug23.tab-manager ❌ (no edge bug23 → tab-manager)
  - auth.bug23 ❌ (no edge auth → bug23)
```

#### UI Implications

**Tree view (shows all hierarchies):**
```
📦 tab-manager
  ├─ 🐛 bug23 ⭐ (primary)
  ├─ ✨ feature-2
  └─ 🔧 refactor

📦 backend
  ├─ 🔒 auth
  └─ 🐛 bug23 (also here)

📦 urgent
  └─ 🐛 bug23 (also here)
```

**Tag appears in 3 places, but it's the SAME tag**
- ⭐ marks primary/canonical location
- Clicking any instance shows same items
- Can promote different path to primary

**Search/filter view (supports both flat and hierarchical):**
```
Filter: "bug23" (flat search)
→ Shows ALL items tagged bug23
→ Doesn't matter which hierarchy path
→ Ignores hierarchy completely

Filter: "tab-manager.bug23" (hierarchical search)
→ Shows items tagged bug23 that are in tab-manager context
→ Follows parent → child edge direction
→ Alternative to "tab-manager AND bug23"

Filter: "backend.bug23" (different hierarchical path)
→ Shows same items (bug23 is same tag)
→ But accessed via different parent context
→ Both tab-manager.bug23 and backend.bug23 are equally valid paths

Filter: "bug23.tab-manager" (INVALID)
→ Error: No edge from bug23 → tab-manager
→ Wrong direction (tab-manager is parent of bug23, not child)

Filter: "tab-manager.bug23.auth" (deep path)
→ Follows edges: tab-manager → bug23 → auth
→ Shows items tagged auth in this context

Filter: "backend.bug23.auth" (alternative deep path)
→ Follows edges: backend → bug23 → auth
→ Shows same auth items, different parent context
```

**Key insight:** Path notation follows directed edges. Drop direction establishes which is parent.

#### Advantages of This Model

**✅ Flexibility of tags:**
- Can still filter by any tag independently
- No forced single hierarchy
- Cross-cutting views work ("urgent" across all projects)

**✅ Structure of hierarchies:**
- Visual tree for navigation
- Organized view of related tags
- "Drill down" from broad to specific

**✅ Multiple perspectives:**
- Same tag appears in multiple contexts
- bug23 is "part of tab-manager" AND "part of backend"
- Choose which perspective to view from

**✅ Emergent organization:**
- Hierarchy emerges from tagging actions (drops)
- Not pre-planned rigid structure
- Grows organically as you work

**✅ User mental model:**
- Drop interaction is intuitive ("put this under that")
- Can reorganize by changing relationships
- Primary path remembers "how I think about this"

#### Challenges

**❌ Complexity:**
- Tag DAG harder to reason about than tree
- UI must show same tag in multiple places without confusing user
- "Is this the same tag or a copy?"

**❌ Visual clutter:**
- Tag appears in many places in tree
- Could be overwhelming

**❌ Cycles:**
- Must prevent: Drop A onto B, then B onto A
- Need cycle detection (DAG enforcement)

**❌ Deletion:**
- If you delete "tab-manager.bug23" relationship, what happens?
  - Remove bug23 from tab-manager parent
  - But bug23 still exists under other parents
  - If last parent removed, bug23 becomes top-level tag

#### Hybrid Approach: Tags + Projects Revisited

Maybe this is the answer to Q1 (projects vs tags)?

```
Everything is tags (no separate "project" concept)
Tags can have parent tags (multiple parents OK)
Creating hierarchy is just "drop tag onto tag"

Examples:
  - Drop bug23 onto tab-manager → appears under tab-manager
  - Drop feature2 onto tab-manager → appears under tab-manager
  - Drop bug23 onto urgent → NOW appears under both tab-manager AND urgent

Result: tab-manager acts like a "project" (container of related tags)
        But it's just a tag that has child tags

Items tagged "bug23" appear when you:
  - Navigate tree: tab-manager → bug23
  - Search: "bug23" (standalone)
  - Filter: "tab-manager" (shows all descendants including bug23)
```

This unifies projects and tags into one elegant system!

#### Alternative: Two-Tier System (Tags + Meta-Tags)

```
Regular tags: coding, urgent, auth (applied to items)
Meta-tags: tab-manager, backend, project-X (organize regular tags)

Meta-tags can contain regular tags (tag-a-tag)
Regular tags can't contain other tags (simpler)

Example:
  tab-manager (meta-tag)
    ├─ bug23 (regular tag)
    ├─ feature2 (regular tag)
    └─ urgent (regular tag)

Items are tagged with regular tags: bug23, urgent
Meta-tags provide grouping/hierarchy
```

This is simpler but less flexible (two-tier instead of N-tier).

#### Recommendation

**Start simple, evolve to sophisticated:**

**Phase 1: Flat tags only**
- Tags have no hierarchy
- No tag-a-tag
- Just: item has tags, filter by tags

**Phase 2: Tag parent/child (single parent)**
```
tag = {
  id: "bug23",
  parent: "tab-manager"  // One parent only
}

Simple tree, no DAG complexity
```

**Phase 3: Tag DAG (multiple parents)**
```
tag = {
  id: "bug23",
  parents: ["tab-manager", "backend", "urgent"]
}

Full power, appears in multiple hierarchies
```

**User's insight points toward Phase 3** (tag DAG with remembered drop order for primary hierarchy)

But start with Phase 1-2 to validate the concept.

#### Open Questions:
1. Should order of tag path matter? (tab-manager.bug23 vs bug23.tab-manager) → Probably yes, for display hierarchy
2. Can a tag have infinite parents? → Probably limit to 3-5 to prevent chaos
3. How to visualize "same tag in multiple places" without confusion? → Visual cue (⭐ for primary, grayed for secondary)
4. What happens if you delete a parent relationship? → Tag orphaned or moved to another parent
5. Should all tags allow children, or only "meta-tags"? → Probably all (simpler model)

**Status:** Fascinating design space, leans toward tag DAG with directional edges

**Key insights from user clarification:**

1. **"Primary" is per-relationship, not global**
   - In relationship (tab-manager, bug23): tab-manager is parent
   - In relationship (backend, bug23): backend is parent
   - In relationship (bug23, auth): bug23 is parent
   - No single "primary parent" - just directional edges

2. **Path notation follows edge direction**
   - tab-manager.bug23 ✅ (valid edge: tab-manager → bug23)
   - bug23.tab-manager ❌ (invalid: no edge bug23 → tab-manager)
   - Drop direction establishes parent → child

3. **Search supports both flat and hierarchical**
   - "bug23" - flat search (finds all bug23 items, any path)
   - "tab-manager.bug23" - hierarchical search (follows specific path)
   - "backend.bug23" - equally valid alternative path
   - Hierarchical search is alternative to AND: "tab-manager.bug23" ≈ "tab-manager AND bug23"

4. **Same tag, multiple valid paths**
   - tab-manager.bug23.auth ✅
   - backend.bug23.auth ✅
   - Both valid, lead to same "auth" tag, different parent contexts

**This is cleaner than initially thought!** Just a directed graph where:
- Nodes = tags
- Edges = parent → child relationships (from drop actions)
- Paths follow edges
- Search can be flat (node only) or hierarchical (path through edges)

---

### Q2 Extension: Wildcard Search for Hierarchical Paths (2026-01-24)

**User requirement:** Search should support wildcards for pattern matching in hierarchical paths.

**Examples given:**
- `tab-manager.*.today` - Match any single tag between tab-manager and today
- `tab-manager.bug??.backend` - Match bug + 2 chars (bug01, bug23, etc.) as middle tag

#### Wildcard Syntax Options

**Option A: Simple Wildcards (Start Here)**
```
* = Match any tag name at this level (single level)
? = Match single character in tag name

Examples:
  tab-manager.*.today
    → Matches: tab-manager.urgent.today ✅
    → Matches: tab-manager.bug23.today ✅
    → Matches: tab-manager.backend.today ✅
    → Does NOT match: tab-manager.today ❌ (no middle level)
    → Does NOT match: tab-manager.urgent.bug23.today ❌ (two levels)

  tab-manager.bug??.backend
    → Matches: tab-manager.bug01.backend ✅
    → Matches: tab-manager.bug23.backend ✅
    → Does NOT match: tab-manager.bug1.backend ❌ (only 1 char)
    → Does NOT match: tab-manager.bug123.backend ❌ (3 chars)

  urgent.*
    → Matches: urgent.bug23 ✅
    → Matches: urgent.today ✅
    → Matches: urgent.anything ✅
    → All direct children of "urgent" tag

  *.auth
    → Matches: bug23.auth ✅
    → Matches: backend.auth ✅
    → Matches: any-parent.auth ✅
    → Any tag with "auth" as direct child
```

**Option B: Multi-level Wildcard (Add Later)**
```
** = Match any depth (zero or more levels)

Examples:
  tab-manager.**
    → Matches all descendants of tab-manager (any depth)
    → tab-manager.bug23 ✅
    → tab-manager.bug23.auth ✅
    → tab-manager.bug23.auth.timeout ✅

  tab-manager.**.auth
    → Any path from tab-manager to auth (any depth)
    → tab-manager.auth ✅ (zero levels between)
    → tab-manager.bug23.auth ✅ (one level between)
    → tab-manager.urgent.bug23.auth ✅ (two levels between)

  **.urgent
    → Any path ending in urgent
    → urgent ✅ (zero levels before)
    → tab-manager.urgent ✅
    → tab-manager.backend.urgent ✅
```

**Option C: Character Classes (Add If Needed)**
```
[abc] = Match single character from set
[0-9] = Match single digit
[a-z] = Match single lowercase letter

Examples:
  bug[0-9][0-9]
    → Matches: bug01, bug23, bug99 ✅
    → Does NOT match: bug1, bugAB ❌

  tab-manager.bug[0-9][0-9].auth
    → Matches: tab-manager.bug23.auth ✅
    → Matches: tab-manager.bug01.auth ✅

  [a-z]*
    → Tags starting with lowercase letter
```

**Option D: Brace Expansion (Add If Needed)**
```
{a,b,c} = Match any of the alternatives

Examples:
  tab-manager.{bug,feature}*
    → Matches: tab-manager.bug23 ✅
    → Matches: tab-manager.feature2 ✅
    → Does NOT match: tab-manager.refactor ❌

  {tab-manager,backend}.auth
    → Matches: tab-manager.auth ✅
    → Matches: backend.auth ✅
```

**Option E: Full Regular Expressions (Most Powerful)**
```
Use regex syntax in tag name segments

Examples:
  tab-manager.bug\d+.backend
    → Matches: tab-manager.bug23.backend ✅
    → Matches: tab-manager.bug1.backend ✅
    → \d+ = one or more digits

  tab-manager.(bug|feature)\d+
    → Matches: tab-manager.bug23 ✅
    → Matches: tab-manager.feature2 ✅
```

#### Recommended Progression

**Phase 1: Simple Wildcards (Option A)**
- `*` = any tag at this level
- `?` = single character
- Easy to understand, covers most use cases
- Implement first, validate usage

**Phase 2: Multi-level Wildcard (Option B)**
- `**` = any depth
- Essential for "find all descendants" queries
- Natural extension of `*`

**Phase 3: Character Classes (Option C - Optional)**
- `[0-9]`, `[a-z]`, etc.
- Only if users need more precision than `?`
- More complex, might confuse users

**Phase 4: Full Regex (Option E - Optional)**
- Maximum power, maximum complexity
- Only if simpler patterns insufficient
- Could be "advanced mode" toggle

#### Pattern Matching Semantics

**How matching works:**
```javascript
// Pattern: tab-manager.bug??.auth
// Breaks into segments: ["tab-manager", "bug??", "auth"]

// For each segment:
// 1. If literal (no wildcards): exact match
// 2. If has wildcards: pattern match against tag name

// Then validate path exists in graph:
findByPathPattern("tab-manager.bug??.auth") {
  const segments = ["tab-manager", "bug??", "auth"];

  // Start at tab-manager
  let currentTags = ["tab-manager"];

  // For each segment, find matching children
  for (let i = 1; i < segments.length; i++) {
    const pattern = segments[i];
    const nextTags = [];

    for (const tag of currentTags) {
      const children = getChildren(tag);
      const matches = children.filter(child =>
        matchesPattern(child.name, pattern)
      );
      nextTags.push(...matches);
    }

    currentTags = nextTags;
  }

  // currentTags now contains all tags matching full path
  return getItemsWithTags(currentTags);
}

function matchesPattern(tagName, pattern) {
  // Convert wildcard pattern to regex
  // * → .*
  // ? → .
  // Escape other special chars
  const regexPattern = pattern
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regexPattern}$`).test(tagName);
}
```

#### Example Queries and Results

**Setup:**
```
Graph:
  tab-manager → bug01 → auth
  tab-manager → bug23 → auth
  tab-manager → bug23 → backend
  tab-manager → feature2 → ui
  backend → bug23 → auth
  urgent → bug23
```

**Queries:**

```
Query: "bug23"
  → Flat search, ignores hierarchy
  → Finds all items tagged "bug23"

Query: "tab-manager.bug23"
  → Hierarchical, exact match
  → Follows: tab-manager → bug23
  → Finds items tagged "bug23" via this path

Query: "tab-manager.bug*"
  → Pattern: bug + anything
  → Matches: bug01, bug23
  → Finds items tagged bug01 OR bug23 (via tab-manager)

Query: "tab-manager.bug??"
  → Pattern: bug + exactly 2 chars
  → Matches: bug01, bug23
  → Same result as bug* in this case

Query: "tab-manager.bug??.auth"
  → Follows: tab-manager → bug01 → auth ✅
  → Follows: tab-manager → bug23 → auth ✅
  → Finds items tagged "auth" via these paths

Query: "*.bug23.auth"
  → Pattern: any parent of bug23
  → Follows: tab-manager → bug23 → auth ✅
  → Follows: backend → bug23 → auth ✅
  → Finds items tagged "auth" via any parent of bug23

Query: "tab-manager.*" (using Phase 2 multi-level)
  → All direct children of tab-manager
  → Matches: bug01, bug23, feature2

Query: "tab-manager.**" (using Phase 2 multi-level)
  → All descendants of tab-manager (any depth)
  → Matches: bug01, bug23, feature2, auth, backend, ui

Query: "tab-manager.**.auth" (using Phase 2 multi-level)
  → Any path from tab-manager to auth
  → tab-manager → bug01 → auth ✅
  → tab-manager → bug23 → auth ✅
  → tab-manager → bug23 → backend → auth ✅ (if this edge existed)
```

#### UI Considerations

**Search box with pattern hints:**
```
┌─────────────────────────────────────────────────┐
│ Search: tab-manager.bug??.auth            [🔍] │
│                                                  │
│ Pattern hints:                                   │
│   * = any tag    ? = any char    ** = any depth │
└──────────────────────────────────────────────────┘

Results (3 items):
  📄 Login timeout fix
     Path: tab-manager.bug23.auth

  📄 Session expiry issue
     Path: tab-manager.bug01.auth

  📄 OAuth redirect bug
     Path: backend.bug23.auth
```

**Visual feedback for pattern matching:**
```
Search: tab-manager.bug*

Matched tags:
  📦 tab-manager
    ├─ 🐛 bug01 ⭐ (matched by bug*)
    ├─ 🐛 bug23 ⭐ (matched by bug*)
    └─ ✨ feature2 (not matched)
```

#### Performance Considerations

**Optimization strategies:**
- **Index tag names** - Fast pattern matching
- **Pre-compute common wildcards** - Cache results for `tab-manager.*`
- **Limit depth** - `**` searches could be expensive, limit to reasonable depth
- **Incremental matching** - Match segment-by-segment, prune non-matches early

**Example:**
```javascript
// Efficient: Match and prune at each level
Query: "tab-manager.bug??.auth.timeout"

Step 1: Find "tab-manager" (exact) → [tab-manager]
Step 2: Find children matching "bug??" → [bug01, bug23]
Step 3: Find children matching "auth" → [auth, auth]
Step 4: Find children matching "timeout" → [timeout]

Only explore paths that match at each step.
```

#### Open Questions:
1. Should `*` match zero tags (empty segment)? → Probably no, use `**` for that
2. Case sensitivity? → Probably case-insensitive (more user-friendly)
3. Escape character for literal `*` or `?` in tag names? → Use `\*` and `\?`
4. Performance limit on `**` depth? → Maybe warn if depth > 5
5. Combine wildcards: `tab-manager.*.bug??.auth` - allowed? → Yes, each segment independent

**Status:** Feature identified, syntax options documented

**Recommendation:** Start with Phase 1 (simple `*` and `?`), add `**` in Phase 2 if users need it

**Key insight:** Wildcard patterns enable powerful queries while maintaining hierarchical structure!

---

## Open Design Questions

### Q1: What is a "Project"? (2026-01-24)

**Context:** User wants to organize research into projects (e.g., "React Learning", "Trip Planning", "Bug Investigation"). Need to model the relationship between projects, tags, groups, and links.

**The core question:** Is a project just a special type of tag, or is it a distinct concept?

#### Option A: Projects ARE Tags
```
Project "React Learning" = just a tag named "react-learning"
- Simple, unified model (everything is a tag)
- Open project = open all items tagged "react-learning"
- ❌ Loses structure - projects might need richer metadata
- ❌ Doesn't capture "this project uses THESE tags"
```

#### Option B: Projects Are Containers
```
Project "React Learning" = {
  name: "React Learning",
  tags: ["react", "hooks", "components"],
  groups: [groupId42, groupId43],  // Specific Chrome groups
  links: ["url1", "url2"],          // Individual saved links
  notes: "Learning React for dashboard redesign",
  created: 1234567890
}

Open project = open ALL contained items (groups + links + anything with project tags)
- ✅ Rich structure, clear ownership
- ✅ Can have project-level metadata
- ❌ More complex data model
- ❌ Overlapping membership (is a link in project OR tagged?)
```

#### Option C: Projects Are Tag Collections
```
Project "React Learning" = {
  name: "React Learning",
  tags: ["react", "hooks", "components"],  // Just a list of tags
  notes: "Learning React for dashboard redesign"
}

Open project = open all items with ANY of these tags
- ✅ Flexible - items organically belong via tags
- ✅ Simpler than Option B
- ✅ No duplicate membership logic
- ❌ Less explicit - can't save "project-specific" links
```

#### Option D: Hierarchical Tags (Everything Is Tags)
```
Tags with parent/child relationships:
- project:react-learning (top-level)
  ├─ react (child)
  ├─ hooks (child)
  └─ components (child)

Project is just a tag category, opening it opens all children tags
- ✅ Very flexible, elegant model
- ✅ Can nest arbitrarily (sub-projects)
- ❌ Might be too abstract for users
- ❌ "Open project" logic becomes "open tag tree"
```

#### Option E: Hybrid (Projects + Tags, Different Purposes)
```
Projects = temporal workspaces (sessions)
  "What I'm working on this week"
  Contains: current tabs, current state, ephemeral

Tags = permanent attributes
  "What this link IS" (coding, urgent, reference)
  Persists across projects

Example:
- Working on "Bug Fix" project (this week)
- Contains tabs tagged: coding, urgent, client-A
- Next week: Close "Bug Fix" project, open "New Feature" project
- Same tabs might appear (both use tag "client-A")

Open project = restore workspace (session)
Open tag = show all items with that attribute
- ✅ Clear separation of concerns
- ✅ Projects are time-based, tags are attribute-based
- ❌ Two separate systems to maintain
```

#### User's Exploration
> "at any time i may want to open a project and all opens. now at other times maybe i would want to open all links with a tag for example but maybe a project is just a type of tag. not sure."

**Key insights from user:**
- Projects should be openable (like tags)
- Tags should be openable (like projects)
- Maybe they're the same thing?
- Or maybe they're different use cases?

#### Recommendation: Start with Option C (Projects as Tag Collections), Evolve to Option E

**Phase 1: Simple model (Option C)**
```javascript
project = {
  id: "react-learning",
  name: "React Learning",
  description: "Learning React for dashboard redesign",
  tags: ["react", "hooks", "components"],  // Include these tags
  created: 1234567890,
  lastOpened: 1234567890
}

// Open project = open all items tagged with ANY of these tags
function openProject(projectId) {
  const project = projects[projectId];
  const itemsToOpen = getAllItemsWithAnyTag(project.tags);
  openItems(itemsToOpen);
}
```

**Phase 2: Add temporal workspace concept (Option E)**
```javascript
project = {
  ...same as above...,

  // Optional: Snapshot of workspace state
  workspace: {
    openTabs: [...],          // What was open when project saved
    groupState: {...},        // Group arrangement
    windowLayout: {...}       // Multi-window state
  }
}

// Two modes:
// 1. "Open by tags" - open all items tagged with project tags (dynamic)
// 2. "Restore workspace" - restore exact snapshot (static)
```

**Why this progression:**
- Start simple: Projects are just named tag collections
- Users can create "React Learning" project with tags [react, hooks]
- Opening project opens everything with those tags (dynamic, grows over time)
- Later: Add option to snapshot exact workspace state
- Users choose: dynamic tag-based OR static workspace snapshot

#### Questions to Resolve Later:
1. Can items belong to multiple projects? (Yes if tag-based, explicit if container-based)
2. Can projects have sub-projects? (Yes if hierarchical tags, no if flat collections)
3. Do projects persist after all items are closed? (Probably yes - they're organizational, not just active state)
4. Can you "star" or prioritize certain items within a project? (Needs separate metadata)

**Status:** Open question, leaning toward Option C → Option E progression

---

### Q1 Refinement: Soft Hierarchy + Tags (2026-01-24 - Further Discussion)

**New insights from user:**

1. **Groups are first-class project members**
   - A Chrome group (with all its URLs) can be part of a project
   - Individual links can also be part of a project
   - Example: "Bug-23" project might include:
     - Group "Bug-23 Research" (5 tabs)
     - Group "Related Issues" (3 tabs)
     - Individual saved link: "Similar bug from 2024"

2. **Sub-projects exist but hierarchy should be optional/soft**
   - Example: "tab-manager" project (parent)
     - "bug-23" (sub-project)
     - "feature-2" (sub-project)
   - But hierarchy shouldn't be rigid/limiting
   - Should allow cross-cutting organization

3. **Projects need stable IDs (renaming support)**
   - User should be able to rename "bug-23" → "auth-bug-fix"
   - Internal ID stays same (don't break relationships)
   - Display name is just a label

4. **User dislikes rigid hierarchies**
   - "Rigid hierarchies can be limiting"
   - This is where tags provide flexibility
   - Items can belong to multiple tags (cross-cutting)
   - Hierarchy gives structure, tags give flexibility

#### Proposed Model: Soft Hierarchy + Flexible Tags

```javascript
// Projects with optional parent/child
project = {
  id: "bug-23",                    // Immutable ID (generated)
  name: "Auth Bug Investigation",  // Mutable display name
  description: "Investigating login timeout issue",

  // Optional hierarchy (soft, not required)
  parentProject: "tab-manager",    // Optional: parent project ID

  // What belongs to this project
  members: {
    groups: [groupId42, groupId43],     // Chrome groups (with all their tabs)
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

// Example hierarchy:
tab-manager (parent)
  ├─ bug-23 (child)
  ├─ feature-2 (child)
  └─ refactor-core (child)

// But items can also have tags that cross-cut hierarchy:
// bug-23 items tagged "urgent" + "auth"
// feature-2 items tagged "urgent" + "ui"
// Filter "urgent" → shows items from BOTH projects
```

#### How This Solves the Tension

**Structure (via optional hierarchy):**
- Group related work: "tab-manager" contains bug-23, feature-2
- Navigate: "Show me all tab-manager work" → includes all sub-projects
- Organize: "Create bug-23 as sub-project of tab-manager"

**Flexibility (via tags):**
- Cross-cutting views: "Show all urgent work" (across all projects)
- Multiple dimensions: Item can be in bug-23 AND tagged personal + coding
- No forced choices: Don't have to pick ONE place for something

**Concrete example:**

```
Item: GitHub issue "Login timeout after 1 hour"
  - In group: "Bug-23 Research" (group is in bug-23 project)
  - Tags: auth, urgent, backend, regression

View by project: Shows in "bug-23" project
View by tag "urgent": Shows alongside other urgent items
View by tag "auth": Shows alongside other auth work
View by parent project "tab-manager": Includes it (via bug-23 child)

No rigid hierarchy - same item visible in multiple views
```

#### Operations

**Open project:**
```javascript
function openProject(projectId, options = {}) {
  const project = projects[projectId];
  const items = [];

  // 1. Open all groups in this project
  items.push(...project.members.groups);

  // 2. Open all individual links
  items.push(...project.members.links);

  // 3. Open all items tagged with project tags
  items.push(...getItemsWithAnyTag(project.members.tags));

  // 4. Optionally include sub-projects
  if (options.includeSubProjects) {
    const children = getChildProjects(projectId);
    children.forEach(child => items.push(...openProject(child.id)));
  }

  openItems(deduplicate(items));
}
```

**Rename project:**
```javascript
function renameProject(projectId, newName) {
  projects[projectId].name = newName;
  // ID stays same, relationships preserved
}
```

**Create sub-project:**
```javascript
function createSubProject(parentId, name) {
  const newProject = {
    id: generateId(),
    name: name,
    parentProject: parentId,  // Links to parent
    members: { groups: [], links: [], tags: [] }
  };
  projects[newProject.id] = newProject;
}
```

#### UI Implications

**Project tree view (optional hierarchy visible):**
```
Projects:
  📦 tab-manager (12 items)
    ├─ 🐛 bug-23 (5 items)
    ├─ ✨ feature-2 (8 items)
    └─ 🔧 refactor-core (3 items)

  📦 personal-research (20 items)
    └─ 📚 react-learning (15 items)

  📦 trip-planning (no sub-projects)
```

**Tag view (flat, cross-cutting):**
```
Tags:
  🔥 urgent (12 items across 3 projects)
  💻 coding (45 items across 5 projects)
  📰 news (8 items across 2 projects)
  🔒 auth (5 items in bug-23 project)
```

**Combined filter:**
```
Show: project "tab-manager" + tag "urgent"
  → Only urgent items within tab-manager project tree
```

#### Why This Works

**Addresses user concerns:**
- ✅ Groups can be part of projects (explicitly listed)
- ✅ Individual links can be part of projects
- ✅ Sub-projects supported (bug-23 under tab-manager)
- ✅ Renaming works (ID ≠ name)
- ✅ Hierarchy is OPTIONAL, not rigid (can have flat projects too)
- ✅ Tags provide cross-cutting flexibility

**Best of both worlds:**
- Structure when you want it (parent/child projects)
- Flexibility when you need it (tags across projects)
- No forced hierarchies (can use flat projects)
- Cross-cutting views (filter by tag across all projects)

#### Open Questions:
1. Can a project have multiple parents? (Probably no - keep it simple)
2. Can you move projects between parents? (Yes, just change parentProject field)
3. Max hierarchy depth? (Maybe 3 levels to prevent over-nesting)
4. Should tags also have optional hierarchy? (Maybe, but simpler to keep tags flat)
5. When you delete a parent, what happens to children? (Orphan them, promote to top-level)

**Status:** Converging on soft hierarchy + flexible tags model

**Key principle:** "Hierarchy for structure, tags for flexibility, neither is required"

---

## Summary of Key Additions (2026-01-24 Session)

### New Features Discussed:
1. **Enhanced LLM tagging** - Pass existing tags + descriptions to AI for consistency
2. **Read/unread tracking** - Manual marking (not automatic on click)
3. **Rich notes/metadata** - Notes, quotes, sources, related links per URL
4. **Research Manager vision** - Evolution from tab manager to knowledge management tool

### Critical Insights:
- **Tags are more flexible than groups** - many-to-many relationships, cross-cutting organization
- **Notes are essential for research** - URLs alone don't capture WHY you saved something
- **Read status solves a real pain point** - "Did I read this Neuron newsletter or just click it?"
- **This could become Delicious + Pocket + OneTab combined** - unified tab + bookmark + reading queue management

### Decision Points:
- **Evolve vs. new project?** Recommended: Evolve with modular architecture
- **Dual-mode vs. unified view?** Recommended: Start dual-mode, merge later
- **AI features?** Start with pattern-based, add LLM opt-in later
- **Conservative vs. ambitious?** Recommended: Hybrid - quick wins first, expand based on usage

**Last Updated:** 2026-01-24
