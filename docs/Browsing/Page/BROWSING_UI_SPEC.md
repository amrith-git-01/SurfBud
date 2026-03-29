# SurfBud — Browsing Page UI Spec
**Version 1.0 · Phase 1 · March 2026**

---

## 1. Overview

The Browsing page is a digital wellbeing dashboard that shows users how they spend their time online. It tracks active browsing time per domain, categorizes sites, calculates a focus score, and visualizes patterns over time.

```
Route:         /browsing
Nav highlight: Browsing nav item active
Page title:    Browsing
Subtitle:      Track and understand your browsing habits.
```

---

## 2. Reusability From Downloads Page

Before building any new component — reuse these directly:

### Reuse As-Is
| Component | Reused For |
|---|---|
| `MetricCard` | All 5 browsing metric cards — same glass card, different data |
| `MetricCardSkeleton` | Loading state for all metric cards |
| `SectionLabel` | All section headers |
| `ProgressBar` | Time distribution bars in top sites + categories |
| `.card-metric-glass` | All metric cards |
| `.chart-glass` | Chart container + category/domain panels |
| `.section-label` | All uppercase section labels |
| `.skeleton` | All loading states |
| `useCountUp` hook | Animate all metric numbers on load |

### Reuse With Modifications
| Component | Modification |
|---|---|
| `DownloadTrendChart` → `BrowsingTrendChart` | Different data: totalActiveTime bar, productive + distracting lines. Different period: 7/15/30 days |
| `DownloadsFeed` → `RecentActivityFeed` | Same scrollable list pattern. Different row: domain label, category, duration |
| `DownloadHealthBar` → `BrowsingHealthBar` | Same two-segment bar. Productive vs Distracting instead of New vs Dup |
| `FileCategories` → `BrowsingCategories` | Same list/donut toggle. Domain categories instead of file categories |

### New Components Needed
```
BrowsingMetricCards      → Section 1
BrowsingTrendChart       → Section 2 left
RecentActivityFeed       → Section 2 right
TopSitesList             → Section 3 left
BrowsingCategories       → Section 3 right
DailyTimeline            → Section 4 top
ContextSwitchStats       → Section 4 bottom
DomainRow                → reusable row for top sites
ActivityFeedRow          → reusable row for recent activity
```

---

## 3. Color Scheme — Browsing Specific

Extends the existing design system tokens:

```css
/* Productivity colors */
--color-productive:    #16A34A   /* --color-success */
--color-distracting:   #DC2626   /* --color-danger */
--color-neutral:       #94A3B8   /* --color-text-muted */

/* Timeline block colors */
--timeline-productive:  rgba(22, 163, 74, 0.6)
--timeline-distracting: rgba(220, 38, 38, 0.6)
--timeline-neutral:     rgba(148, 163, 184, 0.4)
--timeline-empty:       transparent

/* Focus Score ranges */
/* 80-100 → --color-success   green  */
/* 50-79  → --color-warning   amber  */
/* 0-49   → --color-danger    red    */
/* null   → --color-text-muted grey  */
```

---

## 4. Page Layout

