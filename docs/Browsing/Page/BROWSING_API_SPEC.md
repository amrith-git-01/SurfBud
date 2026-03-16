# SurfBud — Browsing Page API Spec
**Version 1.1 · Phase 1 · March 2026**

---

## 1. Overview

This document defines the backend API for the Browsing feature. It covers schema design, API endpoints, BullMQ workers, domain classification, timezone handling, metrics rollup, and extension integration.

```
Base path:  /api/browsing
Auth:       All endpoints require JWT — Authorization: Bearer <token>
Reuse:      Follows exact same patterns as Downloads API
            date.utils.ts · asyncHandler · AppError classes
            Repository → Service → Controller layer rule
            Pre-materialized metrics pattern from Downloads
```

---

## 2. Reusability From Downloads

Before building anything new — reuse these directly from the Downloads feature:

| Reused From | Used For |
|---|---|
| `date.utils.ts` | All timezone calculations — getStartOfDay, getEndOfDay |
| `AppError` classes | NotFoundError, ValidationError, ForbiddenError |
| `asyncHandler` | All route handlers |
| `authenticate` middleware | All browsing routes |
| `validate(schema)` middleware | All routes accepting body |
| `rateLimiter` middleware | All browsing routes |
| `logger` (pino) | All workers and services |
| `redis` connection | Caching categories, classification pending |
| BullMQ queue pattern | Metrics worker, rollup worker, classification worker |
| Midnight rollup pattern | BrowsingDailyStats rollup at user's local midnight |
| `active:timezones` Redis set | Same set — browsing rollup uses it too |

**Critical rule:** Never duplicate any of the above. Import and reuse.

---

## 3. Schema Design

### 3.1 BrowsingCategory

Dynamic category definitions — seeded on first deployment, expandable without code changes.

```typescript
interface BrowsingCategory {
  _id:              ObjectId
  name:             string    // 'Development'
  slug:             string    // 'development' — unique, URL safe, used as FK everywhere
  icon:             string    // lucide-react icon name: 'Code'
  color:            string    // hex: '#7C3AED'
  productivityType: 'productive' | 'distracting' | 'neutral'
  description:      string    // 'Coding, version control, deployment'
  isActive:         boolean   // default: true
  sortOrder:        number    // display order in UI
  createdAt:        string
  updatedAt:        string
}
```

**Indexes:**
```typescript
BrowsingCategorySchema.index({ slug: 1 }, { unique: true })
BrowsingCategorySchema.index({ isActive: 1, sortOrder: 1 })
```

**Why slug as FK (not _id):**
`BrowsingCategory` is a static seeded lookup table — the 20 categories are defined once
at deployment and never change identity. Using slug as the FK gives readable documents,
removes extra round-trips when resolving Groq responses, and makes the extension settings
payload human-readable. `_id` as FK is correct for mutable user-created references.
Slug is correct for immutable configuration tables.

**Seeded categories (20 total):**

| Slug | Name | Productivity | Icon |
|---|---|---|---|
| `productivity` | Productivity | productive | Briefcase |
| `development` | Development | productive | Code |
| `communication` | Communication | productive | MessageSquare |
| `education` | Education & Learning | productive | BookOpen |
| `design` | Design & Creative | productive | Palette |
| `ai-tools` | AI & Tools | productive | Bot |
| `finance` | Finance | productive | DollarSign |
| `reference` | Reference & Research | neutral | Search |
| `news` | News & Media | neutral | Newspaper |
| `health` | Health & Fitness | neutral | Heart |
| `travel` | Travel | neutral | Map |
| `food` | Food & Recipes | neutral | UtensilsCrossed |
| `government` | Government & Legal | neutral | Landmark |
| `religion` | Religion & Spirituality | neutral | Sun |
| `other` | Other | neutral | Globe |
| `social-media` | Social Media | distracting | Users |
| `video` | Video | distracting | Play |
| `music` | Music & Audio | distracting | Music |
| `gaming` | Gaming | distracting | Gamepad2 |
| `shopping` | Shopping | distracting | ShoppingCart |

---

### 3.2 DomainClassification

