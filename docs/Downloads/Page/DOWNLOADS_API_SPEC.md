# SurfBud — Downloads API Specification

> **Version:** 2.0 — March 2026
> **Base path:** `/api/downloads`
> **Auth:** All routes require `authenticate` middleware (JWT in Authorization header)
> **Architecture:** Repository → Service → Controller → Routes
> **Frontend spec:** See `DOWNLOADS_UI_SPEC.md` for component layout, interactions, and visual design

---

## Pre-computation Strategy

```
PRE-COMPUTED (updated synchronously on every POST /api/downloads):
  UserDownloadMetrics  → todayCount, weekCount, monthCount
                         prevTodayCount, prevWeekCount, prevMonthCount (delta for cards)
                         totalNew, totalDuplicates
                         totalSize, duplicateSize
                         (no categories — see CategoryStats)
  CategoryStats        → separate collection, one doc per userId+category
                         tracks totalCount, newCount, dupCount, totalSize, newSize, dupSize
                         uses FILE_CATEGORIES from file-utils (document, image, text, etc.)
  DomainStats          → separate collection, one doc per userId+domain
                         tracks totalCount, newCount, dupCount, totalSize, newSize, dupSize

ON-DEMAND (live aggregation at request time):
  Trend chart          → GROUP BY date on DownloadEvent, last 7/15/30 days
                         fast enough at current scale (~5ms with indexes)
  Recent feed          → latest 10 DownloadEvents, simple indexed query
  Duplicate groups     → GROUP BY filename on DownloadEvent, limit 20
  Drawer list          → paginated + filtered DownloadEvents

WHY THIS SPLIT:
  Cards + categories + domains → predetermined shape, safe to increment on write
  Trend chart → date-range query, on-demand is clean and fast
  Feed/duplicates/drawer → always need real-time accuracy, live only
```

---

## Architecture Rules

```
Controllers  → extract params from req, call service or repository, return response
               EXCEPTION: read-only metric endpoints call repositories directly
Services     → business logic only, call repositories, never import Models directly
Repositories → raw DB queries only, always use .lean() on reads, no business logic
Models       → schema definitions only, no methods or statics

Error flow   → all async errors bubble via next(err) to Express error handler
Response     → always use ApiSuccess<T> or ApiError envelope (see below)
```

---

## Response Envelope

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, message: string, code?: string }
```

---

## Data Models

### File — `src/models/file.model.ts`
```
Unique file registry — one document per unique file per user (deduplicated by hash)

Fields:
  userId         ObjectId  ref: User   required   index
  hash           string                required
  filename       string                required
  url            string                default ''
  savedPath      string                optional
  size           number                optional   (bytes)
  fileExtension  string                optional   e.g. ".pdf"
  fileCategory   string                optional   from FILE_CATEGORIES (document, image, text, code, executable, archive, audio, video, other)
  mimeType       string                optional
  sourceDomain   string                optional   (domain of first download)
  createdAt      Date                  auto       = firstDownloadedAt
  updatedAt      Date                  auto

Indexes:
  { userId: 1, hash: 1 }         unique   ← core dedup index
  { userId: 1, fileCategory: 1 }
  { userId: 1, sourceDomain: 1 }
```

### DownloadEvent — `src/models/download-event.model.ts`
```
Every download occurrence — including duplicates

Fields:
  userId        ObjectId  ref: User    required   index
  fileId        ObjectId  ref: File    required   index
  filename      string                 required
  sourceDomain  string                 optional   (domain of this download)
  status        string    enum         required   'new' | 'duplicate'
  duration      number                 optional   (ms)
  isRemoved     boolean                default false
  removedAt     Date                   optional
  createdAt     Date                   auto       = downloadedAt
  updatedAt     Date                   auto

Indexes:
  { userId: 1, createdAt: -1 }           ← feed + trend queries
  { userId: 1, status: 1, createdAt: -1 }
  { userId: 1, sourceDomain: 1 }
  { userId: 1, isRemoved: 1 }
  { fileId: 1, createdAt: -1 }
```

### UserDownloadMetrics — `src/models/download-metrics.model.ts`
```
Pre-materialized counts per user.
Updated synchronously on every download. O(1) reads.

