## Enhanced Default Sorting (v2.2)

### New Default: Group-Recent Mode

**Behavior:**

- **Groups:** Sorted alphabetically by title (A→Z)
  - Unnamed groups use color name ("blue group", "red group", etc.)
- **Within each group:** Tabs sorted by `lastAccessed` (most recent first = descending)
- **Special positions:**
  - Ungrouped tabs: After all named groups
  - Recently Closed: Always LAST

### Implementation

**Group sorting (renderTabs):**

```javascript
if (currentSortOption === 'group-recent') {
  organized.groups.sort((a, b) => {
    const nameA = a.title || `${a.color} group`;
    const nameB = b.title || `${b.color} group`;
    return nameA.localeCompare(nameB);
  });
}
```

**Tab sorting (sortTabs):**

```javascript
case 'group-recent':
  return sorted.sort((a, b) => {
    const timeA = a.lastAccessed || 0;
    const timeB = b.lastAccessed || 0;
    return timeB - timeA;  // Descending (most recent first)
  });
```

### Why This Is Better

- **Intuitive:** Most recently used tabs at top of each group
- **Organized:** Groups alphabetically for easy navigation
- **Consistent:** Predictable ordering vs. random browser tab order

### Global Sort Disabled

Group-recent mode is designed for **per-group sorting only**.

Global sort checkbox is hidden when:
- `currentSortOption === 'default'` (browser tab order)
- `currentSortOption === 'group-recent'` (NEW)

This prevents user confusion about incompatible modes.

### Dropdown Options

```html
<option value="group-recent">Sort: Groups (A→Z) + Recent First (Default)</option>
<option value="default">Sort: Browser Tab Order</option>
<!-- Other sort options... -->
```

### Backward Compatibility

Users with saved `localStorage.getItem('tabManagerSortOption')` preference:
- If set to 'default': Still uses browser tab order
- If set to other mode: Retains preference
- **New users:** Default to 'group-recent'