Shared across all users. One document per domain. Powers the domain knowledge base —
grows automatically as users browse. All classification is done by Groq in an hourly
batch job.

```typescript
interface DomainClassification {
  _id:           ObjectId
  domain:        string              // FULL subdomain: mail.google.com
  label:         string              // 'Gmail'
  description:   string              // 'Email service by Google' — one sentence, from Groq
  categorySlug:  string              // 'communication' — ref: BrowsingCategory.slug
  confidence:    'pending' | 'ai'   // see states below
  verifiedCount: number              // increments each time any user visits this domain
  classifiedAt:  string | null       // ISO — null while pending
  updatedAt:     string
}
```

**Indexes:**
```typescript
DomainClassificationSchema.index({ domain: 1 }, { unique: true })
DomainClassificationSchema.index({ confidence: 1 })  // find all pending docs for hourly batch
```

**Confidence states:**
```
pending  → domain seen for the first time, Groq not yet called
           categorySlug temporarily set to 'other'
           dashboard shows "(being classified...)"

ai       → classified by Groq in the hourly batch job
           label, description, categorySlug all populated

Note: user_verified (manual override) is deferred to Phase 2.
      Do not add it to the schema or enum until that feature is built.
```

---

### 3.3 BrowsingSession

Raw session record — one document per completed browsing session per user. TTL 90 days.

```typescript
interface BrowsingSession {
  _id:    ObjectId
  userId: ObjectId

  // Domain info — resolved from DomainClassification at write time
  domain:           string    // full subdomain: mail.google.com
  label:            string    // 'Gmail'
  categorySlug:     string    // 'communication' — ref: BrowsingCategory.slug
  productivityType: 'productive' | 'distracting' | 'neutral'

  // Time
  startedAt:  string    // ISO
  endedAt:    string    // ISO
  activeTime: number    // seconds of actual active time (excludes idle)
  timezone:   string    // IANA — user's timezone at session time

  // Metadata flags
  sessionId:     string    // UUID — generated in extension, used for dedup
  isPassive:     boolean   // true for YouTube, Netflix, Spotify etc
  isMicro:       boolean   // activeTime < 60s — stored but hidden from feed
  wasContinuous: boolean   // no domain switches interrupted this session
  isMerged:      boolean   // this session absorbed one or more follow-up visits
  mergedFrom:    string[]  // sessionIds merged into this one

  createdAt: string
  updatedAt: string
}
```

**Indexes:**
```typescript
BrowsingSessionSchema.index({ userId: 1, startedAt: -1 })
BrowsingSessionSchema.index({ userId: 1, domain: 1, startedAt: -1 })
BrowsingSessionSchema.index({ userId: 1, categorySlug: 1, startedAt: -1 })
BrowsingSessionSchema.index({ sessionId: 1 }, { unique: true })  // dedup
BrowsingSessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }  // TTL 90 days
)
```