Fields:
  userId          ObjectId   unique index   required

  // Time-windowed counts (reset triggers on date change)
  todayCount      number     default 0
  todayDate       string     'YYYY-MM-DD'   ← reset trigger for todayCount
  prevTodayCount  number     default 0      ← yesterday's final count, snapshotted at reset
  weekCount       number     default 0
  weekStart       string     'YYYY-MM-DD'   ← reset trigger (Monday of current week)
  prevWeekCount   number     default 0      ← last week's final count, snapshotted at reset
  monthCount      number     default 0
  monthStart      string     'YYYY-MM-DD'   ← reset trigger (1st of current month)
  prevMonthCount  number     default 0      ← last month's final count, snapshotted at reset

  // All-time totals
  totalNew        number     default 0
  totalDuplicates number     default 0
  totalSize       number     default 0      (bytes — unique files only)
  duplicateSize   number     default 0      (bytes — wasted on duplicates)

  updatedAt   Date   auto

Indexes:
  { userId: 1 }  unique

NOTE: categories[] removed — replaced by CategoryStats collection
NOTE: domains[] removed — replaced by DomainStats collection
NOTE: trend[] removed — trend is computed on-demand
```

### DomainStats — `src/models/domain-stats.model.ts`
```
One document per userId + domain combination.
Updated synchronously on every download. Replaces domains[] array in UserDownloadMetrics.

WHY separate collection instead of embedded array:
  - Domains are unbounded (user can download from any domain)
  - Separate documents allow atomic $inc per domain without rewriting full array
  - Scales cleanly as domain count grows
  - Simple findOne + upsert pattern

Fields:
  userId     ObjectId  ref: User   required
  domain     string               required
  totalCount number    default 0  (all downloads from this domain)
  newCount   number    default 0  (new files from this domain)
  dupCount   number    default 0  (duplicate downloads from this domain)
  newSize    number    default 0  (bytes — size of new files from this domain)
  dupSize    number    default 0  (bytes — size of duplicate files from this domain)
  totalSize  number    default 0  (bytes — newSize + dupSize, total from this domain)
  createdAt  Date      auto
  updatedAt  Date      auto

Indexes:
  { userId: 1, domain: 1 }  unique   ← core lookup index
  { userId: 1, totalCount: -1 }     ← sorted domain list queries
```

### CategoryStats — `src/models/category-stats.model.ts`
```
One document per userId + category combination.
Updated synchronously on every download. Replaces categories[] array in UserDownloadMetrics.

WHY separate collection instead of embedded array:
  - Categories use FILE_CATEGORIES from file-utils (document, image, text, code, executable, archive, audio, video, other)
  - Separate documents allow atomic $inc per category without rewriting full array
  - Scales cleanly as category count grows
  - Same pattern as DomainStats

Fields:
  userId     ObjectId  ref: User   required
  category   string    enum        required   (FILE_CATEGORIES from file-utils)
  totalCount number    default 0
  newCount   number    default 0
  dupCount   number    default 0
  totalSize  number    default 0
  newSize    number    default 0
  dupSize    number    default 0
  createdAt  Date      auto
  updatedAt  Date      auto

Indexes:
  { userId: 1, category: 1 }  unique   ← core lookup index
  { userId: 1, totalCount: -1 }         ← sorted category list queries
```

---

## Repository Layer

### FileRepository — `src/repositories/file.repository.ts`

```typescript
findByHash(userId: string, hash: string): Promise<IFile | null>
  → File.findOne({ userId, hash }).lean()

create(data: CreateFileDto): Promise<IFile>
  → new File(data).save()

findById(userId: string, fileId: string): Promise<IFile | null>
  → File.findOne({ _id: fileId, userId }).lean()

interface CreateFileDto {
  userId:         string
  hash:           string
  filename:       string
  url:            string
  savedPath?:     string
  size?:          number
  fileExtension?: string
  fileCategory?:  string
  mimeType?:      string
  sourceDomain?:  string
}
```

### DownloadEventRepository — `src/repositories/download-event.repository.ts`

```typescript
create(data: CreateDownloadEventDto): Promise<IDownloadEvent>
  → new DownloadEvent(data).save()

