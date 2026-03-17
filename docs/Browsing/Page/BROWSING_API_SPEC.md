# SurfBud — Browsing Page API Spec
**Version 1.0 · Phase 1 · March 2026**

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
  slug:             string    // 'development' — unique, URL safe
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
| `social-media` | Social Media | distracting | Users |
| `video` | Video | distracting | Play |
| `music` | Music & Audio | distracting | Music |
| `gaming` | Gaming | distracting | Gamepad2 |
| `shopping` | Shopping | distracting | ShoppingCart |
| `other` | Other | neutral | Globe |

---

### 3.2 DomainClassification

Shared across all users. One document per domain. Powers the domain knowledge base — grows automatically as users browse.

```typescript
interface DomainClassification {
  _id:           ObjectId
  domain:        string    // FULL subdomain: mail.google.com
  label:         string    // 'Gmail'
  description:   string    // 'Email service by Google' — one sentence, from Groq
  categorySlug:  string    // 'communication' — ref: BrowsingCategory.slug
  confidence:    'pending' | 'ai'
  verifiedCount: number    // increments each time any user visits
  classifiedAt:  string | null
  updatedAt:     string
}
```

**Indexes:**
```typescript
DomainClassificationSchema.index({ domain: 1 }, { unique: true })
DomainClassificationSchema.index({ confidence: 1 })  // find pending docs
```

**Confidence states:**
```
pending  → domain seen, Groq not yet called (waiting for hourly batch)
ai       → Groq classified it

Note: user_verified (manual override) is deferred to Phase 2.
      Do not add it to the schema or enum until that feature is built.
```

---

### 3.3 BrowsingSession

Raw session record — one document per completed browsing session. TTL 90 days.

```typescript
interface BrowsingSession {
  _id:    ObjectId
  userId: ObjectId

  // Domain
  domain:           string    // mail.google.com — full subdomain
  label:            string    // 'Gmail'
  categorySlug:     string    // 'communication'
  productivityType: 'productive' | 'distracting' | 'neutral'

  // Time
  startedAt:  string    // ISO — in user's timezone context
  endedAt:    string    // ISO
  activeTime: number    // seconds of actual active time
  timezone:   string    // IANA — user's timezone at session time

  // Metadata
  sessionId:      string    // UUID — generated in extension, for dedup
  isPassive:      boolean   // true for YouTube etc
  isMicro:        boolean   // activeTime < 60s — hidden from feed
  wasContinuous:  boolean   // no domain switches during session
  isMerged:       boolean   // was merged from multiple raw sessions
  mergedFrom:     string[]  // sessionIds merged into this one

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

---

### 3.4 UserBrowsingMetrics

Pre-materialized metrics — one document per user. Never calculated on demand. Updated by BullMQ worker after each batch. Same pattern as `UserDownloadMetrics`.

```typescript
interface UserBrowsingMetrics {
  _id:    ObjectId
  userId: ObjectId   // unique index

  // ─── Today ────────────────────────────────────────────────
  today: {
    totalActiveTime:     number        // seconds
    sitesVisited:        number        // unique domains
    topSite:             string | null // domain
    topSiteLabel:        string | null // 'GitHub'
    topSiteTime:         number        // seconds on top site
    focusScore:          number | null // 0-100 or null if no data
    longestSession:      number        // seconds
    longestSessionStart: string | null // ISO
    longestSessionEnd:   string | null // ISO
    productiveTime:      number        // seconds
    distractingTime:     number        // seconds
    neutralTime:         number        // seconds
    contextSwitches:     number
    deepFocusSessions:   number        // continuous sessions > 30 mins
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

  // ─── Previous periods for delta calculations ──────────────
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
  week:  { totalActiveTime: 0, sitesVisited: 0, focusScore: null,
           productiveTime: 0, distractingTime: 0, neutralTime: 0,
           topSite: null, topSiteLabel: null, topCategorySlug: null,
           longestSession: 0 },
  month: { totalActiveTime: 0, sitesVisited: 0, focusScore: null,
           productiveTime: 0, distractingTime: 0, neutralTime: 0,
           topSite: null, topSiteLabel: null, topCategorySlug: null,
           longestSession: 0 },
  prev:  { todayTotalTime: 0, todayFocusScore: null,
           todaySitesVisited: 0, todayLongestSession: 0,
           todayProductiveTime: 0, weekTotalTime: 0,
           weekFocusScore: null, monthTotalTime: 0,
           monthFocusScore: null }
}
```

---

### 3.5 BrowsingDailyStats

Pre-aggregated daily stats — one document per user per day. Powers the 7/15/30 day chart. Never deleted (keeps full history for long-term trends).

```typescript
interface BrowsingDailyStats {
  _id:    ObjectId
  userId: ObjectId
  date:   string    // 'YYYY-MM-DD' in user's local timezone
  timezone: string  // IANA