**Key rules enforced at write time:**
- Sessions under 60s → `isMicro: true` — counted in metrics, hidden from UI feed
- Same domain, gap < 5 mins, same calendar day → merge into previous session
- Never merge sessions across midnight (user's local timezone boundary)
- `wasContinuous: false` on any merged session — the gap disqualifies it from deep focus

---

### 3.4 UserBrowsingMetrics

Pre-materialized metrics — one document per user. Never calculated on demand.
Updated atomically by BullMQ worker after each session batch.
Same pattern as `UserDownloadMetrics`.

```typescript
interface UserBrowsingMetrics {
  _id:    ObjectId
  userId: ObjectId

  // ─── Today ────────────────────────────────────────────────
  today: {
    totalActiveTime:     number        // seconds
    sitesVisited:        number        // unique domains today
    topSite:             string | null // domain e.g. 'github.com'
    topSiteLabel:        string | null // 'GitHub'
    topSiteTime:         number        // seconds on top site
    focusScore:          number | null // 0–100, null when no data (show — not 0)
    longestSession:      number        // seconds
    longestSessionStart: string | null // ISO
    longestSessionEnd:   string | null // ISO
    productiveTime:      number        // seconds
    distractingTime:     number        // seconds
    neutralTime:         number        // seconds
    contextSwitches:     number        // domain changes, excludes micro sessions
    deepFocusSessions:   number        // sessions ≥ 30 mins AND wasContinuous = true
    topCategorySlug:     string | null
  }

  // ─── This Week ────────────────────────────────────────────
  week: {
    totalActiveTime:  number
    sitesVisited:     number
    focusScore:       number | null
    productiveTime:   number
    distractingTime:  number
    neutralTime:      number
    topSite:          string | null
    topSiteLabel:     string | null
    topCategorySlug:  string | null
    longestSession:   number
  }

  // ─── This Month ───────────────────────────────────────────
  month: {
    totalActiveTime:  number
    sitesVisited:     number
    focusScore:       number | null
    productiveTime:   number
    distractingTime:  number
    neutralTime:      number
    topSite:          string | null
    topSiteLabel:     string | null
    topCategorySlug:  string | null
    longestSession:   number
  }

  // ─── Previous periods — used for delta arrows on metric cards ─
  prev: {
    todayTotalTime:      number
    todayFocusScore:     number | null
    todaySitesVisited:   number
    todayLongestSession: number
    todayProductiveTime: number
    weekTotalTime:       number
    weekFocusScore:      number | null
    monthTotalTime:      number
    monthFocusScore:     number | null
  }

  updatedAt: string
}
```

**Indexes:**
```typescript
UserBrowsingMetricsSchema.index({ userId: 1 }, { unique: true })
```

**Default document — created on signup:**
```typescript
const defaultBrowsingMetrics = {
  userId,
  today: {
    totalActiveTime: 0, sitesVisited: 0, topSite: null,
    topSiteLabel: null, topSiteTime: 0, focusScore: null,
    longestSession: 0, longestSessionStart: null,
    longestSessionEnd: null, productiveTime: 0,
    distractingTime: 0, neutralTime: 0,
    contextSwitches: 0, deepFocusSessions: 0, topCategorySlug: null
  },
  week: {
    totalActiveTime: 0, sitesVisited: 0, focusScore: null,
    productiveTime: 0, distractingTime: 0, neutralTime: 0,
    topSite: null, topSiteLabel: null, topCategorySlug: null,
    longestSession: 0
  },
  month: {
    totalActiveTime: 0, sitesVisited: 0, focusScore: null,
    productiveTime: 0, distractingTime: 0, neutralTime: 0,
    topSite: null, topSiteLabel: null, topCategorySlug: null,
    longestSession: 0
  },
  prev: {
    todayTotalTime: 0, todayFocusScore: null,
    todaySitesVisited: 0, todayLongestSession: 0,
    todayProductiveTime: 0, weekTotalTime: 0,
    weekFocusScore: null, monthTotalTime: 0,
    monthFocusScore: null
  }
}
```

**Critical rules:**
- `focusScore` is `null` (not 0) when `productiveTime + distractingTime === 0`
- `prev.*` fields written only at midnight rollover — always hold previous period's final value
- All updates use atomic `$inc` / `$set` — never read-modify-write

---

### 3.5 BrowsingDailyStats

One document per user per day. Pre-aggregated daily totals.
Powers the 7/15/30 day trend chart. Never deleted — retained permanently for long-term history.

```typescript
interface BrowsingDailyStats {
  _id:      ObjectId
  userId:   ObjectId
  date:     string    // 'YYYY-MM-DD' in user's local timezone
  timezone: string    // IANA

  totalActiveTime:   number
  productiveTime:    number
  distractingTime:   number
  neutralTime:       number
  focusScore:        number | null
  sitesVisited:      number
  longestSession:    number        // seconds
  contextSwitches:   number
  deepFocusSessions: number

  createdAt: string
  updatedAt: string
}
```

**Indexes:**
```typescript
BrowsingDailyStatsSchema.index({ userId: 1, date: -1 })             // range queries
BrowsingDailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true })  // upsert key
```

---

### 3.6 BrowsingCategoryStats

One document per user per category per day.
Powers the "Time by Category" panel (Section 3 right).

```typescript
interface BrowsingCategoryStats {
  _id:          ObjectId
  userId:       ObjectId
  date:         string    // 'YYYY-MM-DD'
  timezone:     string    // IANA
  categorySlug: string    // ref: BrowsingCategory.slug

  totalActiveTime: number   // seconds in this category today
  sitesVisited:    number   // unique domains in this category today
  topDomain:       string | null
  topDomainLabel:  string | null
  topDomainTime:   number   // seconds on the top domain in this category

  createdAt: string
  updatedAt: string
}
```

**Indexes:**
```typescript
BrowsingCategoryStatsSchema.index({ userId: 1, date: -1 })
BrowsingCategoryStatsSchema.index(
  { userId: 1, date: 1, categorySlug: 1 },
  { unique: true }   // upsert key
)
```

---

### 3.7 BrowsingDomainStats

One document per user per domain per day.
Powers the "Top Sites" panel (Section 3 left).

```typescript
interface BrowsingDomainStats {
  _id:      ObjectId
  userId:   ObjectId
  date:     string    // 'YYYY-MM-DD'
  timezone: string    // IANA

  domain:           string
  label:            string
  categorySlug:     string   // ref: BrowsingCategory.slug
  productivityType: 'productive' | 'distracting' | 'neutral'

  totalActiveTime: number   // seconds on this domain today
  visitCount:      number   // number of sessions on this domain today
  longestSession:  number   // seconds — longest single session today

  createdAt: string
  updatedAt: string
}
```

**Indexes:**
```typescript
BrowsingDomainStatsSchema.index({ userId: 1, date: -1 })
BrowsingDomainStatsSchema.index(
  { userId: 1, date: 1, domain: 1 },
  { unique: true }   // upsert key
)
BrowsingDomainStatsSchema.index(
  { userId: 1, date: 1, totalActiveTime: -1 }   // sorted top-sites query
)
```

---

## Schema Relationship Map

```
BrowsingCategory          ← seeded once, static at runtime, slug is the FK everywhere
      ↑ categorySlug
DomainClassification      ← shared knowledge base, grows as users browse
      ↑ resolved at write time (domain lookup → label + categorySlug)
BrowsingSession           ← raw event log, TTL 90 days
      ↓ aggregated by browsing-metrics.worker after each batch
      ├── UserBrowsingMetrics    ← one doc per user      → metric cards
      ├── BrowsingDailyStats     ← one doc per user/day  → trend chart
      ├── BrowsingCategoryStats  ← one doc per user/category/day → category panel
      └── BrowsingDomainStats    ← one doc per user/domain/day   → top sites
```

---

## 4. Focus Score Formula

```
focusScore = Math.round(
  (productiveTime / (productiveTime + distractingTime)) * 100
)
```

Edge cases:
```typescript
function calculateFocusScore(
  productiveSeconds: number,
  distractingSeconds: number
): number | null {
  const total = productiveSeconds + distractingSeconds
  if (total === 0) return null  // show — on dashboard, not 0
  return Math.round((productiveSeconds / total) * 100)
}
```

```
Only productive + neutral  → focusScore: 100
Only distracting + neutral → focusScore: 0
Only neutral               → focusScore: null → show —
No sessions at all         → focusScore: null → show —
```

---

## 5. API Endpoints

### 5.1 GET /api/browsing/categories

Returns all active categories sorted by sortOrder. Cached in Redis — 1 hour TTL.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "slug": "development",
      "name": "Development",
      "icon": "Code",
      "color": "#7C3AED",
      "productivityType": "productive",
      "description": "Coding, version control, deployment",
      "sortOrder": 2
    }
  ]
}
```

---

### 5.2 GET /api/browsing/metrics

Returns pre-materialized `UserBrowsingMetrics` for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "totalActiveTime": 15780,
      "sitesVisited": 32,
      "topSite": "github.com",
      "topSiteLabel": "GitHub",
      "focusScore": 78,
      "longestSession": 6300,
      "longestSessionStart": "2026-03-16T09:00:00Z",
      "longestSessionEnd": "2026-03-16T10:45:00Z",
      "productiveTime": 9360,
      "distractingTime": 3360,
      "neutralTime": 3060,
      "contextSwitches": 47,
      "deepFocusSessions": 3
    },
    "week": { },
    "month": { },
    "prev": { }
  }
}
```