findRecent(userId: string, limit: number): Promise<IDownloadEvent[]>
  → DownloadEvent.find({ userId })
     .sort({ createdAt: -1 })
     .limit(limit)
     .populate('fileId', 'fileCategory fileExtension mimeType')
     .lean()

findByUserId(userId: string, options: QueryOptions): Promise<PaginatedResult>
  Build query dynamically:
    match: { userId }
    if options.status   → add status filter
    if options.category → populate fileId, filter by fileCategory
    if options.search   → { filename: new RegExp(search, 'i') }
    if options.period   → add createdAt range (see period logic below)
  → .lean() · skip/limit · countDocuments
  → populate fileId: select 'fileCategory fileExtension mimeType'

  period logic (computed in user's local timezone, not UTC):
    'today' → createdAt >= new Date(toDateString(now, tz) + 'T00:00:00')
    'week'  → createdAt >= new Date(getMondayString(now, tz) + 'T00:00:00')
    'month' → createdAt >= new Date(getMonthStartString(now, tz) + 'T00:00:00')
    'all'   → no date filter

    tz is passed from controller via req.user.timezone ?? 'UTC'

findByFileId(fileId: string, userId: string): Promise<IDownloadEvent[]>
  → DownloadEvent.find({ fileId, userId })
     .sort({ createdAt: -1 }).lean()

markRemoved(eventId: string, userId: string): Promise<IDownloadEvent | null>
  → DownloadEvent.findOneAndUpdate(
      { _id: eventId, userId },
      { isRemoved: true, removedAt: new Date() },
      { new: true }
    )

getDuplicateGroups(userId: string): Promise<DuplicateGroup[]>
  Aggregate on DownloadEvent:
    $match:   { userId, status: 'duplicate' }
    $group:   { _id: '$filename', dupCount: { $sum: 1 }, fileId: { $first: '$fileId' } }
    $lookup:  join File on fileId → get size
    $project: filename, dupCount, totalSize: dupCount * size
    $sort:    { dupCount: -1 }
    $limit:   20

getTrend(userId: string, days: number): Promise<TrendBucket[]>
  Aggregate on DownloadEvent:
    $match:  { userId, createdAt: { $gte: startOfDay(daysAgo(days)) } }
    $group:  {
      _id:        { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
      total:      { $sum: 1 }
      newFiles:   { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } }
      duplicates: { $sum: { $cond: [{ $eq: ['$status', 'duplicate'] }, 1, 0] } }
    }
    $sort:  { _id: 1 }
  Returns array of { date, total, newFiles, duplicates }
  NOTE: fills missing dates with zero buckets in service layer

interface QueryOptions {
  page:      number
  limit:     number
  status?:   'new' | 'duplicate'
  category?: string
  search?:   string
  period?:   'today' | 'week' | 'month' | 'all'
}

interface PaginatedResult {
  events: IDownloadEvent[]
  total:  number
}

interface DuplicateGroup {
  filename:  string
  dupCount:  number
  totalSize: number
}

interface TrendBucket {
  date:       string   // 'YYYY-MM-DD'
  total:      number
  newFiles:   number
  duplicates: number
}
```

### DownloadMetricsRepository — `src/repositories/download-metrics.repository.ts`

```typescript
findByUserId(userId: string): Promise<IUserDownloadMetrics | null>
  → UserDownloadMetrics.findOne({ userId }).lean()

upsert(userId: string, update: object): Promise<void>
  → UserDownloadMetrics.findOneAndUpdate(
      { userId },
      update,           // pre-built MongoDB update object from service
      { upsert: true, new: true }
    )
  The repository only executes the update.
  The service builds the full MongoDB update object ($set, $inc, etc.)
  This keeps MongoDB operators out of the service layer.
```

### DomainStatsRepository — `src/repositories/domain-stats.repository.ts`

```typescript
findByUserId(userId: string, limit?: number): Promise<IDomainStats[]>
  → DomainStats.find({ userId })
     .sort({ totalCount: -1 })
     .limit(limit ?? 50)
     .lean()

upsertOnDownload(
  userId: string,
  domain: string,
  status: 'new' | 'duplicate',
  size:   number
): Promise<void>
  → DomainStats.findOneAndUpdate(
      { userId, domain },
      {
        $inc: {
          totalCount: 1,
          newCount:  status === 'new'       ? 1 : 0,
          dupCount:  status === 'duplicate' ? 1 : 0,
          newSize:   status === 'new'       ? (size ?? 0) : 0,
          dupSize:   status === 'duplicate' ? (size ?? 0) : 0,
          totalSize: size ?? 0,
        }
      },
      { upsert: true }
    )
  Single atomic operation — no read before write needed
```

---

## Service Layer

### DownloadMetricsService — `src/services/download-metrics.service.ts`

```typescript
updateOnDownload(
  userId: string,
  file:   IFile,
  status: 'new' | 'duplicate'
): Promise<void>

Step 1 — Fetch user timezone + compute period strings in user-local time
  user       = await UserRepository.findById(userId)
  tz         = user?.timezone ?? 'UTC'             // IANA name e.g. 'Asia/Kolkata'
  today      = toDateString(new Date(), tz)        // 'YYYY-MM-DD' in user's local date
  weekStart  = getMondayString(new Date(), tz)     // Monday of this week in user's tz
  monthStart = getMonthStartString(new Date(), tz) // 1st of this month in user's tz

Step 2 — Fetch existing metrics
  existing = await DownloadMetricsRepository.findByUserId(userId)

Step 3 — Handle period resets + snapshot outgoing counts
  resetToday  = existing?.todayDate  !== today
  resetWeek   = existing?.weekStart  !== weekStart
  resetMonth  = existing?.monthStart !== monthStart

  When a period resets, existing.todayCount IS yesterday's total — snapshot it.
  prevXxxCount fields are ONLY written at reset. Between resets they stay unchanged.

Step 4 — Call DownloadMetricsRepository.upsert with update object:
  {
    $set: {
      todayDate,
      weekStart,
      monthStart,
      updatedAt:  new Date(),
      // On reset: start count at 1 AND snapshot outgoing count into prev field
      ...(resetToday  ? { todayCount: 1,  prevTodayCount:  existing?.todayCount  ?? 0 } : {}),
      ...(resetWeek   ? { weekCount: 1,   prevWeekCount:   existing?.weekCount   ?? 0 } : {}),
      ...(resetMonth  ? { monthCount: 1,  prevMonthCount:  existing?.monthCount  ?? 0 } : {}),
    },
    $inc: {
      // Only increment if NOT resetting (reset already set the value to 1 above)
      ...(resetToday  ? {} : { todayCount: 1 }),
      ...(resetWeek   ? {} : { weekCount: 1 }),
      ...(resetMonth  ? {} : { monthCount: 1 }),
      totalNew:        status === 'new'       ? 1 : 0,
      totalDuplicates: status === 'duplicate' ? 1 : 0,
      totalSize:       status === 'new'       ? (file.size ?? 0) : 0,
      duplicateSize:   status === 'duplicate' ? (file.size ?? 0) : 0,
    }
  }

Step 5 — Update DomainStats atomically
  await DomainStatsRepository.upsertOnDownload(
    userId,
    file.sourceDomain ?? 'unknown',
    status,
    file.size ?? 0
  )

Step 6 — Update CategoryStats atomically
  await CategoryStatsRepository.upsertOnDownload(
    userId,
    file.fileCategory ?? 'other',
    status,
    file.size ?? 0
  )

Helper functions — src/utils/date.utils.ts (shared across service + cron worker):

  toDateString(date: Date, timezone: string = 'UTC'): string
    → Intl.DateTimeFormat('en-CA', { timeZone: timezone, year, month, day }).format(date)
    → en-CA locale produces YYYY-MM-DD natively — no string parsing needed

  getMondayString(date: Date, timezone: string = 'UTC'): string
    → get local date string via toDateString, parse to local Date, walk back to Monday
    → returns YYYY-MM-DD of Monday in user's timezone

  getMonthStartString(date: Date, timezone: string = 'UTC'): string
    → get local date string via toDateString, replace day with '01'
    → returns YYYY-MM-DD of 1st of month in user's timezone

  getTimezonesAtMidnight(windowMinutes: number = 30): string[]
    → reads active:timezones from Redis (cached distinct user timezones)
    → filters to only zones where local hour === 0 and minute <= windowMinutes
    → uses formatToParts — no locale-dependent string parsing
    → returns only timezones currently within windowMinutes after their midnight
    → ONLY after midnight (h === 0) — never resets before day is over
```

### DownloadService — `src/services/download.service.ts`

```typescript
processDownload(userId: string, payload: DownloadPayload): Promise<ProcessResult>

  Step 1 — Check for existing file
    existingFile = await FileRepository.findByHash(userId, payload.hash)
    NOTE: if payload.hash is null → always treat as 'new' (edge case: auth-gated URLs)

  Step 2 — Determine status
    status = existingFile ? 'duplicate' : 'new'

  Step 3 — Create File if new
    if (!existingFile):
      file = await FileRepository.create({ userId, ...payload })
    else:
      file = existingFile

  Step 4 — Create DownloadEvent
    event = await DownloadEventRepository.create({
      userId,
      fileId:       file._id,
      filename:     payload.filename,
      sourceDomain: payload.sourceDomain,
      status,
      duration:     payload.duration,
    })

  Step 5 — Update metrics synchronously
    await DownloadMetricsService.updateOnDownload(userId, file, status)

  Step 6 — Return
    return { event, file, isDuplicate: status === 'duplicate' }

markRemoved(userId: string, eventId: string): Promise<IDownloadEvent>
  event = await DownloadEventRepository.markRemoved(eventId, userId)
  if (!event) throw new NotFoundError('Download event not found')
  return event

interface DownloadPayload {
  hash:          string | null
  filename:      string
  url:           string
  size:          number
  mimeType:      string
  fileExtension: string
  fileCategory:  string
  sourceDomain:  string
  duration:      number
  savedPath?:    string
}

interface ProcessResult {
  event:       IDownloadEvent
  file:        IFile
  isDuplicate: boolean
}
```

---

## Zod Schemas — `src/schemas/download.schemas.ts`

```typescript
// POST /api/downloads
const ProcessDownloadSchema = z.object({
  hash:          z.string().nullable(),
  filename:      z.string().min(1),
  url:           z.string().default(''),
  size:          z.number().nonnegative().default(0),
  mimeType:      z.string().default(''),
  fileExtension: z.string().default(''),
  fileCategory:  z.string().default('Other'),
  sourceDomain:  z.string().default(''),
  duration:      z.number().nonnegative().default(0),
  savedPath:     z.string().optional(),
})

// GET /api/downloads/trend
const TrendQuerySchema = z.object({
  period: z.enum(['7', '15', '30']).default('7'),
})

// GET /api/downloads/events
const EventsQuerySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(50).default(10),
  status:   z.enum(['new', 'duplicate']).optional(),
  category: z.string().optional(),
  search:   z.string().optional(),
  period:   z.enum(['today', 'week', 'month', 'all']).default('all'),
})
```

---

## Controller — `src/controllers/download.controller.ts`

All methods: validate → call service/repository → return ApiSuccess

```typescript
processDownload(req, res, next)
  body   = ProcessDownloadSchema.parse(req.body)
  result = await DownloadService.processDownload(req.user.id, body)
  return res.status(201).json({ success: true, data: result })