  totalActiveTime:   number
  productiveTime:    number
  distractingTime:   number
  neutralTime:       number
  focusScore:        number | null
  sitesVisited:      number
  longestSession:    number
  contextSwitches:   number
  deepFocusSessions: number

  createdAt: string
  updatedAt: string
}
```

**Indexes:**
```typescript
BrowsingDailyStatsSchema.index({ userId: 1, date: -1 })
BrowsingDailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true })
```

---

### 3.6 BrowsingCategoryStats

Pre-aggregated category breakdown per user per day. Powers Section 3 right panel.

```typescript
interface BrowsingCategoryStats {
  _id:         ObjectId
  userId:      ObjectId
  date:        string    // 'YYYY-MM-DD'
  timezone:    string    // IANA
  categorySlug: string   // 'development'

  totalActiveTime:  number
  sitesVisited:     number
  topDomain:        string | null
  topDomainLabel:   string | null
  topDomainTime:    number

  createdAt: string
  updatedAt: string
}
```

**Indexes:**
```typescript
BrowsingCategoryStatsSchema.index({ userId: 1, date: -1 })
BrowsingCategoryStatsSchema.index(
  { userId: 1, date: 1, categorySlug: 1 },
  { unique: true }
)
```

---

### 3.7 BrowsingDomainStats

Pre-aggregated per domain per user per day. Powers Section 3 left panel (top sites).

```typescript
interface BrowsingDomainStats {
  _id:      ObjectId
  userId:   ObjectId
  date:     string    // 'YYYY-MM-DD'
  timezone: string    // IANA

  domain:           string
  label:            string
  categorySlug:     string
  productivityType: 'productive' | 'distracting' | 'neutral'

  totalActiveTime: number
  visitCount:      number
  longestSession:  number

  createdAt: string
  updatedAt: string
}
```

**Indexes:**
```typescript
BrowsingDomainStatsSchema.index({ userId: 1, date: -1 })
BrowsingDomainStatsSchema.index(
  { userId: 1, date: 1, domain: 1 },
  { unique: true }
)
BrowsingDomainStatsSchema.index(
  { userId: 1, date: 1, totalActiveTime: -1 }
)
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

### 5.1 Categories

#### GET /api/browsing/categories
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
      "sortOrder": 2
    }
  ]
}
```

---

### 5.2 Metrics

#### GET /api/browsing/metrics
Returns pre-materialized UserBrowsingMetrics for the authenticated user. Same pattern as `GET /downloads/metrics`.

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

### 5.3 Sessions

#### POST /api/browsing/sessions/batch
Receives a batch of completed sessions from the extension queue.

**Extension push cadence (implemented):**
- Primary schedule: local top-of-hour boundaries (12:00, 1:00, 2:00, ...)
- Alarm anchor: extension local timezone (browser/system timezone)
- Startup/install behavior: immediate flush attempt is also executed
- Alarm handler behavior: re-schedules the next top-of-hour alarm, then flushes
- Retry behavior for transient failures: 2s, 5s, 12s backoff

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
   → Found → use label + categorySlug
   → Not found → create pending record, schedule classification
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
{
  "success": true,
  "data": {
    "accepted": 8,
    "upserted": 6,
    "modified": 2
  }
}
```

---

#### GET /api/browsing/sessions
Paginated list of completed sessions for the authenticated user. Powers the "View all activity" drawer.

**Query params:**
```
page:     number   default 1
limit:    number   default 10, max 50
period:   today|week|month|all   optional
date:     YYYY-MM-DD              optional
from:     ISO datetime            optional (requires to)
to:       ISO datetime            optional (requires from)
domain:   string                  optional
excludeDomains: string[]          optional
categorySlug: string              optional
productivityType: productive|distracting|neutral   optional
sort:     newest|oldest|longest   default newest
```