```
Browsing                                    [Period: Today ▼]
Track and understand your browsing habits.

┌─ Section 1 ─────────────────────────────────────────────┐
│  Metric Cards (5 cards)                                  │
└──────────────────────────────────────────────────────────┘

┌─ Section 2 ──────────────────────────────────────────────┐
│  Composed Chart (left)    Recent Activity Feed (right)   │
└──────────────────────────────────────────────────────────┘

┌─ Section 3 ──────────────────────────────────────────────┐
│  Top Sites (left)         Time by Category (right)       │
└──────────────────────────────────────────────────────────┘

┌─ Section 4 ──────────────────────────────────────────────┐
│  Today's Browsing Pattern                                │
│  Daily Timeline + Context Switch Stats                   │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Global Period Selector

Single period selector top-right of page title. All sections update simultaneously.

```
Browsing                              [Today ▼]
```

| Option | What Changes |
|---|---|
| Today | Metric cards show today. Chart shows today's hourly breakdown. Feed shows today's sessions. Top sites + categories show today. |
| This Week | Metric cards show this week. Chart shows last 7 days. |
| This Month | Metric cards show this month. Chart shows last 30 days. |

**Note:** Section 2 chart has its own independent period selector for historical view (7/15/30 days) — separate from the global selector.

---

## 6. Section 1 — Metric Cards

Five glass cards in a row. Same layout pattern as Downloads page metric cards.

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ TIME ONLINE    │ │ SITES VISITED  │ │ TOP SITE       │ │ FOCUS SCORE    │ │LONGEST SESSION │
│ Today          │ │ Today          │ │ Today          │ │ Today          │ │ Today          │
│                │ │                │ │                │ │                │ │                │
│ 4h 23m         │ │ 32             │ │ GitHub         │ │ 78             │ │ 1h 45m         │
│                │ │                │ │ github.com     │ │ / 100          │ │ 9:00–10:45 AM  │
│ ↑ 23m vs       │ │ ↓ 5 vs         │ │ ↑ vs yesterday │ │ ↑ +12 vs       │ │ ↑ 12m vs       │
│ yesterday      │ │ yesterday      │ │                │ │ yesterday      │ │ yesterday      │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

### Card Specs

**TIME ONLINE**
```
Value:    formatted duration — "4h 23m" / "45m" / "2h"
Delta:    vs yesterday (↑ green / ↓ red)
Source:   UserBrowsingMetrics.today.totalActiveTime
Empty:    "0m"
```

**SITES VISITED**
```
Value:    number of unique domains visited
Delta:    vs yesterday
Source:   UserBrowsingMetrics.today.sitesVisited
Empty:    "0"
```

**TOP SITE**
```
Value:    human readable label e.g. "GitHub"
Subtitle: raw domain in muted text e.g. "github.com"
Delta:    "↑ vs yesterday" or "↓ vs yesterday" or "same as yesterday"
Source:   UserBrowsingMetrics.today.topSite + topSiteLabel
Empty:    "—"
```

**FOCUS SCORE**
```
Value:    "78" large + "/ 100" muted suffix
Delta:    vs yesterday (↑ green / ↓ red)
Color:    80-100 → green, 50-79 → amber, 0-49 → red, null → muted
Source:   UserBrowsingMetrics.today.focusScore
Empty:    "—" (null) — never show 0 when no data
```

**LONGEST SESSION**
```
Value:    formatted duration e.g. "1h 45m"
Subtitle: time range e.g. "9:00 – 10:45 AM" in muted text
Delta:    vs yesterday
Source:   UserBrowsingMetrics.today.longestSession +
          longestSessionStart + longestSessionEnd
Empty:    "—"
```

### Reuse Pattern
```tsx
// Reuse MetricCard component from Downloads
// Pass different props — no component changes needed

<MetricCard
  label="FOCUS SCORE"
  value={focusScore ?? '—'}
  delta={focusDelta}
  isLoading={isLoading}
  className={getFocusScoreColor(focusScore)}
/>
```

---

## 7. Section 2 — Composed Chart + Recent Activity

Two panels side by side. Same layout as Downloads page recent activity section.

### 7.1 Left Panel — Composed Chart

**Reuse `DownloadTrendChart` → rename to `BrowsingTrendChart`**

Same ComposedChart pattern (Recharts). Different data series:

```
Bar    → Total Time Online (--color-primary teal)
Line 1 → Productive Time  (--color-success green)
Line 2 → Distracting Time (--color-danger red)
```

**Period selector (independent from global):**
```
[7 days]  [15 days]  [30 days]
```

**Y-axis:** Time in hours (e.g. 0, 1h, 2h, 3h, 4h)

**Custom tooltip:**
```
Mar 10
────────────────
Total      4h 23m
Productive 2h 10m  ●
Distracting  56m   ●
Neutral      45m
Focus Score   78
```

**Legend:**
```
■ Total Time   ─ Productive   ─ Distracting
```

**Chart config (reuse CHART_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE from utils/chart-config):**
```tsx
<Bar dataKey="totalActiveTime" fill="var(--color-primary)" radius={[4,4,0,0]} />
<Line dataKey="productiveTime" stroke="#16A34A" dot={false} animationDuration={800} />
<Line dataKey="distractingTime" stroke="#DC2626" dot={false} animationDuration={800} />
```

---

### 7.2 Right Panel — Recent Activity Feed

**Reuse `DownloadsFeed` → adapt to `RecentActivityFeed`**

Shows last 10 completed non-micro sessions for today. Sorted by endedAt descending.

```
RECENT ACTIVITY