markRemoved(req, res, next)
  event = await DownloadService.markRemoved(req.user.id, req.params.id)
  return res.json({ success: true, data: { event } })

getStats(req, res, next)
  // Reads UserDownloadMetrics directly — pure read, no business logic
  metrics = await DownloadMetricsRepository.findByUserId(req.user.id)
  return res.json({ success: true, data: { metrics } })

getTrend(req, res, next)
  // On-demand aggregation — fast with indexes
  { period } = TrendQuerySchema.parse(req.query)
  trend      = await DownloadEventRepository.getTrend(req.user.id, Number(period))
  return res.json({ success: true, data: { trend } })

getRecentEvents(req, res, next)
  // Fixed 10-item snapshot for Section 4
  events = await DownloadEventRepository.findRecent(req.user.id, 10)
  return res.json({ success: true, data: { events } })

getEvents(req, res, next)
  // Paginated + filtered — for Drawer List Mode
  options = EventsQuerySchema.parse(req.query)
  result  = await DownloadEventRepository.findByUserId(req.user.id, options)
  return res.json({ success: true, data: result })

getDuplicateGroups(req, res, next)
  groups = await DownloadEventRepository.getDuplicateGroups(req.user.id)
  return res.json({ success: true, data: { groups } })

getCategories(req, res, next)
  // Reads pre-computed categories from CategoryStats collection
  categories = await CategoryStatsRepository.findByUserId(req.user.id)
  return res.json({ success: true, data: { categories } })