---

### 5.3 POST /api/browsing/events/batch

Receives batch of completed sessions from extension. Extension flushes every 5 minutes.

**Request body:**
```typescript
{
  sessions: {
    sessionId:  string    // UUID — for dedup
    domain:     string    // full subdomain
    startedAt:  string    // ISO
    endedAt:    string    // ISO
    activeTime: number    // seconds
    isPassive:  boolean
  }[]
}
```

**Processing logic:**
```
For each session in batch:
1. Check sessionId → already exists? Skip (idempotent)
2. Sort all sessions by startedAt (chronological order)
3. Check domain in DomainClassification
   → Found (confidence: ai)  → use label + description + categorySlug
   → Not found               → create pending record, use 'other' temporarily
4. Get productivityType from BrowsingCategory via categorySlug
5. Check session merging:
   → Find recent session same domain same day
   → Gap < 5 mins AND same calendar day (user timezone) → merge
   → Gap > 5 mins OR different day → new session
6. Flag isMicro if activeTime < 60
7. Flag wasContinuous (no domain switches during session)
8. Save BrowsingSession
9. Queue metrics update job → BullMQ
```

**Response:**
```json
{ "success": true, "processed": 8, "skipped": 2 }
```

---

### 5.4 GET /api/browsing/sessions

Paginated session history. Powers the "View all activity" drawer.

