# SurfBud — Productivity Page API Specification

> **Version:** 1.0 — March 2026
> **Base path:** `/api/productivity`
> **Auth:** All routes require `authenticate` middleware (JWT in Authorization header)
> **Architecture:** Repository → Service → Controller → Routes
> **Frontend spec:** See `PRODUCTIVITY_UI_SPEC.md` for component layout, interactions, and visual design

---

## Architecture Rules

```
Controllers  → extract params from req, call service or repository, return response
Services     → business logic only, call repositories, never import Models directly
Repositories → raw DB queries only, always use .lean() on reads, no business logic
Models       → schema definitions only, no methods or statics

Error flow   → all async errors bubble via next(err) to Express error handler
Response     → always use ApiSuccess<T> or ApiError envelope (see below)
```

---

## Reusability From Downloads + Browsing

```
date.utils.ts          → timezone-aware date calculations for streak evaluation
asyncHandler           → all route handlers
AppError classes       → NotFoundError, ValidationError, ForbiddenError
authenticate           → all productivity routes
validate(schema)       → all routes accepting body
validateQuery(schema)  → all routes accepting query params
logger (pino)          → all workers
redis                  → BullMQ queues
BullMQ queue pattern   → streak evaluation worker
active:timezones       → streak midnight rollup uses same set
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

## Feature 1 — Tab Groups (Modes)

### Pre-computation Strategy

```
ON-DEMAND (live queries at request time):
  Modes list        → simple findByUserId, sorted predefined first
  Activation log    → latest N ModeActivationEvents by userId

WHY:
  Modes are low-frequency data — created/edited rarely, read on page load.
  No metrics to pre-materialize. Activation log is always real-time.
```

---

### Data Models

#### TabGroupMode — `src/models/tab-group-mode.model.ts`

```
One document per mode per user.
Predefined modes are seeded per user on signup — stored in same collection,
flagged with isPredefined: true. User edits to predefined modes are stored
per-user — one user's changes never affect another user's predefined modes.

Fields:
  userId        ObjectId  ref: User   required   index
  name          string               required   max 50 chars
  color         string               required   hex e.g. '#7C3AED'
  icon          string               required   lucide-react PascalCase e.g. 'Code'
  isPredefined  boolean              default false
  sortOrder     number               default 0   (predefined: 1-4, custom: 0)
  urls          string[]             required   min 1, max 10, validated URLs
  createdAt     Date                 auto
  updatedAt     Date                 auto

Indexes:
  { userId: 1 }
  { userId: 1, isPredefined: 1 }
```

#### ModeActivationEvent — `src/models/mode-activation-event.model.ts`

```
One document per activation. Used for history feed on dashboard.

Fields:
  userId      ObjectId  ref: User         required   index
  modeId      ObjectId  ref: TabGroupMode required   index
  modeName    string                      required
  modeColor   string                      required
  urls        string[]                    required   snapshot at activation time
  activatedAt Date                        auto

Indexes:
  { userId: 1, activatedAt: -1 }
  { userId: 1, modeId: 1, activatedAt: -1 }
```

---

### Zod Schemas — `src/schemas/productivity.schemas.ts`

```typescript
const CreateModeSchema = z.object({
  name:  z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon:  z.string().min(1),
  urls:  z.array(z.string().url()).min(1).max(10),
})

const UpdateModeSchema = z.object({
  name:  z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon:  z.string().optional(),
  urls:  z.array(z.string().url()).min(1).max(10).optional(),
})
```

---

### Repository Layer

#### TabGroupModeRepository — `src/repositories/tab-group-mode.repository.ts`

```typescript
findByUserId(userId: string): Promise<ITabGroupMode[]>
  → TabGroupMode.find({ userId })
     .sort({ isPredefined: -1, sortOrder: 1, createdAt: 1 })
     .lean()
  Predefined first (sortOrder 1-4), custom after (by createdAt)

findById(userId: string, modeId: string): Promise<ITabGroupMode | null>
  → TabGroupMode.findOne({ _id: modeId, userId }).lean()

create(data: CreateModeDto): Promise<ITabGroupMode>
  → new TabGroupMode(data).save()