┌────────────────────────────────────────┐
│ 🐙 GitHub                  >           │
│    Development · 1h 23m                │
│    Today, 9:00 AM                      │
├────────────────────────────────────────┤
│ 📝 Notion                  >           │
│    Productivity · 1h 12m               │
│    Today, 11:30 AM                     │
├────────────────────────────────────────┤
│ 🎬 YouTube                 >           │
│    Video · 38m                         │
│    Today, 2:15 PM                      │
└────────────────────────────────────────┘

View all activity →
```

**Each row shows:**
- Category icon (from BrowsingCategory.icon via lucide-react)
- Human readable label (from DomainClassification.label)
- Category name · active time duration
- Date + time of session
- Chevron → click opens site detail drawer (Phase 2)

**Session merging display:**
Same domain visits within 5 mins are merged — show as one row with combined duration.

**Minimum threshold:**
Sessions under 1 minute hidden from feed. Still counted in metrics.

**"View all activity →" link:**
Navigates to full paginated session list (Phase 2 drawer or page).

**Empty state:**
```
No browsing activity yet today.
Start browsing with SurfBud active
to see your activity here.
```

---

## 8. Section 3 — Top Sites + Time by Category

Two panels side by side.

### 8.1 Left Panel — Top Sites

```
TOP SITES
─────────────────────────────────────────────────────

🐙  GitHub                          1h 23m   ● Productive
    github.com                      ████████████████  34%

🎬  YouTube                           52m    ● Neutral
    youtube.com                     ████████████      21%

🐦  Twitter                            38m   ● Distracting
    twitter.com                     █████████         15%

📚  Stack Overflow                     31m   ● Productive
    stackoverflow.com               ████████          12%

🛒  Reddit                             24m   ● Distracting
    reddit.com                      ██████             9%

🌐  Other sites                        21m
    23 other domains                █████              8%
```

**Each row shows:**
- Category icon (lucide-react, colored per category color)
- Human readable label (large, --color-text-heading)
- Raw domain (small, --color-text-muted, below label)
- Active time (right aligned, tabular-nums)
- Productivity dot (green/red/grey)
- Progress bar (proportional to total time)
- Percentage

**Last row:**
Always aggregates remaining domains into "Other sites — X domains".

**Click to expand:**
```tsx
// Clicking a row expands inline to show sessions
🐙  GitHub                          1h 23m   ● Productive
    ▼
    ────────────────────────────────────────
    Session 1    9:00 – 10:23 AM    1h 23m
    Session 2    2:14 – 2:28 PM       14m
```

**Productivity dot colors:**
```
● productive  → --color-success  #16A34A
● distracting → --color-danger   #DC2626
● neutral     → --color-text-muted #94A3B8
```

**Reuse `ProgressBar` component from Downloads.**

---

### 8.2 Right Panel — Time by Category

**Reuse `FileCategories` component → adapt to `BrowsingCategories`**

Same list/donut toggle pattern.

```
TIME BY CATEGORY              [≡ List]  [◎ Donut]
─────────────────────────────────────────────────────

Productivity      2h 10m   ████████████████████  47%
Social Media      1h 12m   █████████████         26%
Video               45m    ██████                16%
News                16m    ███                    6%
Other               10m    ██                     4%

─────────────────────────────────────────────────────