**Query params:**
```
page:     number   default 1
limit:    number   default 20, max 50
from:     string   ISO date
to:       string   ISO date
domain:   string   filter by domain
category: string   filter by categorySlug
```

---

### 5.5 GET /api/browsing/sessions/recent

Recent non-micro sessions for the activity feed.

**Query params:**
```
limit: number   default 10
date:  string   'YYYY-MM-DD' default today
```

Filters: `isMicro: false` only. Sorted by `endedAt` descending.

---

### 5.6 GET /api/browsing/stats/daily

Daily stats for the trend chart.

**Query params:**
```
period: 7 | 15 | 30   default 7
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-03-10",
      "totalActiveTime": 14400,
      "productiveTime": 8640,
      "distractingTime": 3600,
      "neutralTime": 2160,
      "focusScore": 71,
      "sitesVisited": 28
    }
  ]
}
```

---

### 5.7 GET /api/browsing/stats/domains

Top domains for today or a specific date. Powers the Top Sites panel.

**Query params:**
```
date:  string   'YYYY-MM-DD' default today
limit: number   default 10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "domain": "github.com",
      "label": "GitHub",
      "categorySlug": "development",
      "productivityType": "productive",
      "totalActiveTime": 4980,
      "visitCount": 3,
      "percentage": 34
    }
  ]
}
```

---

### 5.8 GET /api/browsing/stats/categories

Category breakdown for today or a specific date. Powers the Time by Category panel.

**Query params:**
```
date: string   'YYYY-MM-DD' default today
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "categorySlug": "development",
      "name": "Development",
      "icon": "Code",
      "color": "#7C3AED",
      "productivityType": "productive",
      "totalActiveTime": 7800,
      "sitesVisited": 4,
      "topDomain": "github.com",
      "topDomainLabel": "GitHub",
      "percentage": 47
    }
  ]
}
```

---

## 6. BullMQ Workers

### 6.1 Browsing Metrics Worker

Triggered after each session batch is saved. Updates all four pre-materialized
collections atomically. All operations use `$inc` / `$max` — never read-modify-write.

