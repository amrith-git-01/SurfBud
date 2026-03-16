# SurfBud — Download Configuration UI Spec
**Version 1.0 · Phase 1 · March 2026**

---

## 1. Overview

The Download Configuration page lives at `/downloads/configure` — a sub-page of the Downloads section. It is accessible via a clickable status tag on the main Downloads page header.

### 1.1 Navigation

| Property | Value |
|---|---|
| Route | `/downloads/configure` |
| Entry point | `⚙ Configure` button — top right of Downloads page header |
| Back navigation | `← Back to Downloads` link at page top |
| Nav highlight | Downloads nav item stays active (sub-page, not top-level) |

---

### 1.2 Configure Button — Main Downloads Page

A `⚙ Configure` button sits at the top right of the Downloads page, on the same row as the page title. This is the sole entry point into `/downloads/configure`.

```
Downloads                          [⚙ Configure]
Track and manage your downloads.
● Tracking active
```

| Property | Value |
|---|---|
| Placement | Same row as Downloads title, pushed to the right (`justify-between`) |
| Style | `.btn-secondary` — teal border, white bg |
| Icon | `⚙` or `Settings` icon from lucide-react |
| Click | Navigates to `/downloads/configure` |

---

### 1.3 Status Tag — Read-only Indicator

A non-clickable status tag sits below the Downloads page title and subtitle. Shows current tracking state only — not interactive.

| State | Appearance |
|---|---|
| Tracking ON | `● Tracking active` — green dot, `--color-success-light` bg |
| Tracking OFF | `○ Tracking paused` — grey dot, `#f1f5f9` bg |

```
Downloads                          [⚙ Configure]
Track and manage your downloads.
● Tracking active                  ← read-only, not clickable
```

**Reads from:** `useDownloadSettings()` React Query hook — same data already fetched for the Downloads page.

---

### 1.3 Save Behaviour

Every change saves instantly via PATCH — no Save button anywhere on the page. A small `Saved ✓` toast appears bottom-right and fades after 1.5 seconds.

---

## 2. Page Structure

Five layers stacked vertically. Layer 2 dims when Auto-remove is OFF.

```
← Back to Downloads

Tracking Configuration
Manage how SurfBud tracks and handles your downloads.

┌─ Layer 1 ─┐  Master Toggles
┌─ Layer 2 ─┐  Auto Remove Behavior        ← dimmed when auto-remove OFF
┌─ Layer 3 ─┐  Domain Rules
┌─ Layer 4 ─┐  File Category Rules
┌─ Layer 5 ─┐  Download Routing
```

---

## 3. Layer 1 — Master Toggles

Two toggles side by side inside a single glass card. First and most prominent section on the page.

### 3.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Download Tracking              Auto-remove Duplicates       │
│  Track and record all files     Auto-delete duplicate files  │
│  [●  ON ]                       [○  OFF]                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Card type: `.card-metric-glass`
- Layout: Two equal columns side by side — `display: grid; grid-template-columns: 1fr 1fr`
- Each column: heading + toggle on the same row, description text below

---

### 3.2 Toggle 1 — Download Tracking

| Property | Value |
|---|---|
| Label | Download Tracking |
| Description | Track and record all downloaded files |
| Default | ON |
| OFF effect | Extension ignores all download events — no records created |
| OFF warning | Inline text below toggle: `"SurfBud is not recording any downloads"` |

---

### 3.3 Toggle 2 — Auto-remove Duplicates

| Property | Value |
|---|---|
| Label | Auto-remove Duplicates |
| Description | Automatically delete duplicate files from your disk |
| Default | OFF |
| Dependency | Disabled + `opacity: 0.4` when Tracking is OFF |
| Hover tooltip | `"Enable Download Tracking first"` — shown on dimmed column |
| ON transition | Layer 2 animates from `opacity: 0.4` to `1.0` — `200ms ease-out` |

---

## 4. Layer 2 — Auto Remove Behavior

Controls WHEN duplicates are removed. Entire section dims to `opacity: 0.4` and becomes non-interactive when Auto-remove is OFF.

### 4.1 Layout