getDomains(req, res, next)
  // Reads pre-computed DomainStats collection
  domains = await DomainStatsRepository.findByUserId(req.user.id)
  return res.json({ success: true, data: { domains } })

getFileById(req, res, next)
  file = await FileRepository.findById(req.user.id, req.params.id)
  if (!file) throw new NotFoundError('File not found')
  return res.json({ success: true, data: { file } })

getFileTimeline(req, res, next)
  events = await DownloadEventRepository.findByFileId(req.params.id, req.user.id)
  return res.json({ success: true, data: { events } })
```

---

## Routes — `src/routes/download.routes.ts`

All routes protected by `authenticate` middleware.

```
POST   /api/downloads                        processDownload
PATCH  /api/downloads/:id/remove             markRemoved

GET    /api/downloads/stats                  getStats
GET    /api/downloads/trend                  getTrend          ?period=7|15|30
GET    /api/downloads/recent                 getRecentEvents   (fixed 10, no params)
GET    /api/downloads/events                 getEvents         ?page&limit&status&category&search&period
GET    /api/downloads/duplicates             getDuplicateGroups
GET    /api/downloads/categories             getCategories
GET    /api/downloads/domains                getDomains

GET    /api/downloads/files/:id              getFileById
GET    /api/downloads/files/:id/timeline     getFileTimeline
```

---

## Error Handling

```
NotFoundError   → 404  { success: false, message: '...', code: 'NOT_FOUND' }
ValidationError → 400  { success: false, message: '...', code: 'VALIDATION_ERROR' }
                        thrown by Zod .parse() on bad request body/query
