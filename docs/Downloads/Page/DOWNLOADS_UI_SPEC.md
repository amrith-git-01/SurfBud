# SurfBud — Downloads Page UI Specification

> **Version:** 1.0 — March 2026
> **Route:** `/downloads`
> **Layout:** Single scrollable page with distinct sections
> **Design:** All colors, typography, glass effects from `docs/DESIGN_SYSTEM.md`
> **Backend spec:** See `DOWNLOADS_API_SPEC.md` for models, repositories, services, and endpoint contracts

---

## Page Layout Rules

```
Page background     → #F0F9FF (--color-bg-page)
Content wrapper     → max-w-7xl mx-auto px-8 py-8
Section spacing     → mb-12 (48px) between every section
Section label       → font-sans · text-xs · font-medium · uppercase · tracking-widest
                      color #94A3B8 · mb-4
Card gaps           → always gap-4, never margin between cards
Glass effect        → .card-metric-glass on metric cards
                      .chart-glass on chart containers
```

---

## Section 1 — Metric Cards

### Visual Layout
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ TODAY'S      │ │ THIS WEEK    │ │ THIS MONTH   │ │ TOTAL FILES  │ │ STORAGE      │
│ DOWNLOADS    │ │              │ │              │ │              │ │ WASTED       │
│              │ │              │ │              │ │              │ │              │
│      4       │ │     11       │ │     11       │ │     38       │ │   302 KB     │
│              │ │              │ │              │ │ 16 new·22dup │ │              │
│ ↑2 yesterday │ │ ↓16 last wk  │ │ ↓16 last mo  │ │   all time   │ │   all time   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Grid
```
grid grid-cols-5 gap-4
```

### Card Definitions

| # | Label | Value | Sub-line | Time Scope |
|---|-------|-------|----------|------------|
| 1 | TODAY'S DOWNLOADS | download count | ↑/↓ N vs yesterday | Resets at midnight |
| 2 | THIS WEEK | download count | ↑/↓ N vs last week | Monday to now |
| 3 | THIS MONTH | download count | ↑/↓ N vs last month | 1st of month to now |
| 4 | TOTAL FILES | total count | `{N} new · {N} dup` below value | All time |
| 5 | STORAGE WASTED | size in KB/MB/GB | "all time" below value | All time |

### Typography Per Card
```
Section label   → text-xs font-medium uppercase tracking-widest text-[#94A3B8]
Value number    → text-4xl font-bold tabular-nums text-[#0F172A]
                  letter-spacing: -0.025em · min-width: 4ch (prevents count-up shift)
Delta line      → text-xs font-medium
                  Positive (↑) → text-[#16A34A]
                  Negative (↓) → text-[#DC2626]
Sub-text        → text-xs text-[#94A3B8] mt-1
```

### Delta Rules
```
Cards 1, 2, 3  → show delta arrow + comparison text (↑2 vs yesterday)
Card 4         → NO delta · show "{newCount} new · {dupCount} dup" below number
Card 5         → NO delta · show "all time" label below number
```

### Data Source
```
UserDownloadMetrics document (pre-materialized — O(1) read):
  Card 1 → todayCount
  Card 2 → weekCount
  Card 3 → monthCount
  Card 4 → totalNew + totalDuplicates (sum), totalNew, totalDuplicates
  Card 5 → duplicateSize (bytes → formatted KB/MB/GB)
```

---

## Section 2 — Download Activity Chart

### Visual Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ DOWNLOAD ACTIVITY                          [Last 7 days  ▾]      │
│                                                                   │
│  12 |                    .-.                                      │
│   9 |                   /   \                                     │
│   6 |              .--./     \.--,                               │
│   3 |         .--./                \                             │
│   0 |---------'                     '----                        │
│     Feb 28   Mar 1   Mar 2   Mar 3   Mar 4   Mar 5   Mar 6      │
│                                                                   │
│     ● Total Downloads    ● New Files    ● Duplicates             │
└──────────────────────────────────────────────────────────────────┘
```

### Container
```
.chart-glass — full width, height 280px
```

### Chart Config
```
Type                → ComposedChart (Recharts) — combination of Bar + Line
ResponsiveContainer → width="100%" height={280}

