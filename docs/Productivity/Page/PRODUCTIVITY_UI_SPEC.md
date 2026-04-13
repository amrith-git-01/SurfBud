# SurfBud — Productivity Page UI Specification

> **Version:** 1.0 — March 2026
> **Route:** `/productivity`
> **Layout:** Single scrollable page with distinct sections
> **Design:** All colors, typography, glass effects from `docs/DESIGN_SYSTEM.md`
> **Backend spec:** See `PRODUCTIVITY_API_SPEC.md` for models, repositories, services, and endpoint contracts

---

## Page Layout Rules

```
Page background     → #F0F9FF (--color-bg-page)
Content wrapper     → max-w-7xl mx-auto px-8 py-8
Section spacing     → mb-12 (48px) between every section
Section label       → font-sans · text-xs · font-medium · uppercase · tracking-widest
                      color #94A3B8 · mb-4
Card gaps           → always gap-4, never margin between cards
Glass effect        → .card-metric-glass on mode + streak + focus cards
                      .chart-glass on calendar + history containers
```

---

## Reusability From Downloads + Browsing Pages

### Reuse As-Is
| Component | Reused For |
|---|---|
| `MetricCard` | Focus mode stats |
| `MetricCardSkeleton` | Loading states |
| `SectionLabel` | All section headers |
| `.card-metric-glass` | Mode cards, streak cards, focus card |
| `.chart-glass` | Streak calendar container, focus history container |
| `.section-label` | All uppercase section labels |
| `.skeleton` | All loading states |
| `Dropdown` | Duration picker in Focus Mode, days picker in Streak modal |
| `StatusBadge` pattern | PREDEFINED / CUSTOM badges on mode cards |

### New Components Needed
```
ProductivityPage.tsx        ← page root, orchestrates all sections

components/features/productivity/
  TabGroups.tsx             ← Section 1 shell
  ModeCard.tsx              ← single mode card (predefined + custom)
  ModeModal.tsx             ← create + edit modal (same component)
  StreakSection.tsx          ← Section 2 shell
  StreakCard.tsx             ← single streak card with heatmap
  StreakCalendar.tsx         ← GitHub-style heatmap calendar
  StreakModal.tsx            ← create + edit modal
  FocusMode.tsx             ← Section 3 shell + form + history

hooks/
  useTabGroupModes.ts       ← React Query, GET /productivity/modes
  useStreaks.ts             ← React Query, GET /productivity/streaks
  useStreakCalendar.ts      ← React Query, GET /productivity/streaks/:id/calendar
  useFocusSession.ts        ← React Query, active session + history
```

---

## Page Header

```
Productivity
Manage your modes, streaks and focus sessions.
```

No configure button. No global period selector.

---

## Section 1 — Tab Groups

### Section Header
```
TAB GROUPS
Open a set of sites instantly in a new window.    [+ New Mode]
```

`[+ New Mode]` button: `.btn-secondary` — teal border, white bg, pushed to right via `justify-between`.

---

### Mode Cards Grid

```
grid grid-cols-4 gap-4   ← predefined row (always 4)
```

Predefined 4 cards always appear first in a fixed row.
Custom modes appear below with a divider:

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Dev Mode     │ │ Chill Mode   │ │ Study Mode   │ │ Meeting Mode │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

── Custom Modes ────────────────────────────────────────────────────

┌──────────────┐ ┌──────────────┐
│ My Research  │ │ + New Mode   │  ← ghost add card (when < 20 custom)
└──────────────┘ └──────────────┘
```

Custom modes grid: `grid grid-cols-4 gap-4`

---

### ModeCard.tsx

```
.card-metric-glass
border-top: 4px solid {mode.color}   ← color accent strip at top
padding: 20px
min-height: 200px
cursor: default