AuthError       → 401  { success: false, message: 'Unauthorized' }
                        thrown by authenticate middleware
ServerError     → 500  { success: false, message: 'Internal server error' }

All controllers pass errors to next(err) — never catch and swallow.
Global error handler in src/middleware/errorHandler.ts maps to correct HTTP status.
```

---

## File Map

```
src/
├── models/
│   ├── file.model.ts
│   ├── download-event.model.ts
│   ├── download-metrics.model.ts
│   ├── domain-stats.model.ts
│   └── category-stats.model.ts
├── repositories/
│   ├── file.repository.ts
│   ├── download-event.repository.ts
│   ├── download-metrics.repository.ts
│   ├── domain-stats.repository.ts
│   └── category-stats.repository.ts
├── services/
│   ├── download.service.ts
│   └── download-metrics.service.ts
├── controllers/
│   └── download.controller.ts
├── routes/
│   └── download.routes.ts
└── schemas/
    └── download.schemas.ts
```

---

## Implementation Order

```
1. domain-stats.model.ts
2. category-stats.model.ts
3. download-metrics.model.ts      ← remove trend[], domains[], categories[]
4. file.repository.ts
5. download-event.repository.ts
6. download-metrics.repository.ts
7. domain-stats.repository.ts
8. category-stats.repository.ts
9. download-metrics.service.ts    ← add DomainStats + CategoryStats calls
10. download.service.ts
11. download.controller.ts
12. download.schemas.ts
13. download.routes.ts
```

---

## Cross-Reference: Frontend

All endpoints in this spec are consumed by components documented in `DOWNLOADS_UI_SPEC.md`.

| Endpoint | Consumed By | Strategy |
|----------|-------------|----------|
| `GET /api/downloads/stats` | Section 1 (Cards) + Section 3 (Health Bars) | Pre-computed — O(1) |
| `GET /api/downloads/trend?period=N` | Section 2 (Activity Chart) | On-demand aggregation |
| `GET /api/downloads/recent` | Section 4 (Recent Feed) | Live query — latest 10 |
| `GET /api/downloads/events` | Drawer List Mode | Live — paginated + filtered |
| `GET /api/downloads/duplicates` | Section 5 (Duplicate Groups) | Live aggregation — limit 20 |
| `GET /api/downloads/categories` | Section 6 left panel | Pre-computed — O(1) |
| `GET /api/downloads/domains` | Section 6 right panel | Pre-computed — O(1) |
| `GET /api/downloads/files/:id` | Drawer DETAILS tab | Live — single doc |
| `GET /api/downloads/files/:id/timeline` | Drawer TIMELINE tab | Live — by fileId |
| `POST /api/downloads` | Chrome extension only | — |
| `PATCH /api/downloads/:id/remove` | Chrome extension only | — |

### Write Path — What Happens on Every Download
```
POST /api/downloads
  1. FileRepository.findByHash()             check duplicate
  2. FileRepository.create()                 if new file
  3. DownloadEventRepository.create()        always
  4. DownloadMetricsService.updateOnDownload()
       → upserts UserDownloadMetrics         cards (today/week/month/total/wasted)
       → upserts DomainStats                 domain breakdown
       → upserts CategoryStats               category breakdown