Series 1 — Total Downloads (Bar):
  type      → Bar
  dataKey   → "total"
  fill      → #0891B2
  fillOpacity → 0.85
  radius    → [4, 4, 0, 0]  (rounded top corners)
  barSize   → 18
  animationDuration={800}

Series 2 — New Files (Line):
  type      → Line
  dataKey   → "newFiles"
  stroke    → #16A34A
  strokeWidth → 2
  dot       → false
  activeDot → {{ r: 4, strokeWidth: 0, fill: '#16A34A' }}
  animationDuration={800}
  animationEasing="ease-out"

Series 3 — Duplicates (Line):
  type      → Line
  dataKey   → "duplicates"
  stroke    → #EA580C
  strokeWidth → 2
  dot       → false
  activeDot → {{ r: 4, strokeWidth: 0, fill: '#EA580C' }}
  animationDuration={800}
  animationEasing="ease-out"

CartesianGrid   → stroke #E0F2FE · strokeDasharray="3 3" · vertical={false}
XAxis           → dataKey="date" · fontSize 11 · fill #94A3B8 · no tick/axis line
YAxis           → fontSize 11 · fill #94A3B8 · no tick/axis line
```

### Tooltip
```
Custom tooltip component — NOT Recharts default

Trigger     → hover on any data point or bar
Container:
  bg-white · border 1px solid #E0F2FE · borderRadius 8 · px-3 py-2.5
  boxShadow: 0 8px 25px rgba(8,145,178,0.10)
  font-sans · fontSize 12