● PRODUCTIVE      2h 41m   62%
● NEUTRAL           45m    17%
● DISTRACTING       56m    21%
```

**Two sub-sections:**

**Top half — by category:**
Each row: category icon + name, total time, bar, percentage.
Category data from `BrowsingCategoryStats`.

**Bottom half — productive / neutral / distracting summary:**
Three rows only. Aggregated from category productivityType.
This is what drives the Focus Score.

**Donut view (same as Downloads page):**
```tsx
// Reuse same donut chart pattern
// Different colors: success/danger/muted
```

**Category icons:**
Use `BrowsingCategory.icon` to get lucide-react icon name.
Use `BrowsingCategory.color` for icon tint background.

**Pending classification state:**
If a category shows as "Other" because Groq hasn't classified yet:
```
🌐 Other          12m    ██    (being classified...)
```
Subtle muted text "(being classified...)". Updates via WebSocket when done.

---

## 9. Section 4 — Today's Browsing Pattern

One full-width card with two sub-sections.

### 9.1 Daily Timeline

Horizontal timeline of the entire day. 15-minute blocks. Color coded by dominant activity in each block.

```
TODAY'S BROWSING PATTERN

12AM  3AM   6AM   9AM   12PM  3PM   6PM   9PM  12AM
░░░░  ░░░░  ░░░  ████  ░░░  ████  ████  ███   ░░░░
                  ▲              ▲
               Deep focus    Deep focus

● Productive  ● Distracting  ● Neutral  ░ No activity
```

**Block details:**
```
Block size:     15 minute windows
Block color:    dominant productivity type in that window
                if mixed → show productive if > 50% productive
                         → show distracting if > 50% distracting
                         → show neutral otherwise
Empty block:    no browsing in that window → transparent/light grey
```

**Hover tooltip:**
```
2:00 PM – 2:15 PM
────────────────────
github.com     8m
stackoverflow  5m
Productive
```

**Color:**
```css
productive:  rgba(22, 163, 74, 0.6)    green
distracting: rgba(220, 38, 38, 0.6)    red
neutral:     rgba(148, 163, 184, 0.4)  grey
empty:       rgba(148, 163, 184, 0.1)  very light
```

**Current time indicator:**
A subtle vertical line showing current time of day.
```
───────────┼──────────
           ↑ Now
```

**Empty state (new user, no data):**
All blocks show empty color. Text below:
```
No browsing data yet today.
Browse with SurfBud active to see your pattern.
```

---

### 9.2 Context Switch Stats

Four stat boxes below the timeline. Same card, separated by a subtle divider.

```
─────────────────────────────────────────────────────

CONTEXT SWITCHES    AVG SESSION         DEEP FOCUS          SCATTERED
Today               Today               Today               Today

47                  5m 32s              3 sessions          2 periods

vs yesterday        vs yesterday        vs yesterday        vs yesterday
↑ 12               ↓ 1m 10s            same                ↑ 1
```

**Definitions shown on hover (tooltip):**
```
Context Switches  → number of domain changes today
Avg Session       → total active time / number of sessions
Deep Focus        → continuous sessions over 30 minutes
Scattered         → periods with 10+ switches per hour
```

**Reuse MetricCard component for each stat box.**

---

## 10. Component File Structure

```
pages/
  BrowsingPage.tsx               ← page root, orchestrates all sections

components/features/browsing/
  BrowsingMetricCards.tsx        ← Section 1, reuses MetricCard
  BrowsingTrendChart.tsx         ← Section 2 left, adapted from DownloadTrendChart
  RecentActivityFeed.tsx         ← Section 2 right, adapted from DownloadsFeed
  ActivityFeedRow.tsx            ← single row in feed
  TopSitesList.tsx               ← Section 3 left
  DomainRow.tsx                  ← single expandable domain row
  BrowsingCategories.tsx         ← Section 3 right, adapted from FileCategories
  DailyTimeline.tsx              ← Section 4 top
  TimelineBlock.tsx              ← single 15-min block
  ContextSwitchStats.tsx         ← Section 4 bottom