┌──────────────────────────────┐
│ [Icon 24px in mode.color]    │  ← lucide icon, colored
│                              │
│ Dev Mode           PREDEFINED│  ← name + badge right-aligned
│ 5 tabs                       │  ← tab count, text-xs text-[#94A3B8]
│                              │
│ claude.ai                    │  ← up to 3 URLs shown
│ chatgpt.com                  │     text-xs font-mono text-[#64748B]
│ github.com                   │     strip https:// and www.
│ +2 more                      │  ← if > 3 URLs
│                              │
│ [Activate]  [Edit]           │  ← predefined
│ [Activate]  [Edit] [Delete]  │  ← custom
└──────────────────────────────┘
```

**Badge styles:**
```
PREDEFINED → bg-[#F0F9FF] text-[#0891B2] text-xs font-medium px-2 py-0.5 rounded-md
CUSTOM     → bg-[#F5F3FF] text-[#7C3AED] text-xs font-medium px-2 py-0.5 rounded-md
```

**Button layout:**
```
flex gap-2 mt-auto pt-4
[Activate] → .btn-primary   text-sm
[Edit]     → .btn-ghost     text-sm
[Delete]   → .btn-ghost text-[#DC2626] hover:bg-[#FEE2E2]  text-sm
             NEVER shown on predefined cards
```

**Card hover:**
```
translateY(-3px) + shadow increase · 200ms ease-out
Same pattern as .card-metric-glass hover in design system
```

---

### Activate Behavior (Dashboard — temporary stand-in)

```typescript
// Opens all mode URLs in browser tabs
// Logs activation event to API

async function handleActivate(mode: TabGroupMode) {
  // Log activation
  await ProductivityAPI.activateMode(mode._id)

  // Open all URLs
  mode.urls.forEach((url, index) => {
    if (index === 0) window.open(url, '_blank')
    else window.open(url, '_blank')
  })

  // Show one-time banner
  if (!localStorage.getItem('surfbud-mode-banner-dismissed')) {
    setShowExtensionBanner(true)
  }
}
```

**One-time extension banner** — appears below section header, dismissible:
```
┌──────────────────────────────────────────────────────────────┐
│ ℹ️  Activating from the dashboard opens tabs in your browser. │
│    Install the SurfBud extension for the full experience.    │
│                                               [Got it ✕]    │
└──────────────────────────────────────────────────────────────┘
```

bg `#EFF6FF`, border `#BFDBFE`, text `#1E40AF`
Dismissed state saved to `localStorage` — never shown again.

---

### ModeModal.tsx — Create + Edit (same component)

Opens as a centered modal with backdrop.
`mode` prop — if passed, Edit mode. If null, Create mode.

```
Backdrop: fixed inset-0 bg-black/20 backdrop-blur-sm z-50
Modal:    fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[480px] bg-white rounded-2xl shadow-xl p-6 z-50

┌─────────────────────────────────────────────────┐
│ Edit Dev Mode                           [✕]     │
│ (or "New Mode" for create)                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  NAME                                           │
│  [Dev Mode                              ]       │
│  ← disabled + bg-[#F8FAFC] for predefined      │
│                                                 │
│  COLOR  (hidden for predefined)                 │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐     │
│  │  │ │  │ │  │ │  │ │  │ │  │ │  │ │  │     │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘     │
│  teal violet rose emerald amber blue red grey  │
│                                                 │
│  TABS                                           │
│  ┌─────────────────────────────────────────┐   │
│  │ ⠿  claude.ai                       [✕] │   │ ← drag handle future
│  │ ⠿  chatgpt.com                     [✕] │   │
│  │ ⠿  gemini.google.com               [✕] │   │
│  │ ⠿  github.com                      [✕] │   │
│  │ ⠿  stackoverflow.com               [✕] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [+ Add URL                                ]    │
│  [https://...                              ]    │
│  ← text input, Enter to add                    │
│                                                 │
│  5 / 10 tabs                                    │
│  ← text-xs text-[#94A3B8]                      │
│                                                 │
├─────────────────────────────────────────────────┤
│              [Cancel]    [Save Changes]         │
│              (or [Create Mode] for create)      │
└─────────────────────────────────────────────────┘
```

**URL validation (inline, on add):**
```
Invalid URL     → "Please enter a valid URL" below input, red text
Duplicate URL   → "This URL is already in this mode" below input
At 10 tabs      → input disabled, "Maximum 10 tabs reached"
```

**Color swatches (custom modes only):**
```
w-8 h-8 rounded-lg cursor-pointer border-2
Selected: border-[#0F172A]
Unselected: border-transparent hover:border-[#94A3B8]

Colors:
  #0891B2  teal
  #7C3AED  violet
  #E11D48  rose
  #059669  emerald
  #D97706  amber
  #2563EB  blue
  #DC2626  red
  #94A3B8  grey
```

---

### Custom Mode Empty State

Shown below divider when user has no custom modes:

```
┌──────────────────────────────────────────────┐
│  No custom modes yet.                        │
│  Create your own tab group with any          │
│  combination of sites.                       │
│                                              │
│  [+ Create your first mode]                  │
└──────────────────────────────────────────────┘
```

`.chart-glass` container, centered text, ghost button triggers same modal.

---

### Loading State
```
4 skeleton cards — same dimensions as ModeCard
.skeleton shimmer class
```

---

## Section 2 — Streak Tracking

### Section Header
```
STREAK TRACKING
Build daily habits by tracking time on the sites you care about.    [+ New Streak]
```

---

### Streak Cards Layout

```
grid grid-cols-1 gap-4   ← full width cards, one per row
```

Each streak gets its own full-width card — wider than mode cards because the
heatmap calendar needs horizontal space.

---

### StreakCard.tsx

```
.chart-glass — full width
padding: 24px

┌─────────────────────────────────────────────────────────────────────┐
│  🔥 Daily LeetCode                              23 day streak 🔥    │
│  leetcode.com · 30 mins/day · Weekdays                              │
│                                                                     │
│  Today: 45m 23s  ✓ Goal met                                        │
│  ──────────────────────────────────────────────────────────────     │
│                                                                     │
│  LAST 90 DAYS                                                       │
│  [heatmap calendar — StreakCalendar component]                      │
│                                                                     │
│  ● Met  ● Partial  ● Missed  ░ Inactive                            │
│                                                                     │
│  Best streak: 31 days · Started: Jan 15, 2026                      │
│                                         [Edit]  [Delete]           │
└─────────────────────────────────────────────────────────────────────┘
```

**Header line:**
```
🔥 emoji only when currentStreak > 0
Label → Plus Jakarta Sans 600, 16px, #1E293B
Streak count → tabular-nums Inter 700, 16px, #0F172A right-aligned
               "23 day streak" or "0 day streak"
               color: currentStreak > 0 → #D97706 (amber), else #94A3B8
```

**Meta line:**
```
domain · minMinutes + "mins/day" · active days label
text-xs text-[#94A3B8]
Active days label: [1,2,3,4,5] → "Weekdays"
                   [0,6]       → "Weekends"
                   [0,1,2,3,4,5,6] → "Every day"
                   other       → "Custom days"
```

**Today progress:**
```
If todaySeconds >= minMinutes * 60:
  "Today: {formatted duration}  ✓ Goal met"
  color: #16A34A (green)

If todaySeconds > 0 AND < minMinutes * 60:
  "Today: {formatted duration}  {remaining} to go"
  color: #D97706 (amber)

If todaySeconds === 0:
  "Today: No activity yet"
  color: #94A3B8 (muted)

If today is not an active day:
  "Today: Rest day"
  color: #94A3B8 (muted)
```

**Footer line:**
```
"Best streak: {longestStreak} days · Started: {formattedDate}"
text-xs text-[#94A3B8]
[Edit] + [Delete] buttons pushed right
```

---

### StreakCalendar.tsx

GitHub contribution graph style heatmap.
One square per day for the last 90 days.
Weeks run left to right, oldest on left.

```
       Jan         Feb         Mar
M  ░ ░ ░ ■ ■ ░ ░ ▒ ■ ■ ░ ░ ■ ■ ■
W  ░ ░ ■ ■ ■ ░ ░ ■ ■ ■ ░ ░ ■ ■ ■
F  ░ ░ ■ ■ ■ ░ ░ ■ ■ ■ ░ ░ ■ ■ ▒
```

**Square colors:**
```
met:      #16A34A  dark green   → goal fully met (seconds >= minSeconds)
partial:  #86EFAC  light green  → some activity but below goal
missed:   #DC2626  red          → active day, zero activity
skipped:  #D97706  amber        → grace period skip used
inactive: rgba(148,163,184,0.2) → non-active day (grey/transparent)
```

**Square size:** `w-3 h-3 rounded-sm gap-0.5`

**Month labels:** `text-[10px] text-[#94A3B8]` above first week of each month

**Day labels:** M W F on left side, `text-[10px] text-[#94A3B8]`

**Hover tooltip per square:**
```
Mar 22, 2026
─────────────
45m 23s on leetcode.com
Goal: 30 mins  ✓ Met
```

**Data source:** `GET /api/productivity/streaks/:id/calendar?days=90`
React Query staleTime: 5 minutes.

---

### Legend (below calendar)
```
flex gap-4 items-center mt-3

■ Met     → w-3 h-3 #16A34A rounded-sm + "Met" text-xs text-[#64748B]
■ Partial → w-3 h-3 #86EFAC rounded-sm + "Partial"
■ Missed  → w-3 h-3 #DC2626 rounded-sm + "Missed"
░ Inactive → w-3 h-3 rgba(148,163,184,0.2) rounded-sm + "Inactive"
```

---

### StreakModal.tsx — Create + Edit (same component)

```
Backdrop + centered modal same pattern as ModeModal.

┌─────────────────────────────────────────────────┐
│ New Streak                              [✕]     │
│ (or "Edit {label}" for edit)                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  WHAT DO YOU WANT TO TRACK?                     │
│  [Daily LeetCode                        ]       │
│  ← label input, max 100 chars                  │
│                                                 │
│  DOMAIN                                         │
│  [leetcode.com                          ]       │
│  ← text input, auto-strip protocol             │
│  Suggested from browsing history (top domains) │
│                                                 │
│  MINIMUM TIME PER DAY                           │
│  [15 mins ▾]                                   │
│  Options: 15 mins / 30 mins / 45 mins /         │
│           1 hour / 1.5 hours / 2 hours / Custom │
│                                                 │
│  ACTIVE DAYS                                    │
│  [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]     │
│   ■     ■     ■     ■     ■     □     □         │
│  ← toggle buttons, teal when active            │
│                                                 │
│  GRACE PERIOD                                   │
│  ○ None — missing any active day resets streak │
│  ● Allow 1 skip per week                        │
│  ○ Allow 1 skip per month                       │
│                                                 │
│              [Cancel]    [Create Streak]        │
└─────────────────────────────────────────────────┘
```

**Domain suggestions:**
Below domain input, show top 5 domains from browsing history
(from `GET /api/browsing/stats/domains?period=all&limit=5`).
Clicking a suggestion fills the domain input.

```
Suggested:  leetcode.com  github.com  notion.so  udemy.com
```

`text-xs text-[#0891B2]` pill buttons, click to fill input.

**Day toggle buttons:**
```
w-10 h-8 rounded-lg text-xs font-medium
Active:   bg-[#0891B2] text-white
Inactive: bg-[#F0F9FF] text-[#94A3B8] border border-[#E0F2FE]
```

---

### Streak Empty State

```
┌──────────────────────────────────────────────┐
│  No streaks yet.                             │
│  Add a domain to start building a daily      │
│  habit — SurfBud tracks your progress        │
│  automatically.                              │
│                                              │
│  [+ Create your first streak]                │
└──────────────────────────────────────────────┘
```

---

### Loading State

```
2 skeleton cards — full width, same height as StreakCard
.skeleton shimmer class
```

---

## Section 3 — Focus Mode

### Section Header
```
FOCUS MODE
Lock in on a single site. Navigate away and we'll remind you.
```

No `[+]` button — only one focus session at a time.

---

### FocusMode.tsx Layout

Two panels side by side:

```
grid grid-cols-5 gap-4

Left panel  (3 cols) → start/active state
Right panel (2 cols) → recent history
```

---

### Left Panel — Start State (no active session)

```
.chart-glass — full height of the two-panel grid

┌──────────────────────────────────────┐
│  🎯 Start a Focus Session            │
│                                      │
│  FOCUS ON                            │
│  [Select a site...           ▾]      │
│  ← dropdown from browsing history   │
│                                      │
│  DURATION                            │
│  ○ No timer                          │
│  ● 25 minutes                        │
│  ○ 45 minutes                        │
│  ○ 1 hour                            │
│  ○ 2 hours                           │
│  ○ Custom: [___] minutes             │
│                                      │
│  [Start Focus Session]               │
└──────────────────────────────────────┘
```

**Site dropdown:**
Populated from `GET /api/browsing/stats/domains?period=all&limit=20`.
Shows Brandfetch logo + label + domain.
User can also type a custom domain not in their history.

**[Start Focus Session] button:**
```
.btn-primary full width
Disabled until a site is selected
```

On click:
1. `POST /api/productivity/focus/sessions`
2. `window.open(domain, '_blank')` to open the focus site
3. Panel transitions to Active state

---

### Left Panel — Active State

```
.chart-glass — border-left: 4px solid #0891B2

┌──────────────────────────────────────┐
│  🎯 Focus Session Active             │
│                                      │
│  [Logo/Badge — 40×40]                │
│  Udemy                               │
│  udemy.com                           │
│                                      │
│  ELAPSED TIME                        │
│  00:23:14                            │  ← Inter 700, 48px, tabular-nums
│                                      │     teal color #0891B2
│                                      │
│  PLANNED                             │
│  45 minutes                          │  ← or "No timer"
│                                      │
│  [End Session]  [Abandoned]          │
└──────────────────────────────────────┘
```

**Timer:**
Runs client-side from `session.startedAt`.
Formatted as `HH:MM:SS`.
Updates every second via `setInterval`.

**[End Session]:** status = 'completed'
**[Abandoned]:** status = 'abandoned', danger ghost button

Both call `PATCH /api/productivity/focus/sessions/:id/end`.

**Logo/Badge:** same priority order as Browsing drawer —
Brandfetch logo → BrowsingCategoryIconBadge → Globe.

---

### Right Panel — Recent History

```
.chart-glass — full height

RECENT FOCUS SESSIONS

┌──────────────────────────────────┐
│ [Logo]  Udemy              45m   │
│         udemy.com · Mar 22       │
│         ✓ Completed              │
├──────────────────────────────────┤
│ [Logo]  GitHub             1h 2m │
│         github.com · Mar 21      │
│         ✓ Completed              │
├──────────────────────────────────┤
│ [Logo]  YouTube            12m   │
│         youtube.com · Mar 21     │
│         ✗ Abandoned              │
└──────────────────────────────────┘

Last 10 sessions · newest first
```

**Row layout:**
```
Logo/Badge  40×40   same priority as session row
Label       Inter 500, 14px, #1E293B
Duration    right-aligned, tabular-nums, Inter 600, 14px
Meta line:  domain · relative date · status
            text-xs text-[#94A3B8]

Status:
  ✓ Completed → text-[#16A34A]
  ✗ Abandoned → text-[#DC2626]
  ⌛ Active   → text-[#0891B2]
```

**Pagination:**
```
Sticky bottom inside right panel
Page {n} of {total}  [‹] [›]
10 sessions per page
```

**Data source:** `GET /api/productivity/focus/sessions?page=1&limit=10`

---

### Focus Mode Empty State (right panel)

```
No focus sessions yet.
Start your first session to see
your history here.
```

---

### Loading States

```
Left panel:  skeleton for domain dropdown + radio buttons
Right panel: 5 skeleton rows
```

---

## Modals — Shared Behavior

Both ModeModal and StreakModal follow the same behavioral rules:

```
Open:    opacity 0 + scale(0.95) → opacity 1 + scale(1) · 200ms ease-out
Close:   opacity 1 + scale(1) → opacity 0 + scale(0.95) · 150ms ease-out
Backdrop click → close
Escape key     → close

Save/Create:
  Optimistic update via React Query
  Show inline spinner on button while saving
  On error: show error message below form, keep modal open
  On success: close modal, invalidate query

Form validation:
  Zod client-side mirror of server schemas
  Show errors inline below each field
  Validate on blur + on submit attempt
```

---

## React Query Hooks

```typescript
// Tab Group Modes
export function useTabGroupModes() {
  return useQuery({
    queryKey: ['productivity', 'modes'],
    queryFn:  ProductivityAPI.getModes,
    staleTime: 5 * 60_000,   // 5 minutes — modes change rarely
  })
}

// Streaks
export function useStreaks() {
  return useQuery({
    queryKey: ['productivity', 'streaks'],
    queryFn:  ProductivityAPI.getStreaks,
    staleTime: 30_000,        // 30 seconds — todayProgress updates frequently
  })
}

// Streak Calendar — per streak, lazy loaded
export function useStreakCalendar(streakId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['productivity', 'streaks', streakId, 'calendar'],
    queryFn:  () => ProductivityAPI.getStreakCalendar(streakId),
    enabled,
    staleTime: 5 * 60_000,
  })
}

// Focus active session — short stale, user expects live state
export function useActiveFocusSession() {
  return useQuery({
    queryKey: ['productivity', 'focus', 'active'],
    queryFn:  ProductivityAPI.getActiveSession,
    staleTime: 10_000,        // 10 seconds
    refetchInterval: 30_000,  // background refetch every 30s
  })
}

// Focus history
export function useFocusHistory(page: number) {
  return useQuery({
    queryKey: ['productivity', 'focus', 'sessions', page],
    queryFn:  () => ProductivityAPI.getFocusHistory(page),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
```

---

## Animation Rules

All animations follow the design system rules:

| Element | Animation |
|---|---|
| Mode card hover | `translateY(-3px)` + shadow · 200ms ease-out |
| Modal open | `opacity 0→1` + `scale(0.95→1)` · 200ms ease-out |
| Modal close | `opacity 1→0` + `scale(1→0.95)` · 150ms ease-out |
| Streak card load | `opacity 0→1` + `translateY(8px→0)` · 200ms ease-out · stagger 100ms |
| Calendar squares fill | `opacity 0→1` · 300ms ease-out · stagger 2ms per square |
| Focus timer | `color` tick every second — no layout animation |
| Active session border | `border-color` transition · 300ms ease-out |
| Active panel → start panel | `opacity` crossfade · 200ms ease-out |

**Rule:** Only animate `transform`, `opacity`, `box-shadow`, `color`, `background-color`.
Never animate `width`, `height`, `margin`, `padding`.

---

## Empty States

| Section | Empty State |
|---|---|
| Custom modes | "No custom modes yet. Create your own tab group." + `[+ Create your first mode]` |
| Streaks | "No streaks yet. Add a domain to start building a daily habit." + `[+ Create your first streak]` |
| Focus history | "No focus sessions yet. Start your first session to see your history here." |

---

## Loading States

| Section | Skeleton |
|---|---|
| Mode cards | 4 predefined skeleton cards + 1 custom skeleton |
| Streak cards | 2 full-width skeleton cards |
| Focus left panel | Skeleton form fields |
| Focus right panel | 5 skeleton rows |

---

## Error States

```
Each section fails independently — never a full page error.

Inside failed section container:
  "Could not load {section name}" → text-sm text-[#DC2626]
  [Retry] button → ghost variant, triggers React Query refetch
```

---

## Component File Map

```
src/
├── pages/
│   └── ProductivityPage.tsx
│
├── components/features/productivity/
│   ├── TabGroups.tsx                  ← Section 1 shell
│   ├── ModeCard.tsx                   ← single mode card
│   ├── ModeModal.tsx                  ← create + edit modal
│   ├── StreakSection.tsx              ← Section 2 shell
│   ├── StreakCard.tsx                 ← single streak card
│   ├── StreakCalendar.tsx             ← heatmap calendar
│   ├── StreakModal.tsx                ← create + edit modal
│   └── FocusMode.tsx                 ← Section 3 shell + panels
│
├── api/
│   ├── productivity.api.ts           ← REST calls
│   └── useProductivity.ts            ← all React Query hooks
```

---

## API Summary

```
Tab Groups:
  GET    /api/productivity/modes                    → TabGroups.tsx
  POST   /api/productivity/modes                    → ModeModal.tsx (create)
  PATCH  /api/productivity/modes/:id                → ModeModal.tsx (edit)
  DELETE /api/productivity/modes/:id                → ModeCard.tsx (delete button)
  POST   /api/productivity/modes/:id/activate       → ModeCard.tsx (activate button)

Streaks:
  GET    /api/productivity/streaks                  → StreakSection.tsx
  POST   /api/productivity/streaks                  → StreakModal.tsx (create)
  PATCH  /api/productivity/streaks/:id              → StreakModal.tsx (edit)
  DELETE /api/productivity/streaks/:id              → StreakCard.tsx (delete)
  GET    /api/productivity/streaks/:id/calendar     → StreakCalendar.tsx

Focus Mode:
  GET    /api/productivity/focus/active             → FocusMode.tsx (active state)
  POST   /api/productivity/focus/sessions           → FocusMode.tsx (start button)
  PATCH  /api/productivity/focus/sessions/:id/end   → FocusMode.tsx (end/abandon)
  GET    /api/productivity/focus/sessions           → FocusMode.tsx (history panel)
```

---

*SurfBud · Productivity Page UI Spec · v1.0 · March 2026*