Header:
  Date label → text-xs font-semibold text-[#1E293B] mb-2
               e.g. "Mar 2" or "Mon, Mar 2"

Three rows (always all three, even if value is 0):

  Row 1 — Total:
    ■ colored square #0891B2 (w-2.5 h-2.5 rounded-sm)
    "Total"       → text-xs text-[#64748B] flex-1
    "{N}"         → text-xs font-semibold text-[#0F172A] tabular-nums ml-4

  Row 2 — New Files:
    ● colored dot  #16A34A (w-2 h-2 rounded-full)
    "New Files"   → text-xs text-[#64748B] flex-1
    "{N}"         → text-xs font-semibold text-[#16A34A] tabular-nums ml-4

  Row 3 — Duplicates:
    ● colored dot  #EA580C (w-2 h-2 rounded-full)
    "Duplicates"  → text-xs text-[#64748B] flex-1
    "{N}"         → text-xs font-semibold text-[#EA580C] tabular-nums ml-4

Row gap: space-y-1.5
Total value color: #0F172A (neutral — it's a sum)
New value color:   #16A34A (green — reinforces positive)
Dup value color:   #EA580C (orange — reinforces caution)
```

### Period Selector
```
Position  → top-right inside chart container header row
Options   → Last 7 days · Last 15 days · Last 30 days
Style     → dropdown, border #E0F2FE, active option teal text
On change → refetches /api/downloads/trend?period=N
```

### Legend
```
Position    → below chart, centered, flex row gap-6
Built manually — NOT Recharts Legend component

Three items:
  ■ Total Downloads  → square indicator #0891B2 (w-3 h-3 rounded-sm) + label
  ● New Files        → circle indicator #16A34A (w-2.5 h-2.5 rounded-full) + label
  ● Duplicates       → circle indicator #EA580C (w-2.5 h-2.5 rounded-full) + label

Square for Total (matches bar shape)
Circles for New + Duplicates (matches line series)
Label: text-xs text-[#64748B]
```

### Data Source
```
GET /api/downloads/trend?period=7|15|30
Returns: UserDownloadMetrics.trend sliced to period
Each bucket: { date: 'YYYY-MM-DD', total, newFiles, duplicates }
```

---

## Section 3 — Health Bars

### Visual Layout
```
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ DOWNLOADS HEALTH                     │  │ STORAGE EFFICIENCY                   │
│ New vs duplicate distribution        │  │ Useful vs wasted storage             │
│                          ● New 42.1% │  │                         ● Used 100%  │
│                          ● Dup 57.9% │  │                         ● Wasted 0%  │
│  [████████████████░░░░░░░░░░░░░░░░]  │  │  [████████████████████████░░░░░░░░]  │
│                                      │  │                                      │
│  [Total: 38] [New: 16]  [Dup: 22]   │  │  [Total: 1GB] [Used: 1GB] [0 KB]    │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

### Grid
```
grid grid-cols-2 gap-4
```

### Bar Implementation
```
Custom CSS segmented bar — NOT a Recharts component

Outer track:
  w-full h-3 rounded-full overflow-hidden bg-[#F0F9FF]
  display: flex

Green segment (new / used):
  height: 100%
  width: {percent}%
  background: #16A34A
  transition: width 800ms cubic-bezier(0.0, 0.0, 0.2, 1)

Orange segment (duplicate / wasted):
  height: 100%
  width: {percent}%
  background: #EA580C
  transition: width 800ms cubic-bezier(0.0, 0.0, 0.2, 1)
```

### Stat Pills Below Bar
```
Three pills in a row:
  bg-[#F0F9FF] rounded-lg px-3 py-1
  border border-[#E0F2FE]
  text-xs font-medium text-[#334155] tabular-nums
```

### Data Source
```
GET /api/downloads/stats → UserDownloadMetrics
  Downloads Health    → totalNew, totalDuplicates
  Storage Efficiency  → totalSize, duplicateSize
```

---

## Section 4 — Recent Downloads Feed

### Purpose
```
Glanceable activity snapshot — shows the 10 most recent downloads, fixed.
No filters. No pagination. No clutter.
For browsing and filtering, use the File Detail Drawer (opened via metric cards).
```

### Visual Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ RECENT DOWNLOADS                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ 📄  dummy.pdf         12.95 KB  •  www.w3.org    •  10:14 AM   [DUP]  │
├────────────────────────────────────────────────────────────────────────┤
│ 📄  file-example.pdf  1.01 MB   •  filesamples   •  3d ago     [NEW]  │
├────────────────────────────────────────────────────────────────────────┤
│ 🎵  song.mp3          4.2 MB    •  soundcloud    •  5d ago     [NEW]  │
├────────────────────────────────────────────────────────────────────────┤
│                    [ View all downloads → ]                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Container
```
.chart-glass — full width
```

### Row Layout
```
Each row:
  py-3 px-4
  border-bottom: 1px solid #E0F2FE (except last)
  hover: bg-[#F8FFFE] transition-colors duration-150
  cursor-pointer → opens File Detail Drawer in Detail Mode for that file

Left (flex row gap-3 items-center):
  File icon     → category icon, w-8 h-8 (see icon map below)
  Filename      → font-mono text-sm font-medium text-[#1E293B] truncate max-w-xs
  File size     → text-xs text-[#94A3B8] tabular-nums (formatted)

Right (flex row gap-4 items-center ml-auto):
  Source domain → text-xs text-[#64748B] font-mono
  Time          → text-xs text-[#94A3B8] (relative: "10:14 AM" today, "3d ago" older)
  Status badge  → NEW or DUP
  Chevron [›]   → w-4 h-4 text-[#94A3B8]
```

### Interactions
```
Click any row          → opens drawer in Detail Mode for that specific file
Click "View all" btn   → opens drawer in List Mode, period pre-set to All Time
```

### "View all downloads" Button
```
Position  → bottom of section, centered, py-3
Style     → ghost button variant
            text-sm font-medium text-[#0891B2]
            hover: bg-[#F0F9FF] transition-colors
            "View all downloads →"
```

### Status Badges
```
NEW → bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-2 py-0.5 rounded-md
DUP → bg-[#FEF3C7] text-[#D97706] text-xs font-semibold px-2 py-0.5 rounded-md
```

### File Type Icon Map
```
PDF / Word / Spreadsheet / Presentation → document icon (color: #2563EB)
Image                                   → image icon    (color: #7C3AED)
Video                                   → video icon    (color: #E11D48)
Audio                                   → music icon    (color: #059669)
Archive / ZIP                           → archive icon  (color: #EA580C)
Code                                    → code icon     (color: #0891B2)
Other                                   → file icon     (color: #94A3B8)
```

### Data Source
```
GET /api/downloads/recent
Returns: last 10 DownloadEvents sorted createdAt desc (fixed 10, no params)
No pagination · no filters · fixed snapshot
Events populated with File fields: fileCategory, fileExtension, mimeType
```

---

## Section 5 — Duplicate Groups

### Visual Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│ DUPLICATE FILES                                                         │
│ Files you've downloaded more than once                                  │
├────────────────────────────────────────────────────────────────────────┤
│ 📄  dummy.pdf      ×21 downloads    18 duplicates    247 KB wasted  [›]│
├────────────────────────────────────────────────────────────────────────┤
│ 📄  report.pdf     ×5 downloads     4 duplicates     51 KB wasted   [›]│
├────────────────────────────────────────────────────────────────────────┤
│ 📦  archive.zip    ×3 downloads     2 duplicates     2.1 MB wasted  [›]│
└────────────────────────────────────────────────────────────────────────┘
```

### Container
```
.chart-glass — full width
```

### Row Layout
```
Each row:
  py-3 px-4
  border-bottom: 1px solid #E0F2FE
  hover: bg-[#F8FFFE]
  cursor-pointer → opens drawer on TIMELINE tab

Left:
  File icon   → same icon system as Section 4
  Filename    → font-mono text-sm font-medium text-[#1E293B]

Right (flex row gap-6):
  ×{total} downloads  → text-xs text-[#64748B] tabular-nums
  {dup} duplicates    → text-xs text-[#D97706] font-medium tabular-nums
  {size} wasted       → text-xs text-[#DC2626] font-medium tabular-nums
  Chevron [›]         → text-[#94A3B8]
```

### Empty State
```
Centered, inside .chart-glass container:
  "No duplicates found"                     text-sm font-medium text-[#334155]
  "Great job keeping your downloads clean!" text-xs text-[#94A3B8] mt-1
```

### Data Source
```
GET /api/downloads/duplicates
Returns: { filename, dupCount, totalSize }[]
Sorted by dupCount descending · limit 20
```

---

## Section 6 — Analytics

### Visual Layout
```
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ FILE CATEGORIES          [≡] [◉] [▮] │  │ DOWNLOAD SOURCES         [≡] [▮]    │
│                                      │  │                                      │
│  (content changes per selected view) │  │  (content changes per selected view) │
│                                      │  │                                      │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

### Grid
```
grid grid-cols-2 gap-4
Both panels: .chart-glass
```

### View Switcher
```
FILE CATEGORIES — 3 views:
  [≡] List   [◉] Donut   [▮] Bar
  Active: bg-[#0891B2] text-white rounded-md p-1
  Inactive: text-[#94A3B8] p-1

DOWNLOAD SOURCES — 2 views:
  [≡] List   [▮] Bar
```

### FILE CATEGORIES — List View
```
Each row:
  Category name   → text-sm font-medium text-[#334155]
  Progress bar    → teal #0891B2, width relative to max count, h-1.5 rounded-full
  Count + size    → text-xs text-[#94A3B8] tabular-nums right-aligned
                    "{N} files · {size}"
```

### FILE CATEGORIES — Donut View
```
Recharts PieChart:
  innerRadius={60} outerRadius={90} paddingAngle={3}
  Each slice: color from design accent palette
  Center label: total file count (text-2xl font-bold tabular-nums)
  Custom legend below: dot + name + percentage
```

### FILE CATEGORIES — Bar View
```
Recharts BarChart:
  layout="vertical"
  XAxis type="number" · YAxis type="category" dataKey="name"
  Bar fill #0891B2 · radius={[0, 4, 4, 0]}
  animationDuration={800}
```

### DOWNLOAD SOURCES — List View
```
Each row:
  Domain name     → text-sm font-medium text-[#334155] font-mono
  Progress bar    → varied colors per domain, h-1.5 rounded-full
  Stats           → "{totalCount} downloads · {newCount} new · {dupCount} dup · {size}"
                    text-xs text-[#94A3B8] tabular-nums
```

### DOWNLOAD SOURCES — Bar View
```
Recharts BarChart:
  layout="vertical"
  Grouped bars: New (teal #0891B2) + Duplicate (orange #EA580C) per domain
  animationDuration={800}
```

### Data Source
```
GET /api/downloads/categories → CategoryStats collection
  Returns: { category, totalCount, newCount, dupCount, totalSize, newSize, dupSize }[]
  Map to UI: { name: category, count: totalCount, size: totalSize }

GET /api/downloads/domains    → DomainStats collection
  Returns: { domain, totalCount, newCount, dupCount, totalSize, newSize, dupSize }[]

Both pre-materialized — O(1) reads, no aggregation on request
```

---

## File Detail Drawer

### Overview
```
The drawer is a single fixed panel that operates in two modes.
The page behind NEVER shifts or moves — the drawer overlaps it.

Mode 1 — List Mode
  Triggered by: clicking any metric card (Section 1)
  Shows: filtered list of download events, paginated
  Further filterable inside the drawer

Mode 2 — Detail Mode
  Triggered by: clicking any row in Section 4, Section 5,
                OR clicking a row inside the drawer's List Mode
  Shows: DETAILS tab + TIMELINE tab for one specific file
```

### Trigger Points
```
Section 1 — TODAY card      → List Mode, period = today
Section 1 — WEEK card       → List Mode, period = this week
Section 1 — MONTH card      → List Mode, period = this month
Section 1 — TOTAL FILES     → List Mode, period = all time
Section 1 — STORAGE WASTED  → List Mode, period = all time, status = duplicate
Section 4 — any row click   → Detail Mode for that file
Section 5 — any row click   → Detail Mode, opens on TIMELINE tab
Section 4 — "View all" btn  → List Mode, period = all time
```

### Container
```
Overlay:
  Fixed inset-0 · bg-black/20 · backdrop-blur-sm · z-50
  Click outside → closes drawer

Panel:
  Fixed right-0 top-0 · h-full · w-[420px]
  bg-white
  box-shadow: -8px 0 32px rgba(8,145,178,0.12)
  Slide-in:  translateX(100%) → translateX(0)   duration 280ms ease-out
  Slide-out: translateX(0) → translateX(100%)   duration 280ms ease-out
  Panel itself NEVER moves during mode transitions — only inner content moves
```

### Inner Content Navigation
```
Two content panes sit inside the panel side by side (overflow hidden):

  List pane   (default left position)
  Detail pane (default right position, off-screen)

DRILL-DOWN (List → Detail):
  List pane   → translateX(0) → translateX(-100%)   240ms ease-out
  Detail pane → translateX(100%) → translateX(0)    240ms ease-out

BACK (Detail → List):
  Detail pane → translateX(0) → translateX(100%)    240ms ease-out
  List pane   → translateX(-100%) → translateX(0)   240ms ease-out

List restores: same page, same filters, same scroll position on back
```

---

### LIST MODE

#### Header
```
px-6 py-4 · border-b border-[#E0F2FE]
Title:    "{Card Title}"  e.g. "Today's Downloads"
          font-semibold text-[#1E293B]
Sub:      "{N} files found" text-xs text-[#94A3B8]
[✕] close button: top-right, text-[#94A3B8] hover:text-[#334155]
```

#### Filter Bar
```
px-6 py-3 · border-b border-[#E0F2FE]

[🔍 Search by filename...]   full width, debounced 300ms
[Category ▾]  [Status ▾]  [Period ▾]   flex row gap-2 mt-2

Period options:
  Today · This Week · This Month · All Time
  Pre-selected based on which metric card was clicked:
    Today card    → Today      (locked as default, user can change)
    Week card     → This Week
    Month card    → This Month
    Total card    → All Time
    Wasted card   → All Time   (Status also pre-set to Duplicate)

Category: All · Document · Image · Text · Code · Executable · Archive · Audio · Video · Other
  (matches FILE_CATEGORIES from file-utils)
Status:   All · New · Duplicate
```

#### List Rows
```
Scrollable content area between filter bar and pagination

Each row:
  py-3 px-6
  border-bottom: 1px solid #E0F2FE
  hover: bg-[#F8FFFE] transition-colors duration-150
  cursor-pointer → triggers drill-down to Detail Mode

Left:
  File icon     → category icon w-8 h-8
  Filename      → font-mono text-sm font-medium text-[#1E293B] truncate
  File size     → text-xs text-[#94A3B8] tabular-nums

Right:
  Source domain → text-xs text-[#64748B] font-mono
  Time          → text-xs text-[#94A3B8] relative
  Status badge  → NEW or DUP
  Chevron [›]   → text-[#94A3B8]
```

#### Pagination
```
Position  → bottom of drawer, above footer, centered
            sticky bottom-0 bg-white border-t border-[#E0F2FE] py-3
Style     → "Page {n} of {total}" text-sm text-[#64748B]
            [‹] [›] buttons — teal on hover, disabled at bounds
Page size → 10 items per page
```

#### Empty State
```
Centered in scrollable area:
  "No downloads found"      text-sm font-medium text-[#334155]
  "Try adjusting filters"   text-xs text-[#94A3B8]
```

#### Data Source
```
GET /api/downloads/events?page=1&limit=10&period=today&status=&category=&search=

period param:
  today   → createdAt >= start of today (midnight)
  week    → createdAt >= Monday of current week
  month   → createdAt >= 1st of current month
  all     → no date filter (default)
```

---

### DETAIL MODE

#### Header
```
px-6 py-4 · border-b border-[#E0F2FE]

If reached via List Mode drill-down:
  [← {List Title}]  e.g. "← Today's Downloads"
  Back label: text-xs text-[#0891B2] cursor-pointer hover:underline · mb-1
  Filename: font-mono font-semibold text-[#1E293B] truncate

If reached directly (Section 4 or 5 row click):
  No back button
  Filename only + [✕] close
```

#### Tab Switcher
```
[DETAILS]  [TIMELINE]
Active:   border-b-2 border-[#0891B2] text-[#0891B2] font-semibold text-sm
Inactive: text-[#64748B] text-sm
Container: px-6 · border-b border-[#E0F2FE]

Default tab:
  Section 4 click → DETAILS tab
  Section 5 click → TIMELINE tab
  Drawer list click → DETAILS tab
```

#### DETAILS Tab
```
Scrollable · px-6 py-4

2-column grid layout:

  SOURCE URL (full width)
  ──────────────────────────────────────
  SOURCE DOMAIN      │  DOWNLOADED AT
  ──────────────────────────────────────
  FILE SIZE          │  CATEGORY
  ──────────────────────────────────────
  EXTENSION          │  STATUS

Field label:
  text-xs font-medium uppercase tracking-widest text-[#94A3B8] mb-1

Field value:
  text-sm text-[#334155]
  URLs  → font-mono text-xs text-[#0891B2] truncate (full URL in title tooltip)
  Status → StatusBadge component (NEW green / DUP orange)
```

#### TIMELINE Tab
```
Scrollable · px-6 py-4

Label: "DOWNLOAD HISTORY" (section label style)
Sub:   "Every time this file was downloaded" text-xs text-[#94A3B8] mb-4

Vertical timeline:
  Left column: vertical line #E0F2FE connecting dots
  Each dot: w-2.5 h-2.5 rounded-full
    NEW entry → bg-[#16A34A]
    DUP entry → bg-[#D97706]

  Entry content:
    Date + time  → text-sm font-medium text-[#1E293B] tabular-nums
    Domain       → text-xs text-[#64748B] font-mono
    Status badge → NEW or DUP
    Duration     → text-xs text-[#94A3B8] "downloaded in 1.2s"

  Most recent first · Last (oldest) entry labeled "First download"
```

#### Data Source
```
DETAILS  → GET /api/downloads/files/:fileId
TIMELINE → GET /api/downloads/files/:fileId/timeline
           Returns DownloadEvent[] sorted createdAt desc
```

---

## Loading States

```
Metric cards      → MetricCardSkeleton × 5 (.skeleton shimmer class)
Activity chart    → .chart-glass + .skeleton div, height 280px
Health bars       → 2 × .chart-glass with skeleton bar placeholders
Downloads feed    → 5 skeleton rows (icon + text + badge placeholders)
Duplicate groups  → 3 skeleton rows
Analytics panels  → 2 × .chart-glass with skeleton list rows
Drawer content    → skeleton fields matching layout
```

---

## Error States

```
Each section fails independently — never a full page error

Inside failed section container:
  "Could not load {section name}" → text-sm text-[#DC2626]
  [Retry] button → ghost variant, triggers React Query refetch
```

---

## Animation Rules

```
SAFE (GPU composited — use freely):
  transform · opacity · box-shadow · background-color · border-color

NEVER ANIMATE (causes layout reflow):
  width · height · margin · padding · top · left

Exception — health bar segments:
  width transition is safe ONLY because segments are inside
  overflow:hidden track — no surrounding layout is displaced

Drawer: translateX only — 280ms ease-out
Card hover: translateY(-3px) — 200ms ease-out
Row hover: background-color only — 150ms ease-out
Chart draw: animationDuration={800} animationEasing="ease-out"
```

---

## API Summary

```
GET /api/downloads/stats                               → Sections 1 + 3
GET /api/downloads/trend?period=7|15|30                → Section 2 (on-demand aggregation)
GET /api/downloads/recent                              → Section 4 (fixed 10, no params)
GET /api/downloads/events?page=1&limit=10              → Drawer List Mode
  &period=today|week|month|all
  &status=new|duplicate
  &category=PDF|Video|...
  &search=filename
GET /api/downloads/duplicates                          → Section 5
GET /api/downloads/categories                          → Section 6 left (pre-computed)
GET /api/downloads/domains                             → Section 6 right (pre-computed)
GET /api/downloads/files/:id                           → Drawer DETAILS tab
GET /api/downloads/files/:id/timeline                  → Drawer TIMELINE tab
```

---

## Component File Map

```
src/
├── pages/
│   └── DownloadsPage.tsx               ← page shell + section orchestration
├── components/
│   ├── ui/
│   │   ├── MetricCard.tsx              ← Section 1 card + skeleton (clickable)
│   │   ├── StatusBadge.tsx             ← NEW/DUP badge (S4, S5, drawer)
│   │   ├── FileIcon.tsx                ← category icon (S4, S5, drawer)
│   │   └── ProgressBar.tsx             ← segmented bar (S3, S6 list view)
│   ├── charts/
│   │   ├── DownloadTrendChart.tsx      ← Section 2 (ComposedChart)
│   │   ├── CategoryDonutChart.tsx      ← Section 6 donut view
│   │   └── CategoryBarChart.tsx        ← Section 6 bar view
│   ├── features/
│   │   ├── DownloadHealthBar.tsx       ← Section 3 left
│   │   ├── StorageEfficiencyBar.tsx    ← Section 3 right
│   │   ├── DownloadsFeed.tsx           ← Section 4 (snapshot, no filters)
│   │   ├── DuplicateGroups.tsx         ← Section 5
│   │   ├── FileCategories.tsx          ← Section 6 left (all 3 views)
│   │   ├── DownloadSources.tsx         ← Section 6 right (list + bar)
│   │   └── FileDetailDrawer.tsx        ← drawer shell (manages mode + transitions)
│   │       ├── DrawerListMode.tsx      ← list mode: filters + paginated rows
│   │       └── DrawerDetailMode.tsx    ← detail mode: DETAILS + TIMELINE tabs
│   └── layout/
│       └── PageShell.tsx               ← title + content wrapper
└── api/
    ├── downloads.api.ts                ← axios calls for all endpoints
    └── useDownloads.ts                 ← React Query hooks
```

---

## Cross-Reference: Backend

All API endpoints consumed by this page are fully documented in `DOWNLOADS_API_SPEC.md`.

| UI Section | Endpoint | Strategy | Data Source |
|------------|----------|----------|-------------|
| Section 1 — Metric Cards | `GET /api/downloads/stats` | Pre-computed O(1) | `UserDownloadMetrics` |
| Section 2 — Activity Chart | `GET /api/downloads/trend?period=N` | On-demand aggregation | `DownloadEvent` GROUP BY date |
| Section 3 — Health Bars | `GET /api/downloads/stats` | Pre-computed O(1) | `UserDownloadMetrics` (same call as S1) |
| Section 4 — Recent Feed | `GET /api/downloads/recent` | Live indexed query | `DownloadEvent` latest 10 |
| Section 5 — Duplicate Groups | `GET /api/downloads/duplicates` | Live aggregation | `DownloadEvent` GROUP BY filename |
| Section 6 — Categories | `GET /api/downloads/categories` | Pre-computed O(1) | `CategoryStats` collection |
| Section 6 — Domains | `GET /api/downloads/domains` | Pre-computed O(1) | `DomainStats` collection |
| Drawer — Details | `GET /api/downloads/files/:id` | Live | `File` collection |
| Drawer — Timeline | `GET /api/downloads/files/:id/timeline` | Live | `DownloadEvent` by fileId |
| Drawer — List Mode | `GET /api/downloads/events` | Live paginated | `DownloadEvent` filtered |

### Pre-computation Strategy
```
PRE-COMPUTED on every download (O(1) reads):
  Cards (today/week/month/total/wasted) → UserDownloadMetrics
    Period counts use date-string reset triggers (inline) + BullMQ cron (for inactive users)
    todayCount resets when todayDate !== today — computed in user's IANA timezone
    prevTodayCount / prevWeekCount / prevMonthCount snapshotted at reset moment
    Delta shown on cards (e.g. ↑ 5 vs yesterday) = current minus prev field
    prevXxxCount only written on reset — always holds previous period's final total
    'Today' means user's local midnight → midnight, not UTC

  File Categories → CategoryStats collection
    One doc per userId+category, uses FILE_CATEGORIES from file-utils
    Atomic $inc per category — same pattern as DomainStats
    Fields per category: totalCount, newCount, dupCount, totalSize, newSize, dupSize

  Domain breakdown → DomainStats collection
    Separate collection (not embedded array) — one doc per userId+domain
    Atomic $inc per domain — scales cleanly as domain count grows
    Fields per domain: totalCount, newCount, dupCount, newSize, dupSize, totalSize

ON-DEMAND aggregation (fast with indexes):
  Trend chart  → GROUP BY date on DownloadEvent (~5ms with indexes)
  Duplicates   → GROUP BY filename on DownloadEvent (limit 20)

LIVE indexed queries (always real-time):
  Recent feed · drawer list · file detail · timeline
```
