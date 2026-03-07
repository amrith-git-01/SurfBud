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
                         totalNew, totalDuplicates
                         totalSize, duplicateSize
                         categories[]  (predetermined list, safe to pre-compute)
  DomainStats          → separate collection, one doc per userId+domain
                         tracks total, newCount, dupCount, size per domain

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
  fileCategory   string                optional   e.g. "PDF"
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
  weekCount       number     default 0
  weekStart       string     'YYYY-MM-DD'   ← reset trigger (Monday of current week)
  monthCount      number     default 0
  monthStart      string     'YYYY-MM-DD'   ← reset trigger (1st of current month)

  // All-time totals
  totalNew        number     default 0
  totalDuplicates number     default 0
  totalSize       number     default 0      (bytes — unique files only)
  duplicateSize   number     default 0      (bytes — wasted on duplicates)

  // File category breakdown (predetermined list, pre-computed)
  categories: [{
    name    string   'PDF' | 'Word' | 'Spreadsheet' | 'Presentation' | 'Image'
                     | 'Video' | 'Audio' | 'Archive' | 'Code' | 'Other'
    count   number
    size    number   (bytes)
  }]

  updatedAt   Date   auto

Indexes:
  { userId: 1 }  unique

NOTE: domains[] removed from this model — replaced by DomainStats collection
NOTE: trend[] removed from this model — trend is computed on-demand
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
  total      number    default 0  (all downloads from this domain)
  newCount   number    default 0  (new files from this domain)
  dupCount   number    default 0  (duplicate downloads from this domain)
  size       number    default 0  (bytes — total size from this domain)
  createdAt  Date      auto
  updatedAt  Date      auto

Indexes:
  { userId: 1, domain: 1 }  unique   ← core lookup index
  { userId: 1, total: -1 }           ← sorted domain list queries
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

  period logic:
    'today' → createdAt >= start of today (midnight UTC)
    'week'  → createdAt >= Monday of current week (midnight UTC)
    'month' → createdAt >= 1st of current month (midnight UTC)
    'all'   → no date filter

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
     .sort({ total: -1 })
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
          total:    1,
          newCount: status === 'new'       ? 1 : 0,
          dupCount: status === 'duplicate' ? 1 : 0,
          size:     size ?? 0,
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

Step 1 — Compute period strings
  today      = toDateString(new Date())        // 'YYYY-MM-DD'
  weekStart  = getMondayString(new Date())     // 'YYYY-MM-DD' of this Monday
  monthStart = getMonthStartString(new Date()) // 'YYYY-MM-DD' of 1st

Step 2 — Fetch existing metrics
  existing = await DownloadMetricsRepository.findByUserId(userId)

Step 3 — Build categories array update
  Find bucket where name === file.fileCategory (default: 'Other')
  If found:  increment count, add file.size
  If not:    push new bucket { name, count: 1, size: file.size }

Step 4 — Handle period resets
  resetToday  = existing?.todayDate  !== today
  resetWeek   = existing?.weekStart  !== weekStart
  resetMonth  = existing?.monthStart !== monthStart

Step 5 — Call DownloadMetricsRepository.upsert with update object:
  {
    $set: {
      todayDate,
      weekStart,
      monthStart,
      categories: updatedCategories,
      updatedAt:  new Date(),
      ...(resetToday  ? { todayCount: 1 }  : {}),
      ...(resetWeek   ? { weekCount: 1 }   : {}),
      ...(resetMonth  ? { monthCount: 1 }  : {}),
    },
    $inc: {
      ...(resetToday  ? {} : { todayCount: 1 }),
      ...(resetWeek   ? {} : { weekCount: 1 }),
      ...(resetMonth  ? {} : { monthCount: 1 }),
      totalNew:        status === 'new'       ? 1 : 0,
      totalDuplicates: status === 'duplicate' ? 1 : 0,
      totalSize:       status === 'new'       ? (file.size ?? 0) : 0,
      duplicateSize:   status === 'duplicate' ? (file.size ?? 0) : 0,
    }
  }

Step 6 — Update DomainStats atomically
  await DomainStatsRepository.upsertOnDownload(
    userId,
    file.sourceDomain ?? 'unknown',
    status,
    file.size ?? 0
  )

Helper functions (private):
  toDateString(date: Date): string
    → date.toISOString().split('T')[0]

  getMondayString(date: Date): string
    → find Monday of the week containing date → toDateString

  getMonthStartString(date: Date): string
    → `${date.getFullYear()}-${pad(date.getMonth()+1)}-01`
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
  // Reads pre-computed categories from UserDownloadMetrics
  metrics = await DownloadMetricsRepository.findByUserId(req.user.id)
  return res.json({ success: true, data: { categories: metrics?.categories ?? [] } })

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
│   └── domain-stats.model.ts              ← new
├── repositories/
│   ├── file.repository.ts
│   ├── download-event.repository.ts
│   ├── download-metrics.repository.ts
│   └── domain-stats.repository.ts         ← new
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
1. domain-stats.model.ts          ← new model
2. download-metrics.model.ts      ← updated: remove trend[], remove domains[]
3. file.repository.ts             ← unchanged
4. download-event.repository.ts   ← add getTrend() + findRecent()
5. download-metrics.repository.ts ← unchanged
6. domain-stats.repository.ts     ← new: findByUserId + upsertOnDownload
7. download-metrics.service.ts    ← updated: remove trend logic, add DomainStats call
8. download.service.ts            ← minor: remove event param from metrics call
9. download.controller.ts         ← add getRecentEvents, update getTrend
10. download.schemas.ts            ← unchanged
11. download.routes.ts             ← add /recent route
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
       → upserts UserDownloadMetrics         cards + categories
       → upserts DomainStats                 domain breakdown
```

### Read Path — Pre-computed vs On-demand
```
O(1) reads (pre-computed on write):
  /stats       → UserDownloadMetrics (one document)
  /categories  → UserDownloadMetrics.categories[]
  /domains     → DomainStats (one doc per domain, sorted by total)

On-demand aggregation (fast with indexes):
  /trend       → GROUP BY date on DownloadEvent (~5ms at current scale)
  /duplicates  → GROUP BY filename on DownloadEvent (limit 20)

Live indexed queries:
  /recent      → latest 10 DownloadEvents (single index scan)
  /events      → paginated DownloadEvents (indexed, filtered)
  /files/:id   → single File document
  /files/:id/timeline → DownloadEvents by fileId
```