update(userId: string, modeId: string, data: UpdateModeDto): Promise<ITabGroupMode | null>
  → TabGroupMode.findOneAndUpdate(
      { _id: modeId, userId },
      { ...data, updatedAt: new Date() },
      { new: true }
    )

deleteById(userId: string, modeId: string): Promise<boolean>
  → TabGroupMode.deleteOne({ _id: modeId, userId, isPredefined: false })
  isPredefined: false guard prevents deleting predefined modes at DB level

countCustomByUserId(userId: string): Promise<number>
  → TabGroupMode.countDocuments({ userId, isPredefined: false })
```

#### ModeActivationEventRepository — `src/repositories/mode-activation-event.repository.ts`

```typescript
create(data: CreateActivationDto): Promise<IModeActivationEvent>
  → new ModeActivationEvent(data).save()

findRecentByUserId(userId: string, limit: number): Promise<IModeActivationEvent[]>
  → ModeActivationEvent.find({ userId })
     .sort({ activatedAt: -1 })
     .limit(limit)
     .lean()
```

---

### Service Layer

#### TabGroupModeService — `src/services/tab-group-mode.service.ts`

```typescript
getModes(userId: string): Promise<ITabGroupMode[]>
  → return TabGroupModeRepository.findByUserId(userId)

createMode(userId: string, body: CreateModeDto): Promise<ITabGroupMode>
  Step 1 → count custom modes for user
  Step 2 → if count >= 20 throw ValidationError('Maximum 20 custom modes allowed')
  Step 3 → return TabGroupModeRepository.create({ ...body, userId, isPredefined: false })

updateMode(userId: string, modeId: string, body: UpdateModeDto): Promise<ITabGroupMode>
  Step 1 → fetch mode — throw NotFoundError if not found
  Step 2 → if mode.isPredefined AND (body.name || body.color || body.icon)
             throw ValidationError('Cannot change name, color or icon of predefined modes')
  Step 3 → return TabGroupModeRepository.update(userId, modeId, body)

deleteMode(userId: string, modeId: string): Promise<void>
  Step 1 → fetch mode — throw NotFoundError if not found
  Step 2 → if mode.isPredefined throw ValidationError('Predefined modes cannot be deleted')
  Step 3 → TabGroupModeRepository.deleteById(userId, modeId)

logActivation(userId: string, modeId: string): Promise<IModeActivationEvent>
  Step 1 → fetch mode — throw NotFoundError if not found
  Step 2 → return ModeActivationEventRepository.create({
    userId, modeId,
    modeName:  mode.name,
    modeColor: mode.color,
    urls:      mode.urls,
  })

getRecentActivations(userId: string): Promise<IModeActivationEvent[]>
  → return ModeActivationEventRepository.findRecentByUserId(userId, 10)
```

---

### Controller — `src/controllers/productivity.controller.ts`

```typescript
getModes(req, res, next)
  modes = await TabGroupModeService.getModes(req.user.id)
  return res.json({ success: true, data: { modes } })

createMode(req, res, next)
  body = CreateModeSchema.parse(req.body)
  mode = await TabGroupModeService.createMode(req.user.id, body)
  return res.status(201).json({ success: true, data: { mode } })

updateMode(req, res, next)
  body = UpdateModeSchema.parse(req.body)
  mode = await TabGroupModeService.updateMode(req.user.id, req.params.id, body)
  return res.json({ success: true, data: { mode } })

deleteMode(req, res, next)
  await TabGroupModeService.deleteMode(req.user.id, req.params.id)
  return res.json({ success: true, data: null })

activateMode(req, res, next)
  event = await TabGroupModeService.logActivation(req.user.id, req.params.id)
  return res.status(201).json({ success: true, data: { event } })

getRecentActivations(req, res, next)
  events = await TabGroupModeService.getRecentActivations(req.user.id)
  return res.json({ success: true, data: { events } })