```typescript
// api/src/workers/browsing-metrics.worker.ts

export const browsingMetricsWorker = new Worker(
  'browsing-metrics',
  async (job) => {
    const { userId, sessions } = job.data

    const user = await UserRepository.findById(userId)
    const timezone = user.timezone   // IANA from User model

    const today = getStartOfDay(timezone)   // reuse date.utils.ts
    const todaySessions = sessions.filter(s =>
      new Date(s.startedAt) >= today
    )

    // Update UserBrowsingMetrics
    await UserBrowsingMetricsModel.updateOne(
      { userId },
      {
        $inc: {
          'today.totalActiveTime':  sumActiveTime(todaySessions),
          'today.productiveTime':   sumByType(todaySessions, 'productive'),
          'today.distractingTime':  sumByType(todaySessions, 'distracting'),
          'today.neutralTime':      sumByType(todaySessions, 'neutral'),
          'today.contextSwitches':  countContextSwitches(todaySessions),
        },
        $max: {
          'today.longestSession': maxSession(todaySessions).activeTime
        },
        $set: {
          'today.focusScore':   calculateFocusScore(productive, distracting),
          'today.topSite':      topSite.domain,
          'today.topSiteLabel': topSite.label,
          updatedAt: new Date().toISOString()
        }
      }
    )

    // Update BrowsingDailyStats (upsert)
    const dateStr = getDateString(timezone)   // 'YYYY-MM-DD'
    await BrowsingDailyStatsModel.updateOne(
      { userId, date: dateStr },
      { $inc: { totalActiveTime: ..., productiveTime: ... } },
      { upsert: true }
    )

    // Update BrowsingCategoryStats (upsert per category)
    for (const [slug, stats] of categoryMap) {
      await BrowsingCategoryStatsModel.updateOne(
        { userId, date: dateStr, categorySlug: slug },
        { $inc: { totalActiveTime: stats.time } },
        { upsert: true }
      )
    }

    // Update BrowsingDomainStats (upsert per domain)
    for (const [domain, stats] of domainMap) {
      await BrowsingDomainStatsModel.updateOne(
        { userId, date: dateStr, domain },
        { $inc: { totalActiveTime: stats.time, visitCount: stats.count } },
        { upsert: true }
      )
    }

    // Push WebSocket delta to dashboard
    io.to(`user:${userId}`).emit('browsing:metrics:updated', {
      type: 'browsing:metrics:updated',
      userId,
      delta: { today: updatedMetrics.today }
    })
  },
  { connection: redis, concurrency: 10 }
)
```

---

### 6.2 Browsing Midnight Rollup Worker

Reuses the same pattern as Downloads rollup. Uses the same `active:timezones` Redis set.
Runs every 30 minutes — same cron as download rollup.

```typescript
// api/src/workers/browsing-rollup.worker.ts

async function rolloverBrowsingMetrics(userId: string): Promise<void> {
  const metrics = await UserBrowsingMetricsRepository.findByUserId(userId)

  await UserBrowsingMetricsModel.updateOne(
    { userId },
    {
      $set: {
        // Save today as prev
        'prev.todayTotalTime':      metrics.today.totalActiveTime,
        'prev.todayFocusScore':     metrics.today.focusScore,
        'prev.todaySitesVisited':   metrics.today.sitesVisited,
        'prev.todayLongestSession': metrics.today.longestSession,
        'prev.todayProductiveTime': metrics.today.productiveTime,

        // Reset today to zero
        'today.totalActiveTime':     0,
        'today.sitesVisited':        0,
        'today.topSite':             null,
        'today.topSiteLabel':        null,
        'today.topSiteTime':         0,
        'today.focusScore':          null,
        'today.longestSession':      0,
        'today.longestSessionStart': null,
        'today.longestSessionEnd':   null,
        'today.productiveTime':      0,
        'today.distractingTime':     0,
        'today.neutralTime':         0,
        'today.contextSwitches':     0,
        'today.deepFocusSessions':   0,
        'today.topCategorySlug':     null,
        updatedAt: new Date().toISOString()
      }
    }
  )
}
```

---

### 6.3 Domain Classification Worker

Runs every 1 hour. Finds all `confidence: 'pending'` domains, batches them into a
single Groq call. Skips entirely if no pending domains — no wasted API calls.