```

### Read Path — Pre-computed vs On-demand
```
O(1) reads (pre-computed on write):
  /stats       → UserDownloadMetrics (one document)
  /categories  → CategoryStats (one doc per category, sorted by totalCount)
  /domains     → DomainStats (one doc per domain, sorted by totalCount)

On-demand aggregation (fast with indexes):
  /trend       → GROUP BY date on DownloadEvent (~5ms at current scale)
  /duplicates  → GROUP BY filename on DownloadEvent (limit 20)

Live indexed queries:
  /recent      → latest 10 DownloadEvents (single index scan)
  /events      → paginated DownloadEvents (indexed, filtered)
  /files/:id   → single File document
  /files/:id/timeline → DownloadEvents by fileId
```

---

## Infrastructure — Redis + BullMQ

### Redis Setup

```
Local dev   → Docker container (localhost:6379)
Production  → AWS ElastiCache (same VPC as EC2/ECS — private network, ~0.1ms latency)
```

**docker-compose.yml** (repo root):
```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: surfbud-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
```

**src/config/redis.ts**:
```typescript
import { Redis } from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,   // required by BullMQ — do not remove
  enableReadyCheck:     false,  // required by BullMQ — do not remove
  lazyConnect:          true,
})
```

### BullMQ Queues — src/jobs/queues.ts

All async jobs use BullMQ — one system, uniform pattern.

```typescript
export const QUEUE_NAMES = {
  AI_INSIGHTS:    'ai-insights',
  METRICS_ROLLUP: 'metrics-rollup',
  STREAK_CHECK:   'streak-check',
  EMAIL_DIGEST:   'email-digest',
} as const

const defaultJobOptions = {
  attempts:         3,
  backoff:          { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 50  },
}