hooks/
  useBrowsingMetrics.ts          ← React Query, reads UserBrowsingMetrics
  useBrowsingDailyStats.ts       ← React Query, chart data
  useBrowsingDomainStats.ts      ← React Query, top sites
  useBrowsingCategoryStats.ts    ← React Query, category breakdown
  useRecentActivity.ts           ← React Query, recent sessions feed
  useBrowsingCategories.ts       ← React Query, category definitions (long staleTime)
```

---

## 11. React Query Hooks

```typescript
// Long staleTime — categories rarely change
export function useBrowsingCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.browsingCategories(),
    queryFn:  BrowsingAPI.getCategories,
    staleTime: 60 * 60 * 1000,  // 1 hour
    gcTime:    24 * 60 * 60 * 1000,  // 24 hours
  })
}

// Short staleTime — metrics update frequently
export function useBrowsingMetrics() {
  return useQuery({
    queryKey: QUERY_KEYS.browsingMetrics(),
    queryFn:  BrowsingAPI.getMetrics,
    staleTime: 30_000,   // 30 seconds
    gcTime:    5 * 60_000,
  })
}

// Chart data — medium staleTime
export function useBrowsingDailyStats(period: 7 | 15 | 30) {
  return useQuery({
    queryKey: QUERY_KEYS.browsingDailyStats(period),
    queryFn:  () => BrowsingAPI.getDailyStats(period),
    staleTime: 5 * 60_000,  // 5 minutes
  })
}
```

---

## 12. WebSocket Integration

```typescript
// In useWebSocketSync hook — extend existing hook from Downloads
// Reuse same pattern

socket.on('browsing:metrics:updated', (delta) => {
  queryClient.setQueryData(
    QUERY_KEYS.browsingMetrics(),
    (old: UserBrowsingMetrics) => applyBrowsingDelta(old, delta)
  )
})

socket.on('browsing:domain:classified', ({ domain, label, categorySlug }) => {
  // Update any cached data showing this domain as 'Other'
  queryClient.invalidateQueries({ queryKey: ['browsingDomainStats'] })
  queryClient.invalidateQueries({ queryKey: ['browsingCategoryStats'] })
  queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
})
```

---

## 13. Animation Rules

All animations follow the existing design system rules:

| Element | Animation |
|---|---|
| Metric cards load | `opacity 0→1` + `translateY(8px→0)` · `200ms ease-out` · stagger 50ms |
| Timeline blocks fill | `opacity 0→1` · `300ms ease-out` · stagger 5ms per block |
| Chart lines draw | Recharts `animationDuration={800}` |
| Domain row expand | `height auto` via max-height trick · `200ms ease-out` |
| Feed rows stagger | `opacity 0→1` + `translateY(8px→0)` · `40ms` stagger |
| Focus score color | `color` transition · `300ms ease-out` |

**Rule:** Only animate `transform`, `opacity`, `box-shadow`, `color`, `background-color`. Never `width`, `height`, `margin`, `padding`.

---

## 14. Empty States

| Section | Empty State |
|---|---|
| All metric cards | Show `—` for text metrics, `0` for counts. Never show broken/loading state permanently. |
| Recent Activity feed | `"No browsing activity yet today."` |
| Top Sites | `"No sites visited yet today."` |
| Categories | `"No browsing data yet."` |
| Daily Timeline | All blocks empty color + `"Browse with SurfBud active to see your pattern."` |
| Context Switch Stats | All values `0` or `—` |

---

## 15. Loading States

All sections use skeleton components while data loads:

```tsx
// Reuse existing skeleton pattern from Downloads
if (isLoading) return <MetricCardSkeleton />

// Timeline skeleton
if (isLoading) return <TimelineSkeleton />  // grey blocks across full width