```typescript
// api/src/workers/domain-classification.worker.ts

export const classificationCronWorker = new Worker(
  'domain-classification-cron',
  async () => {
    const pending = await DomainClassificationModel
      .find({ confidence: 'pending' })
      .lean()

    if (!pending.length) {
      logger.info('No pending domains — skipping Groq call')
      return   // ← early return, zero API cost
    }

    logger.info(`Classifying ${pending.length} domains via Groq`)

    const results = await classifyDomainsWithGroq(
      pending.map(d => d.domain)
    )

    for (const result of results) {
      const parsed = ClassificationResultSchema.safeParse(result)
      if (!parsed.success) {
        const retry = await classifySingleDomain(result.domain)
        if (!retry) continue  // fallback stays as 'other'
      }

      await DomainClassificationModel.updateOne(
        { domain: result.domain },
        {
          label:        result.label,
          description:  result.description,
          categorySlug: result.categorySlug,
          confidence:   'ai',
          classifiedAt: new Date().toISOString(),
          updatedAt:    new Date().toISOString()
        }
      )

      // Notify dashboard — update "Other" labels in real time
      io.to(`user:*`).emit('browsing:domain:classified', {
        domain:       result.domain,
        label:        result.label,
        categorySlug: result.categorySlug
      })
    }
  },
  { connection: redis }
)
```

**Groq batch prompt:**
```typescript
async function classifyDomainsWithGroq(
  domains: string[]
): Promise<ClassificationResult[]> {

  const categoryList = await BrowsingCategoryRepository.findAllSlugs()

  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Classify each website domain.
      Return a JSON array only. No explanation. No markdown.

      Categories (use exact slug):
      ${categoryList.join(', ')}

      For each domain provide:
      - domain: exact domain as given
      - label: human readable name (e.g. "GitHub" for github.com)
      - description: one sentence describing what the site does
      - categorySlug: exactly one slug from the list above

      Domains:
      ${domains.join('\n')}

      Reply ONLY with valid JSON array:
      [{"domain":"github.com","label":"GitHub","description":"Code hosting and version control platform","categorySlug":"development"}]`
    }],
    max_tokens: domains.length * 50,  // ~50 tokens per domain including description
    temperature: 0   // deterministic
  })

  const raw = response.choices[0].message.content ?? '[]'

  try {
    return JSON.parse(raw)
  } catch {
    logger.error('Groq returned invalid JSON', { raw })
    return []
  }
}
```

---

## 7. Session Processing Rules

### 7.1 Session Merging

```typescript
async function mergeSessions(
  userId: string,
  incoming: BrowsingSessionPayload,
  timezone: string
): Promise<void> {
  const MERGE_GAP_MS = 5 * 60 * 1000  // 5 minutes

  const recent = await BrowsingSessionRepository
    .findMostRecent(userId, incoming.domain)

  if (!recent) {
    await createSession(userId, incoming, timezone)
    return
  }

  const gap = new Date(incoming.startedAt).getTime() -
              new Date(recent.endedAt).getTime()

  const recentDay   = getDateString(recent.endedAt, timezone)
  const incomingDay = getDateString(incoming.startedAt, timezone)
  const sameDay     = recentDay === incomingDay

  if (gap <= MERGE_GAP_MS && sameDay) {
    await BrowsingSessionModel.updateOne(
      { _id: recent._id },
      {
        $set:  { endedAt: incoming.endedAt, isMerged: true, wasContinuous: false },
        $inc:  { activeTime: incoming.activeTime },
        $push: { mergedFrom: incoming.sessionId }
      }
    )
  } else {
    await createSession(userId, incoming, timezone)
  }
}
```

### 7.2 Context Switch Counting

```typescript
const IGNORED_DOMAINS = new Set([
  'newtab', 'chrome', 'extensions', 'settings', 'about', 'blank'
])

function isValidDomain(domain: string): boolean {
  if (IGNORED_DOMAINS.has(domain)) return false
  if (domain.startsWith('192.168.')) return false
  if (domain === 'localhost') return false
  return true
}

function countContextSwitches(sessions: BrowsingSession[]): number {
  return sessions
    .filter(s => isValidDomain(s.domain))
    .filter(s => !s.isMicro)
    .length - 1   // n sessions = n-1 switches
}
```

### 7.3 Deep Focus Sessions

```typescript
const DEEP_FOCUS_THRESHOLD_SECONDS = 30 * 60  // 30 minutes