```
┌─────────────────────────────────────────────────────┐
│  AUTO REMOVE BEHAVIOR                               │
│  When should duplicates be removed?                 │
│                                                     │
│  ○ Remove Immediately                               │
│  ● Grace Period    [15 mins  ▼]                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 4.2 Options

| Option | Behaviour |
|---|---|
| Remove Immediately | File removed as soon as duplicate is detected. No delay. API signals extension immediately. |
| Grace Period | File removed after selected delay. BullMQ manages the timer on the API side. |

---

### 4.3 Grace Period Dropdown

| Property | Value |
|---|---|
| Options | 15 minutes / 30 minutes / 1 hour |
| Default | 15 minutes |
| Visibility | Dropdown only shown when Grace Period radio is selected |

---

## 5. Layer 3 — Domain Rules

Two-column layout. Left column has the add form and active rules list. Right column shows domains from download history.

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  LEFT COLUMN                         RIGHT COLUMN                   │
│  ──────────────────────────────      ─────────────────────────────  │
│                                                                     │
│  [Domain field] [Rule ▼] [Add]       DOMAINS FROM YOUR DOWNLOADS    │
│                                                                     │
│  ─────────────────────────────       www.examplefile.com            │
│                                      9 total · 3 new · 6 dup  [+]  │
│  ACTIVE RULES                        ─────────────────────────────  │
│                                      drive.google.com               │
│  drive.google.com                    4 total · 4 new · 0 dup  [+]  │
│  Never auto-remove  [Edit] [Del]     ─────────────────────────────  │
│  ─────────────────────────────       work-intranet.com              │
│  work-intranet.com                   2 total · 1 new · 1 dup  [+]  │
│  Dont track         [Edit] [Del]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Add Rule Row — Single Row, Three Elements

```
[www.example.com          ]  [Rule          ▼]  [Add Rule]
```

| Element | Behaviour |
|---|---|
| Domain field | Text input — manual typing or paste. Auto-strips to hostname. |
| Rule dropdown | Two options: `Dont Track` / `Never Auto-remove` |
| Add button | Disabled until both domain and rule are filled |

---

### 5.3 Rule Options

| Option | Technical behaviour |
|---|---|
| Dont Track | Extension completely ignores all downloads from this domain. No records created. |
| Never Auto-remove | Downloads tracked and duplicates detected — files are never deleted from this domain. |

---

### 5.4 Domain Validation

| Case | Behaviour |
|---|---|
| Full URL pasted | Auto-strip to hostname: `https://www.google.com/search?q=test` → `www.google.com` |
| Invalid hostname | Inline error: `"Please enter a valid domain"` |
| Duplicate domain | Inline error: `"A rule for this domain already exists"` + highlight existing rule |

---

### 5.5 Right Column — Discovered Domains

Populated from existing Download records for this user.

| Property | Value |
|---|---|
| Each row shows | Domain · total count · new count · dup count · [+] button |
| [+] click | Pre-fills the domain field in the left add form |
| Sort order | By total download count descending |
| Scroll | Right column scrolls independently |
| Empty state | `"No downloads recorded yet. Start downloading to see domains here."` |

---

### 5.6 Active Rules List

| Action | Behaviour |
|---|---|
| Edit | Opens domain back into the add form pre-filled |
| Delete | Removes rule instantly. Domain returns to default behavior. |
| Empty state | `"No rules added yet. Add a domain rule above."` |

---

## 6. Layer 4 — File Category Rules

Three drag-and-drop buckets side by side. Users drag category cards between buckets to configure per-category behavior.

**Library:** `@dnd-kit/core`

---

### 6.1 The Three Buckets

| Bucket | Label | Description |
|---|---|---|
| 1 | Track and Remove | Default — track downloads and auto-remove duplicates per global settings |
| 2 | Dont Track | Completely ignore downloads of this category |
| 3 | Never Auto-remove | Track and detect duplicates but never delete files of this category |

---

### 6.2 Default State

All 9 categories start in Bucket 1. Categories with no explicit rule are always treated as Bucket 1.

---

### 6.3 Category Cards

Each draggable card shows:

```
┌─────────────────────────┐
│ 🎥  Video               │
│                         │
│ 342 files               │
│ 48 new · 294 dup        │
│ 103.5 GB                │
└─────────────────────────┘
```

---

### 6.4 Categories

| Category | Icon |
|---|---|
| Document | 📄 |
| Video | 🎥 |
| Audio | 🎵 |
| Archive | 🗜 |
| Code | 💻 |
| Image | 🖼 |
| Text | 📝 |
| Executable | ⚙ |
| Other | 📦 |

---

### 6.5 Drag and Drop Behaviour