```

---

### Routes

```
GET    /api/productivity/modes                    getModes
POST   /api/productivity/modes                    createMode
PATCH  /api/productivity/modes/:id                updateMode
DELETE /api/productivity/modes/:id                deleteMode
POST   /api/productivity/modes/:id/activate       activateMode
GET    /api/productivity/modes/activations        getRecentActivations
```

---

### Seed Script — `src/scripts/seed-productivity-modes.ts`

Called in `auth.service.ts` on every new user signup after user document is created.

```typescript
export const PREDEFINED_MODES = [
  {
    name:        'Dev Mode',
    color:       '#7C3AED',
    icon:        'Code',
    isPredefined: true,
    sortOrder:   1,
    urls: [
      'https://claude.ai',
      'https://chatgpt.com',
      'https://gemini.google.com',
      'https://github.com',
      'https://stackoverflow.com',
    ],
  },
  {
    name:        'Chill Mode',
    color:       '#E11D48',
    icon:        'Smile',
    isPredefined: true,
    sortOrder:   2,
    urls: [
      'https://youtube.com',
      'https://spotify.com',
      'https://reddit.com',
      'https://netflix.com',
    ],
  },
  {
    name:        'Study Mode',
    color:       '#059669',
    icon:        'BookOpen',
    isPredefined: true,
    sortOrder:   3,
    urls: [
      'https://wikipedia.org',
      'https://youtube.com',
      'https://udemy.com',
      'https://coursera.org',
    ],
  },
  {
    name:        'Meeting Mode',
    color:       '#D97706',
    icon:        'Video',
    isPredefined: true,
    sortOrder:   4,
    urls: [
      'https://teams.microsoft.com',
      'https://meet.google.com',
      'https://calendar.google.com',
      'https://notion.so',
    ],
  },
]

export async function seedProductivityModes(userId: string): Promise<void> {
  const docs = PREDEFINED_MODES.map(m => ({ ...m, userId }))
  await TabGroupMode.insertMany(docs)
}
```

---

## Feature 2 — Streak Tracking

### Pre-computation Strategy

```
PRE-COMPUTED (updated by BullMQ worker after each browsing session batch):
  UserStreak.currentStreak  → consecutive days goal was met
  UserStreak.longestStreak  → all-time best
  UserStreak.lastMetAt      → last date goal was met
  UserStreak.todayProgress  → seconds on domain today (for card display)

ON-DEMAND (live aggregation at request time):
  Calendar data  → aggregate BrowsingSession by date for heatmap
                   last 90 days, fast with existing indexes

WHY THIS SPLIT:
  Streak status + today progress → changes after every session batch,
  safe to pre-materialize, O(1) read on page load.
  Calendar → date-range query, on-demand is clean, same pattern as trend chart.
```

---

### Data Models

#### UserStreak — `src/models/user-streak.model.ts`

```
One document per streak per user.

Fields:
  userId          ObjectId  ref: User  required  index
  label           string               required  max 100 chars  e.g. 'Daily LeetCode'
  domain          string               required  e.g. 'leetcode.com'
  minMinutes      number               required  minimum daily active minutes to count
  activeDays      number[]             required  [1,2,3,4,5] = Mon-Fri
                                                 0=Sun,1=Mon,...,6=Sat
                                                 default [0,1,2,3,4,5,6] = every day
  gracePeriod     string    enum       required  'none' | 'weekly' | 'monthly'
                                                 default 'none'
  currentStreak   number               default 0
  longestStreak   number               default 0
  todaySeconds    number               default 0  reset at midnight by rollup worker
  todayDate       string               'YYYY-MM-DD' — reset trigger (user TZ)
  lastMetAt       string | null        default null  'YYYY-MM-DD' last day goal was met
  skipsUsed       number               default 0  resets on grace period rollover
  isActive        boolean              default true
  createdAt       Date                 auto
  updatedAt       Date                 auto

Indexes:
  { userId: 1 }
  { userId: 1, domain: 1 }
  { userId: 1, isActive: 1 }
```

#### StreakDayLog — `src/models/streak-day-log.model.ts`

```
One document per streak per day. Powers the heatmap calendar.
Written by the streak evaluation worker at end of each day.

Fields:
  userId      ObjectId  ref: User        required
  streakId    ObjectId  ref: UserStreak  required
  date        string    'YYYY-MM-DD'     required  (user timezone)
  seconds     number                     required  active time on domain that day
  minSeconds  number                     required  snapshot of goal at that time
  status      string    enum             required
              'met'       → seconds >= minSeconds
              'partial'   → 0 < seconds < minSeconds
              'missed'    → seconds === 0 AND active day
              'skipped'   → grace period skip used
              'inactive'  → non-active day (weekend if weekdays only)
  createdAt   Date      auto