function countDeepFocusSessions(sessions: BrowsingSession[]): number {
  return sessions.filter(s =>
    s.activeTime >= DEEP_FOCUS_THRESHOLD_SECONDS &&
    s.wasContinuous === true   // must be truly uninterrupted
  ).length
}
```

### 7.4 Duplicate Prevention

```typescript
const existing = await BrowsingSessionModel
  .findOne({ sessionId: incoming.sessionId })
  .lean()

if (existing) {
  logger.info('Duplicate session skipped', { sessionId: incoming.sessionId })
  return   // idempotent — skip silently
}
```

---

## 8. Timezone Handling

**Reuse `date.utils.ts` from Downloads — do not duplicate.**

```typescript
// Start of today in user's timezone
const startOfToday = getStartOfDay(user.timezone)

// Date string for daily stats
const dateStr = DateTime.now()
  .setZone(user.timezone)
  .toISODate()   // 'YYYY-MM-DD'

// Midnight boundary check for session merging
const sessionDay = DateTime.fromISO(session.startedAt)
  .setZone(user.timezone)
  .toISODate()
```

---

## 9. WebSocket Events

| Event | Payload | Description |
|---|---|---|
| `browsing:metrics:updated` | `{ type, userId, delta }` | Pushed after each batch processed |
| `browsing:domain:classified` | `{ type, userId, domain, label, categorySlug }` | Pushed when Groq classifies a pending domain |

`browsing:domain:classified` allows the dashboard to update "(being classified...)"
labels in real time — from "Other" to the correct category — without a page refresh.

---

## 10. Passive Domains

Hardcoded list — idle detection disabled for these domains. Timer runs continuously.

```typescript
export const PASSIVE_DOMAINS = new Set([
  // Video
  'youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com',
  'disneyplus.com', 'hulu.com', 'primevideo.com',
  'hotstar.com', 'hbomax.com', 'crunchyroll.com',
  // Music
  'spotify.com', 'soundcloud.com', 'music.apple.com',
  'music.youtube.com', 'deezer.com', 'tidal.com',
  // Calls
  'meet.google.com', 'zoom.us', 'teams.microsoft.com', 'whereby.com',
])
```

---

## 11. Endpoint Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/browsing/categories` | All active categories (Redis cached 1h) |
| `GET` | `/browsing/metrics` | Pre-materialized user metrics |
| `POST` | `/browsing/events/batch` | Receive session batch from extension |
| `GET` | `/browsing/sessions` | Paginated session history |
| `GET` | `/browsing/sessions/recent` | Recent activity feed |
| `GET` | `/browsing/stats/daily` | Daily stats for chart (7/15/30 days) |
| `GET` | `/browsing/stats/domains` | Top domains for date |
| `GET` | `/browsing/stats/categories` | Category breakdown for date |

---

## 12. Edge Cases — All Addressed

| # | Issue | Fix |
|---|---|---|
| 1 | Subdomain classification | Full subdomain stored: mail.google.com |
| 2 | Session merging across midnight | Day boundary check using user timezone |
| 3 | Duplicate sessions | sessionId UUID checked before insert |
| 4 | Metrics race condition | Atomic $inc — never read-modify-write |
| 5 | Context switch filtering | IGNORED_DOMAINS set filters chrome:// etc |
| 6 | Multiple tabs same domain | Track by domain not tabId |
| 7 | Focus score no data | Returns null → shown as — on dashboard |
| 8 | Session ordering | Sort by startedAt before processing |
| 9 | Deep focus + merged sessions | wasContinuous flag required |
| 10 | Data retention | TTL index 90 days on BrowsingSession |
| 11 | Extension disabled | chrome.management.onDisabled → flush |
| 12 | Groq invalid category | Zod validation + single retry + Other fallback |
| 13 | Content script blocked | Service worker fallback idle detection |
| 14 | Groq skip if nothing pending | Early return if pending.length === 0 |
| 15 | Browser crash | onSuspend → end session → flush immediately |
| 16 | Incognito | Ignored entirely — never tracked |

---

*SurfBud · Browsing API Spec · v1.1 · March 2026*
*Changes from v1.0: DomainClassification — added description field, trimmed confidence to pending|ai only, deferred user_verified to Phase 2*