| Interaction | Behaviour |
|---|---|
| Drag start | Card lifts — `translateY(-4px)` + shadow increase. Source shows empty slot. |
| Hover target | Target bucket highlights with teal border — `border-color: var(--color-primary)` |
| Drop | Card snaps in. Rule saved instantly via `POST` or `DELETE`. |
| Drag to Bucket 1 | Returns category to default — existing rule document deleted. |
| Animation | `transform` + `opacity` only — `200ms ease-out` |

---

### 6.6 API calls on drop

```
Card moved to Bucket 2 or 3  →  POST /downloads/settings/rules/categories
Card moved back to Bucket 1  →  DELETE /downloads/settings/rules/categories/:id
```

---

### 6.7 Smart Defaults — First Time

On first use, show a suggestion banner above the buckets:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 💡 Suggested: Move Executable and Video to "Never Auto-remove".      │
│    These file types are rarely accidental duplicates.                │
│                              [Apply Suggestions]  [Dismiss]          │
└──────────────────────────────────────────────────────────────────────┘
```

Never shown again after user acts on it.

---

## 7. Layer 5 — Download Routing

A node graph interface for mapping file categories to download subfolders. Left side shows file categories as fixed nodes. Right side shows user-created folder nodes. Users draw connection lines between them to create mappings.

**Library:** `reactflow`

---

### 7.1 Master Toggle

```
Auto-route Downloads                          [○ OFF]
Automatically sort files into subfolders
inside your Downloads directory
```

| State | Behaviour |
|---|---|
| OFF | Node graph visible but connections cannot be drawn or modified. Nodes dimmed slightly. |
| ON | Full interaction enabled. |

---

### 7.2 Layout

```
LEFT SIDE                                        RIGHT SIDE
─────────────────────                            ──────────────────────

┌─────────────────────┐                          ┌──────────────────┐
│ 📄  Document      ──┼──────────────────────────┼── 📁 Documents   │
└─────────────────────┘                          └──────────────────┘

┌─────────────────────┐                          ┌──────────────────┐
│ 🎥  Video         ──┼──────────────────┐       │ 📁 Media         │
└─────────────────────┘                  └───────┼──                │
                                                 │                  │
┌─────────────────────┐                  ┌───────┼──                │
│ 🎵  Audio         ──┼──────────────────┘       └──────────────────┘
└─────────────────────┘

┌─────────────────────┐
│ 💻  Code            │   (unconnected — saves to default Downloads/)
└─────────────────────┘

┌─────────────────────┐                          [+ New Folder]
│ 🖼  Image           │   (unconnected)
└─────────────────────┘
```

---

### 7.3 Category Nodes — Left Side

Fixed nodes, cannot be moved or deleted.

| Property | Value |
|---|---|
| Content | Icon + category name |
| Connector dot | Appears on right edge on hover. Click and drag to start a connection line. |
| First load | Connector dots pulse for 2s. Tooltip: `"Drag to connect to a folder"`. Never shown again after first interaction. |
| Unconnected | Category saves to default Downloads folder — no routing applied. |

---

### 7.4 Folder Nodes — Right Side

User-created nodes. Draggable to reposition within the right column.

```
┌──────────────────────┐
│ 📁 Media             │  ← click name to rename inline
│                      │
│ Video · Audio        │  ← connected category tags
│                      │
│ Downloads/Media/     │  ← path preview (read only)
│                 [🗑] │
└──────────────────────┘
```

| Property | Value |
|---|---|
| Rename | Click folder name → inline text input → Enter to save |
| Delete | Click 🗑 → inline confirmation → deletes folder and disconnects all lines |
| Path preview | Always `Downloads/[folderName]/` — relative path only |

---

### 7.5 Connection Lines

| Property | Value |
|---|---|
| Style | Smooth bezier curve — ReactFlow `type: 'smoothstep'` |
| Color | `--color-primary` `#0891B2` |
| Width | `2px` resting · `3px` on hover |
| Delete | `[×]` button appears at line midpoint on hover. Click to disconnect. |
| Draw animation | Line draws itself on connect — `stroke-dashoffset` · `300ms ease-out` |
| One category → one folder | New connection replaces old automatically |
| Many categories → one folder | Supported — multiple lines can connect to the same folder |

---

### 7.6 Creating a Folder