Indexes:
  { userId: 1, streakId: 1, date: -1 }   ← calendar queries
  { streakId: 1, date: 1 }               unique (one log per streak per day)
```

---

### Zod Schemas

```typescript
const CreateStreakSchema = z.object({
  label:       z.string().min(1).max(100),
  domain:      z.string().min(1),
  minMinutes:  z.number().int().positive().max(480),  // max 8 hours
  activeDays:  z.array(z.number().int().min(0).max(6)).min(1),
  gracePeriod: z.enum(['none', 'weekly', 'monthly']).default('none'),
})

const UpdateStreakSchema = z.object({
  label:       z.string().min(1).max(100).optional(),
  domain:      z.string().min(1).optional(),
  minMinutes:  z.number().int().positive().max(480).optional(),
  activeDays:  z.array(z.number().int().min(0).max(6)).min(1).optional(),
  gracePeriod: z.enum(['none', 'weekly', 'monthly']).optional(),
})

const StreakCalendarQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(90),
})
```

---

### Repository Layer

#### UserStreakRepository — `src/repositories/user-streak.repository.ts`

```typescript
findByUserId(userId: string): Promise<IUserStreak[]>
  → UserStreak.find({ userId, isActive: true })
     .sort({ createdAt: 1 })
     .lean()

findById(userId: string, streakId: string): Promise<IUserStreak | null>
  → UserStreak.findOne({ _id: streakId, userId }).lean()

create(data: CreateStreakDto): Promise<IUserStreak>
  → new UserStreak(data).save()

update(userId: string, streakId: string, data: UpdateStreakDto): Promise<IUserStreak | null>
  → UserStreak.findOneAndUpdate(
      { _id: streakId, userId },
      { ...data, updatedAt: new Date() },
      { new: true }
    )

softDelete(userId: string, streakId: string): Promise<void>
  → UserStreak.updateOne(
      { _id: streakId, userId },
      { isActive: false, updatedAt: new Date() }
    )

updateProgress(
  streakId: string,
  todaySeconds: number,
  todayDate: string
): Promise<void>
  → UserStreak.updateOne(
      { _id: streakId },
      { $set: { todaySeconds, todayDate, updatedAt: new Date() } }
    )

incrementStreak(
  streakId: string,
  newCurrentStreak: number,
  newLongestStreak: number,
  lastMetAt: string
): Promise<void>
  → UserStreak.updateOne(
      { _id: streakId },
      { $set: { currentStreak: newCurrentStreak,
                longestStreak: newLongestStreak,
                lastMetAt, updatedAt: new Date() } }
    )

resetStreak(streakId: string): Promise<void>
  → UserStreak.updateOne(
      { _id: streakId },
      { $set: { currentStreak: 0, updatedAt: new Date() } }
    )
```

#### StreakDayLogRepository — `src/repositories/streak-day-log.repository.ts`

```typescript
findByStreakId(
  streakId: string,
  days: number
): Promise<IStreakDayLog[]>
  → StreakDayLog.find({
      streakId,
      date: { $gte: daysAgoString(days) }
    })
    .sort({ date: 1 })
    .lean()

upsertDay(data: UpsertDayDto): Promise<void>
  → StreakDayLog.findOneAndUpdate(
      { streakId: data.streakId, date: data.date },
      { ...data },
      { upsert: true }
    )
```

---

### Service Layer

#### StreakService — `src/services/streak.service.ts`

```typescript
getStreaks(userId: string): Promise<IUserStreak[]>
  → return UserStreakRepository.findByUserId(userId)

createStreak(userId: string, body: CreateStreakDto): Promise<IUserStreak>
  Step 1 → strip protocol from domain: new URL('https://' + body.domain).hostname
  Step 2 → return UserStreakRepository.create({
    ...body,
    domain:        strippedDomain,
    userId,
    currentStreak: 0,
    longestStreak: 0,
    todaySeconds:  0,
    lastMetAt:     null,
  })