// Feed skeleton
if (isLoading) return (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <ActivityFeedRowSkeleton key={i} />
    ))}
  </>
)
```

---

---

## 16. Browsing Detail Drawer

### 16.1 Overview

The Browsing Detail Drawer is a 420px slide-in panel triggered by clicking interactive
elements across the Browsing page. It follows the same shell pattern as the Downloads
File Detail Drawer — same backdrop, same slide animation, same sticky pagination — but
the content inside is different because sessions are time-based events, not files.

**Shell reuse from Downloads:**
```
Backdrop        → rgba(0,0,0,0.20) + backdrop-blur(4px)
Panel           → 420px fixed right, white, box-shadow: -8px 0 32px rgba(8,145,178,0.12)
Slide-in        → translateX(100% → 0), 280ms ease-out
Slide-out       → translateX(0 → 100%), 280ms ease-out
Click outside   → closes drawer
Pagination      → sticky bottom, Page {n} of {total}, [‹] [›], 10 items/page
Search          → debounced 300ms, filters by domain label
```

**Key difference from Downloads:**
Downloads drawer had List Mode → Detail Mode drill-down with back navigation.
Browsing drawer is always **one level deep** — every trigger opens a flat list or
a single detail view. No drill-down, no back button in Phase 1.

---

### 16.2 Complete Trigger Map

| Trigger | Drawer Title | Content | Sort | Paginated |
|---|---|---|---|---|
| TIME ONLINE card | Today's Sessions | All sessions today | Newest first | ✅ 10/page |
| View all sessions (recent feed footer) | All Sessions | All sessions across all time | Newest first | ✅ 10/page |
| SITES VISITED card | Sites Visited Today | One row per unique domain | Most time first | ✅ 10/page |
| TOP SITE card | Sessions on {label} | Sessions today for that domain | Newest first | ✅ 10/page |
| FOCUS SCORE card | Productive Sessions | Productive sessions + summary header | Most time first | ✅ 10/page |
| LONGEST SESSION card | All Sessions by Duration | All sessions today | Longest first | ✅ 10/page |
| Chart bar click | {Date} Sessions e.g. "Mar 21" | All sessions for that specific day | Newest first | ✅ 10/page |
| Recent feed row click | Session Detail | Single session with interactions | — | ❌ no pagination |
| Site breakdown row click | Sessions on {label} | Sessions for that domain, selected period | Newest first | ✅ 10/page |
| Site breakdown "Others" click | Sessions on Other Sites | Sessions excluding the visible top domains for selected period | Newest first | ✅ 10/page |
| Category breakdown row click | {Category} Sessions | Sessions for that category, selected period | Most time first | ✅ 10/page |
| Timeline block click (active) | {Time Range} Sessions e.g. "6:00–6:30 AM" | Sessions within that 30-min window | Newest first | ✅ if > 10 |
| Timeline block click (empty) | — | Not interactive | — | — |
| CONTEXT SWITCHES card | — | Not interactive | — | — |
| AVG SESSION card | — | Not interactive | — | — |
| DEEP FOCUS card | — | Not interactive | — | — |
| SCATTERED card | — | Not interactive | — | — |

**Note on Site/Category breakdown period:**
When the user has the period dropdown set to "This week" in the Site or Category
breakdown and clicks a row, the drawer respects that period — shows sessions for
that week, not just today. The selected period is passed as a query param.

---

### 16.3 Drawer Shell Layout

```
┌─────────────────────────────────────┐  ← 420px fixed right
│ {Drawer Title}              [✕]     │  ← header px-6 py-4
│ {N} sessions / {N} sites            │  ← sub-count text-xs text-[#94A3B8]
├─────────────────────────────────────┤  ← border-b #E0F2FE
│ [🔍 Search by site name...]         │  ← search (list drawers only)
├─────────────────────────────────────┤
│                                     │
│  ... rows ...                       │  ← scrollable, flex-1
│                                     │
├─────────────────────────────────────┤
│  Page 1 of 3      [‹]  [›]         │  ← sticky bottom, border-t #E0F2FE
└─────────────────────────────────────┘
```

Search and sort controls are omitted from:
- Single session detail view (one item, nothing to filter)
- Timeline block drawer (30-min window, rarely > 10 sessions)

---

### 16.4 Session Row

Used in: TIME ONLINE, TOP SITE, FOCUS SCORE, LONGEST SESSION, chart bar,
site breakdown, category breakdown, timeline block drawers.

```
┌────────────────────────────────────────────────────────────┐
│ [Logo]  Claude AI                             21m 47s      │
│         claude.ai · 7:54–8:16 AM · ● Productive           │
└────────────────────────────────────────────────────────────┘
```

**Leading visual (left, 40×40):**
Priority order:
1. Brandfetch `domainLogo` — rounded-xl mask, object-contain, light bg
2. `BrowsingCategoryIconBadge` — category icon on tinted rounded-xl ground
3. Globe icon — grey tinted rounded-xl fallback

**Primary text:** `label` from DomainClassification, else domain (strip `www.`)
Inter 500, 14px, `#1E293B`

**Duration:** right-aligned, tabular-nums, Inter 600, 14px, `#0F172A`

**Meta line:** `domain · startTime–endTime · ● productivityType`
Inter 400, 12px, `#94A3B8`
Productivity dot colors:
```
● productive  → #16A34A
● distracting → #DC2626
● neutral     → #94A3B8
```

**Row hover:** `background: #F8FFFE`, 150ms ease-out
**No chevron** in Phase 1 — rows are not further drillable

---

### 16.5 Domain Row (SITES VISITED drawer only)

```
┌────────────────────────────────────────────────────────────┐
│ [Logo]  Claude AI                             26m 51s      │
│         claude.ai · 3 sessions · ● Productive              │
└────────────────────────────────────────────────────────────┘
```

Identical visual structure to Session Row. Only difference:
meta line shows **session count** instead of time range.

---

### 16.6 Single Session Detail View

Triggered by clicking a row in the Recent Activity feed.
No tabs, no pagination, no back button — direct open from the feed.

```
┌─────────────────────────────────────┐
│ Session Detail              [✕]     │
├─────────────────────────────────────┤
│                                     │
│   [Logo — 48×48]                    │
│   Claude AI                         │  ← Inter 600, 16px, #1E293B
│   claude.ai                         │  ← Inter 400, 12px, #94A3B8, mono
│   ● Productive · AI & Tools         │  ← dot + productivityType · category
│                                     │
├─────────────────────────────────────┤
│                                     │
│  DURATION             TIME RANGE    │  ← 2-column grid
│  21m 47s              7:54–8:16 AM  │
│                                     │
│  DATE                               │
│  Today, Mar 22 2026                 │
│                                     │
│  CATEGORY                           │
│  AI & Tools                         │
│                                     │
│  INTERACTIONS                       │
│  12 clicks                          │
│  45 keypresses                      │
│  8 scroll events                    │
│                                     │
└─────────────────────────────────────┘
```

Field labels: `text-xs font-medium uppercase tracking-widest text-[#94A3B8] mb-1`
Field values: `text-sm text-[#334155]`

INTERACTIONS section is only shown when at least one interaction value > 0.
If all interactions are 0, show: `"No interaction data recorded."`

---

### 16.7 FOCUS SCORE Drawer — Summary Header

Rendered between the filter bar and the first session row.
Background: `#F0F9FF`, padding `px-6 py-3`, border-bottom `#E0F2FE`.

```
├─────────────────────────────────────────┤
│  ● Productive     26m 51s      100%     │
│  ● Distracting     0m 0s         0%     │
│  ──────────────────────────────────     │
│  Focus Score                 100/100    │
├─────────────────────────────────────────┤
```

Productive row: green dot `#16A34A`, green time value `#16A34A`
Distracting row: red dot `#DC2626`, red time value `#DC2626`
Focus Score label: `#94A3B8`, value: `#0891B2` (teal)

---

### 16.8 Timeline Block Drawer — Sub-header

When a timeline block is clicked, the drawer header shows the block's time range
and the dominant productivity type as a colored sub-line.

```
┌─────────────────────────────────────┐
│ 6:00 – 6:30 AM Sessions     [✕]    │
│ 2 sessions · ● Productive           │  ← dot color matches block color
├─────────────────────────────────────┤
```

---

### 16.9 Sort Behavior

Sort is fixed by trigger in the current implementation (no sort dropdown in UI):

| Drawer type | Effective sort |
|---|---|
| TIME ONLINE / TOP SITE / CHART BAR / SITE BREAKDOWN / ALL SESSIONS / OTHERS | Newest first |
| FOCUS SCORE / LONGEST SESSION / CATEGORY BREAKDOWN | Longest first |
| TIMELINE BLOCK | Newest first |
| SITES VISITED domain list | Most time first |
| Single session detail | No sort |

---

### 16.10 Empty States

| Drawer | Empty message |
|---|---|
| TODAY'S SESSIONS | "No sessions recorded today yet." |
| SITES VISITED | "No sites visited today yet." |
| TOP SITE sessions | "No sessions for this site today." |
| FOCUS SCORE | "No productive sessions today yet." |
| LONGEST SESSION | "No sessions recorded today yet." |
| Chart bar day | "No sessions recorded on this day." |
| Site breakdown Others | "No sessions for other sites in the selected period." |
| Category sessions | "No sessions in this category for the selected period." |
| Timeline block | "No sessions in this time window." |

---

### 16.11 Visual Comparison — Downloads vs Browsing Drawer

| Element | Downloads Drawer | Browsing Drawer |
|---|---|---|
| Shell | 420px slide-in, backdrop blur | Identical |
| Pagination | 10/page sticky | Identical |
| Row leading visual | File type icon | Brand logo → category badge → Globe |
| Row primary text | Filename (JetBrains Mono) | Site label (Inter 500) |
| Row secondary text | File size | Duration |
| Row meta | Domain + time + badge | Domain + time range + productivity dot |
| Status indicator | NEW / DUP pill badge | ● Productive / Distracting / Neutral dot |
| Detail view | DETAILS + TIMELINE tabs | Single scrollable view, no tabs |
| Unique detail data | Source URL, file path, hash | Interactions (clicks, keypresses, scrolls) |
| Drill-down | List → Detail with back button | None — one level deep always |
| Summary header | None | FOCUS SCORE drawer only |

---

### 16.12 New Components

```
components/features/browsing/
  BrowsingDrawer.tsx              ← drawer shell, manages open state + which trigger
  BrowsingSessionRow.tsx          ← reusable session row (16.4)
  BrowsingDomainRow.tsx           ← domain row for SITES VISITED (16.5)
  BrowsingSessionDetail.tsx       ← single session detail view (16.6)
  FocusScoreSummaryHeader.tsx     ← summary block for FOCUS SCORE drawer (16.7)
  BrowsingDrawerEmptyState.tsx    ← per-drawer empty messages

hooks/
  useBrowsingDrawerSessions.ts    ← paginated React Query, accepts all filter params
```

**Reused from Downloads (zero changes needed):**
```
Drawer backdrop + panel CSS    → FileDetailDrawer.tsx styles
Sticky pagination component    → same pattern
Search input + debounce        → same pattern
Sort dropdown                  → Dropdown.tsx (shared)
```

---

### 16.13 API Requirements

Current implementation supports these drawer params:

```
GET /api/browsing/sessions
  ?page=1                                  ← pagination
  ?limit=10                                ← page size
  ?period=today|week|month|all             ← period filter
  ?date=YYYY-MM-DD                         ← for chart bar + today filter
  ?from=ISO                                ← for timeline block time range
  ?to=ISO                                  ← for timeline block time range
  ?domain=github.com                       ← for TOP SITE + site breakdown
  ?excludeDomains=github.com&excludeDomains=youtube.com
                                            ← for Site breakdown Others
  ?categorySlug=ai-tools                   ← for category breakdown
  ?productivityType=productive             ← for FOCUS SCORE
  ?sort=newest|oldest|longest              ← fixed by trigger (no UI control)
```

SITES VISITED drawer uses `GET /api/browsing/stats/domains?period=today`
endpoint — no changes needed for that drawer.

---

*SurfBud · Browsing Page UI Spec · v1.1 · March 2026*
*Added: Section 16 — Browsing Detail Drawer (full trigger map, row designs, session detail, reusability)*