**Validation rule:** use only one scope selector at a time:
- `period`
- `date`
- `from + to`

---

### 5.4 Chart Data

#### GET /api/browsing/stats/daily
Returns daily stats for the chart. Period: 7, 15, or 30 days.

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

### 5.5 Top Sites

#### GET /api/browsing/stats/domains
Returns top domains for today or a specific date.

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

### 5.6 Category Stats

#### GET /api/browsing/stats/categories
Returns category breakdown for today or a specific date.

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

### 5.7 Recent Activity Feed

#### GET /api/browsing/sessions/recent
Returns recent non-micro completed sessions for the feed.

**Query params:**
```
limit: number   default 10
date:  string   'YYYY-MM-DD' default today
```

Filters: `isMicro: false` only. Sorted by `endedAt` descending.

---

## 6. BullMQ Workers

### 6.1 Browsing Metrics Worker

Triggered after each batch of sessions is saved. Updates all pre-materialized documents atomically.

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

    // All updates atomic — never read-modify-write
    // Always use $inc, $max for race condition safety

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
          'today.focusScore': calculateFocusScore(
            productive, distracting
          ),
          'today.topSite':      topSite.domain,
          'today.topSiteLabel': topSite.label,
          updatedAt: new Date().toISOString()
        },
        $addToSet: {
          // Track unique domains — use Redis set for efficiency
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

```typescript
// api/src/workers/browsing-rollup.worker.ts
// Runs every 30 minutes — same cron as download rollup

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
        'today.totalActiveTime':   0,
        'today.sitesVisited':      0,
        'today.topSite':           null,
        'today.topSiteLabel':      null,
        'today.topSiteTime':       0,
        'today.focusScore':        null,
        'today.longestSession':    0,
        'today.longestSessionStart': null,
        'today.longestSessionEnd':   null,
        'today.productiveTime':    0,
        'today.distractingTime':   0,
        'today.neutralTime':       0,
        'today.contextSwitches':   0,
        'today.deepFocusSessions': 0,
        'today.topCategorySlug':   null,
        updatedAt: new Date().toISOString()
      }
    }
  )
}
```

---

### 6.3 Domain Classification Worker

Runs every 1 hour. Finds all pending domains, batches them into a single Groq call. Skips entirely if no pending domains.

```typescript
// api/src/workers/domain-classification.worker.ts

export const classificationCronWorker = new Worker(
  'domain-classification-cron',
  async () => {
    // Find all pending domains
    const pending = await DomainClassificationModel
      .find({ confidence: 'pending' })
      .lean()

    if (!pending.length) {
      logger.info('No pending domains — skipping Groq call')
      return   // ← skip API call entirely if nothing to classify
    }

    logger.info(`Classifying ${pending.length} domains via Groq`)

    // Single Groq call for all pending domains
    const results = await classifyDomainsWithGroq(
      pending.map(d => d.domain)
    )

    // Update each classified domain
    for (const result of results) {
      // Validate with Zod — skip if invalid category
      const parsed = ClassificationResultSchema.safeParse(result)
      if (!parsed.success) {
        // Retry once with single domain call
        const retry = await classifySingleDomain(result.domain)
        if (!retry) continue  // fallback to Other
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
      - description: one sentence describing what the site does (e.g. "Code hosting and version control platform")
      - categorySlug: exactly one slug from the list above

      Domains:
      ${domains.join('\n')}

      Reply ONLY with valid JSON array:
      [{"domain":"github.com","label":"GitHub","description":"Code hosting and version control platform","categorySlug":"development"}]`
    }],
    max_tokens: domains.length * 50,  // increased — description adds ~20 tokens per domain
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

  // Find most recent session for same domain
  const recent = await BrowsingSessionRepository
    .findMostRecent(userId, incoming.domain)

  if (!recent) {
    // No previous session → create new
    await createSession(userId, incoming, timezone)
    return
  }

  const gap = new Date(incoming.startedAt).getTime() -
              new Date(recent.endedAt).getTime()

  // Check day boundary — never merge across midnight
  const recentDay = getDateString(recent.endedAt, timezone)
  const incomingDay = getDateString(incoming.startedAt, timezone)
  const sameDay = recentDay === incomingDay

  if (gap <= MERGE_GAP_MS && sameDay) {
    // Merge into existing session
    await BrowsingSessionModel.updateOne(
      { _id: recent._id },
      {
        $set: {
          endedAt:     incoming.endedAt,
          isMerged:    true,
          wasContinuous: false,  // interrupted by gap
        },
        $inc: { activeTime: incoming.activeTime },
        $push: { mergedFrom: incoming.sessionId }
      }
    )
  } else {
    // Gap too large or different day → new session
    await createSession(userId, incoming, timezone)
  }
}
```

### 7.2 Context Switch Counting

```typescript
const IGNORED_DOMAINS = new Set([
  'newtab', 'chrome', 'extensions',
  'settings', 'about', 'blank'
])