updateStreak(userId: string, streakId: string, body: UpdateStreakDto): Promise<IUserStreak>
  Step 1 → fetch streak → throw NotFoundError if not found
  Step 2 → if body.domain → strip protocol
  Step 3 → return UserStreakRepository.update(userId, streakId, body)

deleteStreak(userId: string, streakId: string): Promise<void>
  Step 1 → fetch streak → throw NotFoundError if not found
  Step 2 → UserStreakRepository.softDelete(userId, streakId)

getCalendar(userId: string, streakId: string, days: number): Promise<CalendarResult>
  Step 1 → fetch streak → throw NotFoundError if not found or not owned by user
  Step 2 → fetch StreakDayLogRepository.findByStreakId(streakId, days)
  Step 3 → fill missing dates with 'inactive' status
  Step 4 → return { streak, calendar: filledDays }

// Called by BullMQ streak-evaluation worker (see §Workers)
evaluateStreakAfterBatch(
  userId: string,
  domain: string,
  secondsToday: number,
  timezone: string
): Promise<void>
  Step 1 → find all active streaks for userId where domain matches
  Step 2 → for each streak:
    today = toDateString(new Date(), timezone)
    isActiveDay = streak.activeDays.includes(getDayOfWeek(today, timezone))
    if !isActiveDay → upsert StreakDayLog with status 'inactive' → skip
    goalMet = secondsToday >= streak.minMinutes * 60
    if goalMet:
      newStreak = streak.lastMetAt === yesterday(timezone)
                    ? streak.currentStreak + 1
                    : 1
      newLongest = Math.max(newStreak, streak.longestStreak)
      UserStreakRepository.incrementStreak(id, newStreak, newLongest, today)
      StreakDayLogRepository.upsertDay({ status: 'met', ... })
    else:
      StreakDayLogRepository.upsertDay({ status: 'partial', ... })
      UserStreakRepository.updateProgress(id, secondsToday, today)
```

---

### BullMQ Integration

#### Streak Evaluation — triggered from browsing metrics worker

After `BrowsingMetricsService.processIngestJob` completes, enqueue a streak
evaluation job for each unique domain in the processed batch:

```typescript
// In browsing-metrics.worker.ts after metrics update
const uniqueDomains = [...new Set(sessions.map(s => s.domain))]
for (const domain of uniqueDomains) {
  await streakEvalQueue.add('evaluate-streak', {
    userId,
    domain,
    timezone: user.timezone,
  })
}
```

#### Streak Midnight Rollup — `src/jobs/workers/streak-rollup.worker.ts`

Same pattern as browsing midnight rollup — runs every 30 minutes, checks
`active:timezones` Redis set, only processes users at local midnight.

At midnight per user timezone:
1. Find all active streaks for users in that timezone
2. For each streak — check if yesterday was an active day
3. If active day AND goal was not met AND no grace period → `resetStreak`
4. If active day AND goal was not met AND grace period available → use skip
5. Reset `todaySeconds` to 0 and update `todayDate`

---

### Controller

```typescript
getStreaks(req, res, next)
  streaks = await StreakService.getStreaks(req.user.id)
  return res.json({ success: true, data: { streaks } })

createStreak(req, res, next)
  body    = CreateStreakSchema.parse(req.body)
  streak  = await StreakService.createStreak(req.user.id, body)
  return res.status(201).json({ success: true, data: { streak } })

updateStreak(req, res, next)
  body   = UpdateStreakSchema.parse(req.body)
  streak = await StreakService.updateStreak(req.user.id, req.params.id, body)
  return res.json({ success: true, data: { streak } })

deleteStreak(req, res, next)
  await StreakService.deleteStreak(req.user.id, req.params.id)
  return res.json({ success: true, data: null })

getStreakCalendar(req, res, next)
  { days } = StreakCalendarQuerySchema.parse(req.query)
  result   = await StreakService.getCalendar(req.user.id, req.params.id, days)
  return res.json({ success: true, data: result })
