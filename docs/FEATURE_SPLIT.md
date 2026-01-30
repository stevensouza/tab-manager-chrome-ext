# Feature Split: Tab Manager vs ThoughtBox

**Purpose:** Clarify which features belong in Tab Manager (current project) vs ThoughtBox (future knowledge management project)

**Last Updated:** 2026-01-28

---

## 📦 Tab Manager (Current Project)

**Mission:** Lightweight tab management for active browsing sessions

**Philosophy:**
- Manage what's currently open NOW
- Quick operations (close, group, filter, find duplicates)
- Recently closed tabs (last 25)
- No permanent storage beyond recent sessions
- Use chrome.storage.local (5MB limit is fine)

### Features That Belong Here:

**✅ Already Implemented:**
- Tab groups (Chrome native integration)
- Search & filtering
- Duplicate detection
- Recently closed tabs (v2.2)
- Visit counts from history
- Sort modes (group-recent, visit count, etc.)

**📋 Future Additions (Stay in Tab Manager):**
1. **Session/Workspace Management** (Feature #1)
   - Save/restore current tab state
   - Quick-switch between work contexts
   - Use chrome.sessions API + chrome.storage.local

2. **Tab Suspend/Memory Management** (Feature #2)
   - Auto-suspend inactive tabs (chrome.tabs.discard)
   - Visual indicators for suspended state
   - Memory saving estimates

3. **Tab Aging & Cleanup Suggestions** (Feature #4)
   - Badge showing age (14d, 30d, etc.)
   - Suggest cleanup for old tabs
   - Already have lastAccessed data

4. **Bulk Actions & Multi-Select** (Feature #5)
   - Select multiple tabs
   - Bulk close, group, suspend, archive

5. **Smart Auto-Group Suggestions** (Feature #7)
   - "You have 8 GitHub tabs - create group?"
   - Pattern detection (same domain, opened together)

6. **Reading Queue Mode** (Feature #8)
   - Mark tabs "to read" (star icon)
   - Separate section like Recently Closed
   - "Mark as read" → auto-archive

7. **Export/Share** (Feature #9)
   - Export tabs to markdown
   - Backup tab state to JSON
   - Share research with colleagues

**Why these stay in Tab Manager:**
- Work with currently open tabs
- No permanent storage needs beyond chrome.storage.local
- Quick, lightweight operations
- Enhance current tab management workflow

---

## 🧠 ThoughtBox (Future Project)

**Mission:** Personal knowledge management system for research & learning

**Philosophy:**
- Permanent storage of knowledge (IndexedDB)
- Organize saved links, not just active tabs
- Rich metadata (notes, highlights, tags, projects)
- AI-assisted organization
- Search across saved knowledge base

### Features That Belong Here:

**Core ThoughtBox Features (From FEATURE_IDEAS.md):**

1. **Extended Archive with Full-Text Search** (Feature #3)
   - Unlimited storage via IndexedDB
   - Full metadata: URL, title, favicon, group, close date, notes
   - Search across all saved links (not just active tabs)
   - Restore with original group context
   - **Why ThoughtBox:** Needs IndexedDB, permanent storage

2. **Tab Notes & Context** (Feature #6)
   - Rich text notes per URL (markdown support)
   - Store context: "Why did I save this?"
   - Search within notes
   - **Why ThoughtBox:** Permanent metadata, knowledge capture

3. **Tag System with Metadata** (Feature #10) ⭐ **CORE THOUGHTBOX FEATURE**
   - Multi-dimensional organization beyond groups
   - Tags with descriptions, colors, auto-rules, icons
   - Manual + AI-generated tags
   - Tag hierarchies (DAG structure)
   - Wildcard search (tab-manager.bug??.auth)
   - **Why ThoughtBox:** Complex data model, needs IndexedDB, permanent organization

4. **Read/Unread Status Tracking** (Feature #11)
   - Manual marking (not automatic on click)
   - Visual indicators for unread items
   - Filter: "Show only unread"
   - Reading progress tracking
   - **Why ThoughtBox:** Long-term reading workflow, permanent status

5. **Enhanced Notes & Link Metadata** (Feature #12) ⭐ **CRITICAL**
   - Rich text notes with markdown
   - Key quotes, excerpts
   - Why saved, source, related links
   - Date added, last viewed, view count
   - **Why ThoughtBox:** Foundation for knowledge management

6. **Tag Hierarchies / Tag DAG** (Q2 from FEATURE_IDEAS.md)
   - Tags can have parent tags (multiple parents OK)
   - Directed graph: tab-manager → bug23 → auth
   - Appears in multiple tree paths
   - Wildcard search: `tab-manager.*.auth`, `bug??.backend`
   - **Why ThoughtBox:** Advanced organizational structure

7. **Projects vs Tags** (Q1 from FEATURE_IDEAS.md)
   - Projects as containers with soft hierarchy
   - Project members: groups, links, tags
   - Sub-projects (bug-23 under tab-manager)
   - Rename support (stable IDs)
   - **Why ThoughtBox:** Permanent project organization

8. **Research Manager Vision** (Section from FEATURE_IDEAS.md)
   - Active tabs + saved bookmarks + reading queue
   - Unified knowledge management
   - Full-text search across everything
   - AI summaries, smart collections
   - Export/import to Obsidian, Notion
   - **Why ThoughtBox:** This IS ThoughtBox

**Additional ThoughtBox Features:**
- Highlights/excerpts from pages (Kindle-style)
- Page snapshots (screenshots, HTML archives)
- AI tagging with existing tag awareness
- Related link discovery
- Reading analytics
- Link relationships (graph view)
- Wiki-style note linking

**Why these belong in ThoughtBox:**
- Permanent storage (thousands of links, not just active tabs)
- Complex data models (tags, projects, metadata)
- Large data (screenshots, full-text search indexes)
- Knowledge management focus (research, learning, recall)

---

## 🤔 Borderline Features (Could Go Either Way)

### 1. Basic Tab Notes (Feature #6 - Simple Version)
- **Tab Manager version:** Simple text field per tab, stored in chrome.storage.local
- **ThoughtBox version:** Rich metadata, markdown, permanent storage

**Decision:** Start in Tab Manager (simple), migrate to ThoughtBox (rich)

### 2. Read/Unread Tracking (Feature #11 - Basic Version)
- **Tab Manager version:** Manual toggle for active tabs only, temporary
- **ThoughtBox version:** Persistent across sessions, reading analytics

**Decision:** Start in ThoughtBox (permanent workflow tool)

### 3. Export/Share (Feature #9)
- **Tab Manager version:** Export active tabs to markdown/JSON
- **ThoughtBox version:** Export projects, tags, notes, full knowledge base

**Decision:** Both projects (different scopes)

---

## 📊 Summary Table

| Feature | Tab Manager | ThoughtBox | Reason |
|---------|-------------|------------|--------|
| Session management | ✅ | ❌ | Temporary workspaces |
| Tab suspend | ✅ | ❌ | Active tab performance |
| Tab aging badges | ✅ | ❌ | Cleanup active tabs |
| Bulk actions | ✅ | ✅ | Both need multi-select |
| Auto-group suggestions | ✅ | ❌ | Active tab organization |
| Reading queue (simple) | ✅ | ❌ | Mark active tabs to read |
| Export active tabs | ✅ | ❌ | Current session backup |
| **Extended archive** | ❌ | ✅ | **Needs IndexedDB** |
| **Tab notes (simple)** | Maybe | ✅ | **Permanent metadata** |
| **Tag system** | ❌ | ✅ | **Complex data model** |
| **Read/unread status** | ❌ | ✅ | **Permanent workflow** |
| **Rich metadata** | ❌ | ✅ | **Knowledge capture** |
| **Tag hierarchies** | ❌ | ✅ | **Advanced organization** |
| **Projects** | ❌ | ✅ | **Permanent containers** |
| **Highlights/excerpts** | ❌ | ✅ | **Content extraction** |
| **Page snapshots** | ❌ | ✅ | **Binary data storage** |
| **AI tagging** | ❌ | ✅ | **Knowledge management** |
| **Full-text search** | ❌ | ✅ | **Search saved knowledge** |
| **Export knowledge base** | ❌ | ✅ | **Data portability** |

---

## 🎯 Migration Path

**Phase 1: Tab Manager Stays Lightweight**
- Keep current features + quick wins (suspend, aging, bulk actions)
- No IndexedDB, no permanent storage
- Focus: Active tab management excellence

**Phase 2: ThoughtBox Starts as Fork**
- Copy Tab Manager architecture
- Add IndexedDB layer
- Build bookmark management (Phase 1)
- Add manual tagging (Phase 2)

**Phase 3: ThoughtBox Grows**
- Add all knowledge management features
- Integrate with Tab Manager (optional)
- Example: "Save this tab to ThoughtBox" button in Tab Manager

**Phase 4: Choose Your Tool**
- **Light user:** Use Tab Manager (manage active tabs)
- **Power user:** Use ThoughtBox (research + knowledge management)
- **Both:** Tab Manager for daily work, ThoughtBox for long-term knowledge

---

## 🔑 Key Principle

**Tab Manager = Ephemeral (current session, temporary)**
- "What's open right now?"
- "Close these duplicates"
- "Suspend old tabs"
- "Save this session for later"

**ThoughtBox = Permanent (knowledge base, long-term)**
- "Save this for my research"
- "Tag this as coding + AI + reference"
- "Search my saved knowledge"
- "What did I learn about React hooks last month?"

---

## 📝 Next Steps

1. **Freeze Tab Manager scope** - Document which features stay here
2. **Extract ThoughtBox requirements** - Pull relevant features from FEATURE_IDEAS.md
3. **Update THOUGHTBOX_REQUIREMENTS.md** - Consolidate tag hierarchies, projects, etc.
4. **Clean up FEATURE_IDEAS.md** - Mark which features moved to ThoughtBox

**Last Updated:** 2026-01-28