function isValidDomain(domain: string): boolean {
  // Filter chrome:// about:blank extension:// localhost
  if (IGNORED_DOMAINS.has(domain)) return false
  if (domain.startsWith('192.168.')) return false
  if (domain === 'localhost') return false
  return true
}

function countContextSwitches(sessions: BrowsingSession[]): number {
  return sessions
    .filter(s => isValidDomain(s.domain))
    .filter(s => !s.isMicro)  // micro visits don't count as switches
    .length - 1  // n sessions = n-1 switches
}
```

### 7.3 Deep Focus Sessions

```typescript
const DEEP_FOCUS_THRESHOLD_SECONDS = 30 * 60  // 30 minutes

function countDeepFocusSessions(sessions: BrowsingSession[]): number {
  return sessions.filter(s =>
    s.activeTime >= DEEP_FOCUS_THRESHOLD_SECONDS &&
    s.wasContinuous === true  // must be truly uninterrupted
  ).length
}
```

### 7.4 Duplicate Prevention

```typescript
// Before inserting any session
const existing = await BrowsingSessionModel
  .findOne({ sessionId: incoming.sessionId })
  .lean()

if (existing) {
  logger.info('Duplicate session skipped', { sessionId: incoming.sessionId })
  return  // idempotent — skip silently
}
```

---

## 8. Timezone Handling

**Reuse `date.utils.ts` from Downloads — do not duplicate.**

All timezone-sensitive operations:
```typescript
// Start of today in user's timezone
const startOfToday = getStartOfDay(user.timezone)

// Date string for daily stats
const dateStr = DateTime.now()
  .setZone(user.timezone)
  .toISODate()  // 'YYYY-MM-DD'

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

The `browsing:domain:classified` event allows the dashboard to update category labels in real time without a page refresh — from "Other" to the correct category.

---

## 10. Passive Domains

Hardcoded list — idle detection disabled for these domains:

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
| `GET` | `/browsing/category-catalog` | All active categories (cached) |
| `GET` | `/browsing/categories` | Category stats rows for selected period/date |
| `GET` | `/browsing/domains` | Domain stats rows for selected period/date |
| `GET` | `/browsing/stats` | Pre-materialized user metrics |
| `POST` | `/browsing/sessions/batch` | Receive session batch from extension |
| `GET` | `/browsing/sessions` | Paginated session history |
| `GET` | `/browsing/trend` | Daily trend buckets for chart (7/15/30 days) |
| `GET` | `/browsing/stats/timeline` | 30-min timeline blocks for a date |
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
| 9 | Deep focus + merged sessions | wasContinuous flag required for deep focus |
| 10 | Data retention | TTL index 90 days on BrowsingSession |
| 11 | Extension disabled | chrome.management.onDisabled → flush |
| 12 | Groq invalid category | Zod validation + single retry + Other fallback |
| 13 | Content script blocked | Service worker fallback idle detection |
| 14 | Groq skip if nothing pending | Early return if pending.length === 0 |
| 15 | Browser crash | onSuspend → end session → flush immediately |
| 16 | Incognito | Ignored entirely — never tracked |

---

---

## 13. Browsing Detail Drawer — API Requirements

### 13.1 Overview

The Browsing Detail Drawer requires an extended version of `GET /api/browsing/sessions`
with filter, sort, and pagination params. The current endpoint only supports `limit`.

---

### 13.2 Extended Sessions Endpoint

```
GET /api/browsing/sessions
```

**All query params (add to `BrowsingListQuerySchema` or new schema):**