```

---

### Routes

```
GET    /api/productivity/streaks                     getStreaks
POST   /api/productivity/streaks                     createStreak
PATCH  /api/productivity/streaks/:id                 updateStreak
DELETE /api/productivity/streaks/:id                 deleteStreak
GET    /api/productivity/streaks/:id/calendar        getStreakCalendar
```

---

## Feature 3 — Focus Mode

### Pre-computation Strategy

```
ON-DEMAND only:
  Focus session history → paginated FocusSession query by userId
  Active session        → findActiveByUserId (endedAt: null)

WHY:
  Focus sessions are low-frequency events. No pre-materialization needed.
  History is always real-time — user expects to see sessions as they complete.
```

---

### Data Models

#### FocusSession — `src/models/focus-session.model.ts`

```
One document per focus session.

Fields:
  userId       ObjectId  ref: User  required  index
  domain       string               required  e.g. 'udemy.com'
  label        string               required  e.g. 'Udemy' (from DomainClassification)
  plannedMins  number | null        null = no timer
  actualMins   number | null        null until session ends — computed on end
  startedAt    Date                 auto
  endedAt      Date | null          default null
  status       string    enum       required
               'active'    → session in progress
               'completed' → ended normally (timer finished or user ended)
               'abandoned' → user closed tab / navigated away without ending

Indexes:
  { userId: 1, startedAt: -1 }
  { userId: 1, status: 1 }
  { userId: 1, status: 1, startedAt: -1 }
```

---

### Zod Schemas

```typescript
const StartFocusSessionSchema = z.object({
  domain:      z.string().min(1),
  plannedMins: z.number().int().positive().max(480).nullable().default(null),
})

const EndFocusSessionSchema = z.object({
  status: z.enum(['completed', 'abandoned']),
})

const FocusHistoryQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
})
```

---

### Repository Layer

#### FocusSessionRepository — `src/repositories/focus-session.repository.ts`

```typescript
findActiveByUserId(userId: string): Promise<IFocusSession | null>
  → FocusSession.findOne({ userId, status: 'active' }).lean()

findByUserId(userId: string, page: number, limit: number): Promise<PaginatedResult>
  → FocusSession.find({ userId })
     .sort({ startedAt: -1 })
     .skip((page - 1) * limit)
     .limit(limit)
     .lean()
  + FocusSession.countDocuments({ userId })

create(data: CreateFocusSessionDto): Promise<IFocusSession>
  → new FocusSession(data).save()

endSession(
  userId: string,
  sessionId: string,
  status: 'completed' | 'abandoned'
): Promise<IFocusSession | null>
  endedAt    = new Date()
  session    = await FocusSession.findOne({ _id: sessionId, userId })
  actualMins = Math.round((endedAt - session.startedAt) / 60000)
  → FocusSession.findOneAndUpdate(
      { _id: sessionId, userId, status: 'active' },
      { status, endedAt, actualMins },
      { new: true }
    )
```

---

### Service Layer

#### FocusSessionService — `src/services/focus-session.service.ts`

```typescript
getActiveSession(userId: string): Promise<IFocusSession | null>
  → return FocusSessionRepository.findActiveByUserId(userId)

startSession(userId: string, body: StartFocusSessionDto): Promise<IFocusSession>
  Step 1 → check for existing active session
           if exists → throw ValidationError('A focus session is already active')
  Step 2 → resolve label from DomainClassification (same join pattern as browsing)
           if not found → use domain as label
  Step 3 → strip protocol from domain
  Step 4 → return FocusSessionRepository.create({
    userId,
    domain:      strippedDomain,
    label,
    plannedMins: body.plannedMins,
    status:      'active',
  })

endSession(
  userId: string,
  sessionId: string,
  body: EndFocusSessionDto
): Promise<IFocusSession>
  Step 1 → endSession in repository
  Step 2 → if null throw NotFoundError('Focus session not found or already ended')
  Step 3 → return updated session

getHistory(userId: string, page: number, limit: number): Promise<PaginatedResult>
  → return FocusSessionRepository.findByUserId(userId, page, limit)
```

---

### Controller

```typescript
getActiveSession(req, res, next)
  session = await FocusSessionService.getActiveSession(req.user.id)
  return res.json({ success: true, data: { session } })

startSession(req, res, next)
  body    = StartFocusSessionSchema.parse(req.body)
  session = await FocusSessionService.startSession(req.user.id, body)
  return res.status(201).json({ success: true, data: { session } })