export const metricsRollupQueue = new Queue(QUEUE_NAMES.METRICS_ROLLUP, { connection: redis, defaultJobOptions })
// ... other queues
```

### Metrics Rollup Cron — Design

Runs every 30 minutes. Only processes users whose timezone is currently within
30 minutes after their local midnight. Most runs do zero DB work.

**Why 30 minutes:**
All UTC offsets in the world are multiples of 30 minutes (e.g. UTC+5:30, UTC+5:45, UTC+9:30).
Running every 30 minutes guarantees every timezone is caught within one window of their midnight.
Running hourly would miss offsets like UTC+5:30 if the timing doesn't align.

**Why only AFTER midnight (h === 0):**
We never reset before the user's day is over. The window is 00:00–00:30 only, never 23:30–23:59.

**Active timezone cache in Redis:**
Instead of checking all ~600 IANA timezones every run, we maintain a Redis key
`active:timezones` containing only the distinct timezones our users are actually in.
Built at startup, updated when a new user registers with a new timezone.
Reduces Intl calls from ~600 to N (where N = distinct user timezones in your DB).

### Metrics Rollup — src/jobs/scheduler.ts

```typescript
export async function startScheduler(): Promise<void> {
  // Build active timezone cache on startup
  const zones = await User.distinct('timezone')
  await redis.set('active:timezones', JSON.stringify(zones))

  // Clear stale schedules — prevents duplicates on redeploy
  const existing = await metricsRollupQueue.getRepeatableJobs()
  for (const job of existing) {
    await metricsRollupQueue.removeRepeatableByKey(job.key)
  }

  // One job, registered once, never changes
  await metricsRollupQueue.add(
    'metrics-rollup',
    {},
    {
      repeat: { pattern: '*/30 * * * *' },  // every 30 minutes
      jobId:  'metrics-rollup',
    }
  )
}
```

### Metrics Rollup — src/jobs/workers/metrics-rollup.worker.ts

```typescript
export const metricsRollupWorker = new Worker(
  QUEUE_NAMES.METRICS_ROLLUP,
  async () => {
    // Step 1 — which of our user timezones are at midnight right now?
    const activeZones: string[] = JSON.parse(
      await redis.get('active:timezones') ?? '[]'
    )
    const midnightZones = activeZones.filter(tz => isAtMidnight(tz))
    if (midnightZones.length === 0) return   // most runs exit here — zero DB calls

    // Step 2 — users in those timezones
    const users = await User.find(
      { timezone: { $in: midnightZones } },
      { _id: 1, timezone: 1 }
    ).lean()
    if (users.length === 0) return

    const userIds     = users.map(u => u._id)
    const timezoneMap = Object.fromEntries(
      users.map(u => [u._id.toString(), u.timezone])
    )

    // Step 3 — their metrics docs
    const metricsDocs = await UserDownloadMetrics.find(
      { userId: { $in: userIds } }
    ).lean()
    if (metricsDocs.length === 0) return

    // Step 4 — build bulk ops, one per stale doc
    const bulkOps = metricsDocs.map(doc => {
      const tz         = timezoneMap[doc.userId.toString()] ?? 'UTC'
      const today      = toDateString(new Date(), tz)
      const weekStart  = getMondayString(new Date(), tz)
      const monthStart = getMonthStartString(new Date(), tz)
      const set: Record<string, unknown> = { updatedAt: new Date() }

      if (doc.todayDate !== today) {
        set.prevTodayCount = doc.todayCount
        set.todayCount     = 0
        set.todayDate      = today
      }
      if (doc.weekStart !== weekStart) {
        set.prevWeekCount = doc.weekCount
        set.weekCount     = 0
        set.weekStart     = weekStart
      }
      if (doc.monthStart !== monthStart) {
        set.prevMonthCount = doc.monthCount
        set.monthCount     = 0
        set.monthStart     = monthStart
      }

      return { updateOne: { filter: { _id: doc._id }, update: { $set: set } } }
    })

    // Step 5 — one bulkWrite round trip
    await UserDownloadMetrics.bulkWrite(bulkOps, { ordered: false })

    logger.info('metrics-rollup complete', {
      zonesProcessed: midnightZones.length,
      usersProcessed: metricsDocs.length,
    })
  },
  { connection: redis, concurrency: 1 }
)

// isAtMidnight — only catches the 30-min window AFTER midnight
function isAtMidnight(tz: string, windowMinutes: number = 30): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).formatToParts(new Date())

  const h = Number(parts.find(p => p.type === 'hour')?.value   ?? '99')
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? '99')

  return h === 0 && m <= windowMinutes
}
```

### Active Timezone Cache — When to Update

```
1. App startup        → User.distinct('timezone') → redis.set('active:timezones', ...)
2. User registers     → if timezone not in cache → push and re-save
3. User updates tz    → rebuild cache (future — not needed Phase 1)
```

Update on registration (in auth.service.ts or auth.controller.ts):
```typescript
const cached: string[] = JSON.parse(await redis.get('active:timezones') ?? '[]')
if (!cached.includes(timezone)) {
  cached.push(timezone)
  await redis.set('active:timezones', JSON.stringify(cached))
}
```

### Startup Order — src/app.ts

```typescript
await redis.connect()    // 1. Redis first
await connectDB()        // 2. MongoDB second
await startScheduler()   // 3. Build timezone cache + register BullMQ jobs
                         // 4. Workers auto-connect on import
```