| Step | Behaviour |
|---|---|
| Click `[+ New Folder]` | New folder card appears on right with inline text input focused |
| Type name + Enter | Folder created via `POST /downloads/settings/routing/folders` |
| Max 10 folders | `[+ New Folder]` button hidden when limit reached |
| At limit message | `"Maximum 10 folders reached. Delete a folder to create a new one."` |

---

### 7.7 Deleting a Folder

Inline confirmation appears on the folder card:

```
Delete "Media"?
Connected categories will be disconnected.
[Delete]  [Cancel]
```

All connection lines to this folder are removed. Connected categories become unrouted.

---

### 7.8 Empty State — No Folders Yet

```
┌──────────────────────────────────────────┐
│                                          │
│  📁  No folders yet                      │
│                                          │
│  Draw a line from any category on the   │
│  left to get started, or create a        │
│  folder first.                           │
│                                          │
│  [+ Create your first folder]            │
│                                          │
└──────────────────────────────────────────┘
```

---

### 7.9 ReactFlow Setup

```tsx
// dashboard/src/components/features/configure/RoutingGraph.tsx

import ReactFlow, { useNodesState, useEdgesState, addEdge } from 'reactflow'
import 'reactflow/dist/style.css'

const nodeTypes = {
  categoryNode: CategoryNode,  // left side — fixed
  folderNode:   FolderNode,    // right side — user created
}

const edgeOptions = {
  type:  'smoothstep',
  style: { stroke: '#0891B2', strokeWidth: 2 },
}
```

---

## 8. Animation Rules

| Element | Animation |
|---|---|
| Layer 2 dim / undim | `opacity 0.4 ↔ 1.0` · `200ms ease-out` |
| Toggle switch | `background-color` + thumb `transform` · `150ms ease-out` |
| Card hover | `translateY(-3px)` + `box-shadow` · `200ms ease-out` |
| Drag card lift | `translateY(-4px)` + shadow increase · `150ms ease-out` |
| Bucket highlight | `border-color` · `150ms ease-out` |
| Card drop snap | `transform` reset · `200ms ease-out` |
| Connection line draw | `stroke-dashoffset` · `300ms ease-out` |
| Folder node create | `opacity 0→1` + `translateY(8px→0)` · `200ms ease-out` |
| Toast appear | `opacity` + `translateY` · `300ms ease-spring` |

> **Rule:** Only animate `transform`, `opacity`, `box-shadow`, `border-color`, `background-color`. Never animate `width`, `height`, `margin`, `padding`, `top`, `left`.

---

## 9. Empty States

| Section | Empty State Message |
|---|---|
| Domain rules — active list | `"No rules added yet. Add a domain rule above."` |
| Domain rules — right column | `"No downloads recorded yet. Start downloading to see domains here."` |
| Routing — no folders | `"No folders yet. Create a folder to start routing your downloads."` |

---

## 10. Component Structure

```
pages/
  DownloadsConfigurePage.tsx         ← page root, orchestrates all layers

components/features/configure/
  MasterToggles.tsx                  ← Layer 1
  AutoRemoveBehavior.tsx             ← Layer 2
  DomainRules.tsx                    ← Layer 3 wrapper
    DomainRuleForm.tsx               ← add/edit row (domain field + dropdown + button)
    DomainRuleList.tsx               ← active rules list
    DiscoveredDomains.tsx            ← right column list
  CategoryRules.tsx                  ← Layer 4 wrapper
    CategoryBucket.tsx               ← single bucket (droppable zone)
    CategoryCard.tsx                 ← draggable card
  DownloadRouting.tsx                ← Layer 5 wrapper + master toggle
    RoutingGraph.tsx                 ← ReactFlow canvas
    CategoryNode.tsx                 ← left side fixed node
    FolderNode.tsx                   ← right side user-created node

hooks/
  useDownloadSettings.ts             ← React Query fetch
  useDomainRules.ts                  ← add / edit / delete mutations
  useCategoryRules.ts                ← set / remove mutations
  useRoutingFolders.ts               ← create / rename / delete / map mutations
```

---

## 11. Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities reactflow
```

| Package | Purpose |
|---|---|
| `@dnd-kit/core` | Drag and drop for Layer 4 category buckets |
| `@dnd-kit/sortable` | Sortable utilities for bucket cards |
| `@dnd-kit/utilities` | Helper transforms for drag animations |
| `reactflow` | Node graph for Layer 5 routing interface |

---

*SurfBud · Download Configuration UI Spec · v1.0 · March 2026*