endSession(req, res, next)
  body    = EndFocusSessionSchema.parse(req.body)
  session = await FocusSessionService.endSession(req.user.id, req.params.id, body)
  return res.json({ success: true, data: { session } })

getHistory(req, res, next)
  { page, limit } = FocusHistoryQuerySchema.parse(req.query)
  result          = await FocusSessionService.getHistory(req.user.id, page, limit)
  return res.json({ success: true, data: result })
```

---

### Routes

```
GET    /api/productivity/focus/active              getActiveSession
POST   /api/productivity/focus/sessions            startSession
PATCH  /api/productivity/focus/sessions/:id/end    endSession
GET    /api/productivity/focus/sessions            getHistory
```

---

## Error Handling

```
NotFoundError   → 404  { success: false, message: '...', code: 'NOT_FOUND' }
ValidationError → 400  { success: false, message: '...', code: 'VALIDATION_ERROR' }
AuthError       → 401  { success: false, message: 'Unauthorized' }
ServerError     → 500  { success: false, message: 'Internal server error' }

All controllers pass errors to next(err).
Global error handler in src/middleware/errorHandler.ts maps to correct HTTP status.
```

---

## File Map

```
src/
├── models/
│   ├── tab-group-mode.model.ts
│   ├── mode-activation-event.model.ts
│   ├── user-streak.model.ts
│   ├── streak-day-log.model.ts
│   └── focus-session.model.ts
├── repositories/
│   ├── tab-group-mode.repository.ts
│   ├── mode-activation-event.repository.ts
│   ├── user-streak.repository.ts
│   ├── streak-day-log.repository.ts
│   └── focus-session.repository.ts
├── services/
│   ├── tab-group-mode.service.ts
│   ├── streak.service.ts
│   └── focus-session.service.ts
├── controllers/
│   └── productivity.controller.ts
├── routes/
│   └── productivity.routes.ts
├── schemas/
│   └── productivity.schemas.ts
├── jobs/
│   └── workers/
│       └── streak-rollup.worker.ts
└── scripts/
    └── seed-productivity-modes.ts
```

---

## Implementation Order

```
1.  tab-group-mode.model.ts
2.  mode-activation-event.model.ts
3.  user-streak.model.ts
4.  streak-day-log.model.ts
5.  focus-session.model.ts
6.  tab-group-mode.repository.ts
7.  mode-activation-event.repository.ts
8.  user-streak.repository.ts
9.  streak-day-log.repository.ts
10. focus-session.repository.ts
11. tab-group-mode.service.ts
12. streak.service.ts
13. focus-session.service.ts
14. productivity.controller.ts
15. productivity.schemas.ts
16. productivity.routes.ts
17. seed-productivity-modes.ts  → wire into auth.service.ts signup
18. streak-rollup.worker.ts     → wire into scheduler.ts
19. Wire streak evaluation into browsing-metrics.worker.ts
```

---

## Cross-Reference: Frontend

| Endpoint | Consumed By |
|---|---|
| `GET /api/productivity/modes` | Section 1 — Mode cards grid |
| `POST /api/productivity/modes` | Create Mode modal |
| `PATCH /api/productivity/modes/:id` | Edit Mode modal |
| `DELETE /api/productivity/modes/:id` | Delete button on custom cards |
| `POST /api/productivity/modes/:id/activate` | Activate button on all cards |
| `GET /api/productivity/modes/activations` | Recent activations (future) |
| `GET /api/productivity/streaks` | Section 2 — Streak cards |
| `POST /api/productivity/streaks` | Create Streak modal |
| `PATCH /api/productivity/streaks/:id` | Edit Streak modal |
| `DELETE /api/productivity/streaks/:id` | Delete button on streak cards |
| `GET /api/productivity/streaks/:id/calendar` | Heatmap calendar per streak card |
| `GET /api/productivity/focus/active` | Focus Mode section — active state |
| `POST /api/productivity/focus/sessions` | Start Focus Session button |
| `PATCH /api/productivity/focus/sessions/:id/end` | End Focus Session button |
| `GET /api/productivity/focus/sessions` | Focus session history feed |

---

*SurfBud · Productivity API Spec · v1.0 · March 2026*