```typescript
// Zod schema — api/src/schemas/browsing.schemas.ts
export const BrowsingDrawerQuerySchema = z.object({
  page:             z.coerce.number().int().positive().default(1),
  limit:            z.coerce.number().int().positive().max(50).default(10),
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from:             z.string().datetime().optional(),
  to:               z.string().datetime().optional(),
  domain:           z.string().optional(),
  categorySlug:     z.string().optional(),
  productivityType: z.enum(['productive','distracting','neutral']).optional(),
  sort:             z.enum(['newest','oldest','longest']).default('newest'),
  period:           z.enum(['today','week','month','all']).optional(),
})
```

**Filter logic (apply in repository):**

```
date        → filter sessions where startedAt falls within that calendar day (user TZ)
from + to   → filter sessions where startedAt >= from AND endedAt <= to (timeline block)
domain      → filter by exact domain match
categorySlug → join DomainClassification, filter by categorySlug
productivityType → join DomainClassification → BrowsingCategory, filter by productivityType
period      → today / week / month / all (same as existing stats period logic, user TZ)
sort=newest  → sort by startedAt DESC
sort=oldest  → sort by startedAt ASC
sort=longest → sort by durationSeconds DESC
```

**Pagination:**

```
skip = (page - 1) * limit
Return total count for "Page N of M" display
```

**Response envelope:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "...",
        "sessionId": "...",
        "domain": "github.com",
        "startedAt": "...",
        "endedAt": "...",
        "durationSeconds": 600,
        "interactions": { "keypresses": 45, "clicks": 12, "scrollEvents": 8 },
        "label": "GitHub",
        "domainLogo": "https://...",
        "domainColor": "#181717",
        "categorySlug": "development",
        "productivityType": "productive"
      }
    ],
    "total": 24,
    "page": 1,
    "totalPages": 3
  }
}
```

Note: `productivityType` is resolved at read time from `DomainClassification` →
`BrowsingCategory`, same as the existing `getRecent` join logic in
`BrowsingSessionService`. Reuse that join — do not duplicate it.

---

### 13.3 Drawer Trigger → API Param Mapping

| Trigger | Params passed |
|---|---|
| TIME ONLINE card | `period=today&sort=newest` |
| SITES VISITED card | Uses `GET /stats/domains?period=today` — no sessions endpoint needed |
| TOP SITE card | `period=today&domain={topSite}&sort=newest` |
| FOCUS SCORE card | `period=today&productivityType=productive&sort=longest` |
| LONGEST SESSION card | `period=today&sort=longest` |
| Chart bar click | `date=YYYY-MM-DD&sort=newest` |
| Site breakdown row | `domain={domain}&period={selectedPeriod}&sort=newest` |
| Category breakdown row | `categorySlug={slug}&period={selectedPeriod}&sort=longest` |
| Timeline block click | `from={block.startIso}&to={block.endIso}&sort=newest` |
| Recent feed row click | Single session — no sessions endpoint, use existing session data from feed |

---

### 13.4 Single Session Detail

The single session detail view (recent feed row click) does **not** need a new endpoint.
The data is already in the session object returned by `GET /sessions`:

```
durationSeconds  → format to "21m 47s"
startedAt        → format time range "7:54 – 8:16 AM"
startedAt        → format date "Today, Mar 22 2026"
label            → site label
domain           → raw domain
categorySlug     → resolve to category name via BrowsingCategory catalog
productivityType → dot + label
interactions     → { keypresses, clicks, scrollEvents }
```

All fields already present in the `GET /sessions` response — the drawer just renders
the clicked row's data, no additional fetch needed.

---

### 13.5 Implementation Order

```
1. Extend BrowsingListQuerySchema → BrowsingDrawerQuerySchema
2. Update BrowsingSessionRepository.findPaginated() with all filter + sort params
3. Update BrowsingSessionService.getFiltered() to call repository + join classification
4. Update browsing.controller.ts getSessions handler to use new schema
5. Test each drawer trigger with its param combination
6. Frontend: implement BrowsingDrawer.tsx + useBrowsingDrawerSessions.ts hook
```

---

### 13.6 Changelog Addition

| Version | Notes |
|---------|--------|
| 1.3 | Added Section 13 — Browsing Detail Drawer API: extended sessions endpoint, drawer trigger → param mapping, single session detail, implementation order |

---

*SurfBud · Browsing API Spec · v1.3 · March 2026*
*Added: Section 13 — Browsing Detail Drawer API requirements*
