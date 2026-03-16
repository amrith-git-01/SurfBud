# SurfBud — Download Configuration API Spec
**Version 1.0 · Phase 1 · March 2026**

---

## 1. Overview

This document defines the backend API for the Download Configuration feature. It covers schema design, API endpoints, BullMQ queue behavior, WebSocket events, and extension sync flow.

```
Base path:  /api/downloads/settings
Auth:       All endpoints require JWT — Authorization: Bearer <token>
Save:       All settings save instantly (no explicit save step)
Sync:       Every change is immediately pushed to the Chrome extension
```

---

## 2. Schema Design

Three MongoDB collections handle all configuration data. This hybrid approach avoids array manipulation for frequently-updated rules while keeping simple scalars together.

### 2.1 UserDownloadSettings

One document per user. Contains only scalar values — toggles and grace period. Created automatically on signup with defaults.

```typescript
interface UserDownloadSettings {
  _id:    ObjectId
  userId: ObjectId          // unique index

  // Master toggles
  trackingEnabled:    boolean   // default: true
  autoRemoveEnabled:  boolean   // default: false

  // Grace period
  gracePeriodType:    'immediate' | 'delayed'  // default: 'delayed'
  gracePeriodMinutes: 15 | 30 | 60             // default: 15

  // Routing master toggle
  routingEnabled: boolean   // default: false

  createdAt: string
  updatedAt: string
}
```

**Indexes**
```typescript
UserDownloadSettingsSchema.index({ userId: 1 }, { unique: true })
```

---

### 2.2 UserDownloadRule

One document per rule. Handles both domain rules and file category rules using a `ruleType` discriminator. Clean CRUD — no array manipulation required.

```typescript
interface UserDownloadRule {
  _id:    ObjectId
  userId: ObjectId   // indexed

  ruleType: 'domain' | 'category'

  // Domain rules (ruleType: 'domain')
  domain:   string | null   // 'drive.google.com'

  // Category rules (ruleType: 'category')
  category: 'document' | 'video' | 'audio' | 'archive' |
            'code' | 'image' | 'text' | 'executable' | 'other' | null

  rule: 'dont_track' | 'never_auto_remove'

  createdAt: string
  updatedAt: string
}
```

**Indexes**
```typescript
// General lookup
UserDownloadRuleSchema.index({ userId: 1, ruleType: 1 })

// One rule per domain per user
UserDownloadRuleSchema.index({ userId: 1, domain: 1 }, {
  unique: true,
  partialFilterExpression: { ruleType: 'domain' }
})

// One rule per category per user
UserDownloadRuleSchema.index({ userId: 1, category: 1 }, {
  unique: true,
  partialFilterExpression: { ruleType: 'category' }
})
```

---

### 2.3 UserRoutingFolder

One document per folder. The `category` field doubles as the mapping — if null, the folder exists but has no category connected. Maximum 10 folders per user.

```typescript
interface UserRoutingFolder {
  _id:        ObjectId
  userId:     ObjectId   // indexed
  folderName: string     // 'Videos' — user defined
  category:   string | null   // 'video' — null = no mapping yet
  createdAt:  string
  updatedAt:  string
}
```

**Indexes**
```typescript
UserRoutingFolderSchema.index({ userId: 1 })

// One category per folder per user
UserRoutingFolderSchema.index({ userId: 1, category: 1 }, {
  unique: true,
  sparse: true   // allows multiple null categories
})
```

---

### 2.4 Default Document — Created on Signup

```typescript
const defaultSettings = {
  userId,
  trackingEnabled:    true,
  autoRemoveEnabled:  false,
  gracePeriodType:    'delayed',
  gracePeriodMinutes: 15,
  routingEnabled:     false,
}

// Domain rules   → empty (UserDownloadRule collection)
// Category rules → empty (UserDownloadRule collection)
// Routing folders → empty (UserRoutingFolder collection)
```

---

## 3. API Endpoints

### 3.1 Settings — Scalar Values

#### GET /api/downloads/settings

Fetch complete settings for the authenticated user. Runs three parallel queries and assembles into one response.

```typescript
const [settings, rules, folders] = await Promise.all([
  UserDownloadSettings.findOne({ userId }).lean(),
  UserDownloadRule.find({ userId }).lean(),
  UserRoutingFolder.find({ userId }).lean(),
])
```

**Response**
```json
{
  "success": true,
  "data": {
    "trackingEnabled":    true,
    "autoRemoveEnabled":  false,
    "gracePeriodType":    "delayed",
    "gracePeriodMinutes": 15,
    "routingEnabled":     false,
    "domainRules":        [],
    "categoryRules":      [],
    "routingFolders":     []
  }
}
```

---

#### PATCH /api/downloads/settings

Update any scalar setting. Accepts partial body — only provided fields are updated. Triggers extension sync after every successful update.

**Request body** (all fields optional)
```typescript
{
  trackingEnabled?:    boolean
  autoRemoveEnabled?:  boolean
  gracePeriodType?:    'immediate' | 'delayed'
  gracePeriodMinutes?: 15 | 30 | 60
  routingEnabled?:     boolean
}
```

**Side effects**
- `trackingEnabled → false` → cancel all pending BullMQ removal jobs for this user
- `autoRemoveEnabled → false` → cancel all pending BullMQ removal jobs for this user
- Always → push updated settings to extension via `chrome.runtime.sendMessage`

---

### 3.2 Domain Rules

#### GET /api/downloads/settings/rules/domains
Returns all domain rules for the authenticated user.

---

#### POST /api/downloads/settings/rules/domains

Add a new domain rule. Domain is auto-stripped to hostname only.

**Request body**
```typescript
{
  domain: string   // 'drive.google.com' or full URL (auto-stripped)
  rule:   'dont_track' | 'never_auto_remove'
}
```

**Validation**
- `domain` must be a valid hostname after stripping
- Duplicate domain per user → `409 Conflict`

**Domain stripping logic**
```typescript
const hostname = new URL(
  domain.startsWith('http') ? domain : `https://${domain}`
).hostname
```

---

#### PATCH /api/downloads/settings/rules/domains/:id

Edit the rule for an existing domain. Cannot change the domain itself — delete and re-add instead.

**Request body**
```typescript
{
  rule: 'dont_track' | 'never_auto_remove'
}
```

---

#### DELETE /api/downloads/settings/rules/domains/:id

Remove a domain rule. Domain returns to default behavior.

---

### 3.3 Category Rules

#### POST /api/downloads/settings/rules/categories

Set a rule for a file category. Uses upsert — if a rule for this category already exists it is replaced.

**Request body**
```typescript
{
  category: 'document' | 'video' | 'audio' | 'archive' |
            'code' | 'image' | 'text' | 'executable' | 'other'
  rule:     'dont_track' | 'never_auto_remove'
}
```

**Implementation**
```typescript
await UserDownloadRule.findOneAndUpdate(
  { userId, ruleType: 'category', category },
  { rule, updatedAt: new Date().toISOString() },
  { upsert: true, new: true }
)
```

---

#### DELETE /api/downloads/settings/rules/categories/:id

Remove a category rule. Category returns to default bucket (Track and Remove).

---

### 3.4 Routing Folders

#### GET /api/downloads/settings/routing/folders
Returns all routing folders including their category mappings.

---

#### POST /api/downloads/settings/routing/folders

Create a new routing folder. Maximum 10 folders per user.

**Request body**
```typescript
{
  folderName: string   // 'Videos' — max 50 chars
}
```

**Validation**
- `folderName` max 50 characters
- Strip invalid path characters: `/ \ : * ? " < > |`
- Max 10 folders per user → `400` if exceeded

**Implementation**
```typescript
const folderCount = await UserRoutingFolder.countDocuments({ userId })
if (folderCount >= 10) {
  throw new ValidationError('Maximum of 10 folders allowed')
}
await UserRoutingFolder.create({ userId, folderName, category: null })
```

---

#### PATCH /api/downloads/settings/routing/folders/:id

Rename a folder or update its category mapping.

**Request body** (all optional)
```typescript
{
  folderName?: string        // rename folder
  category?:   string | null // connect or disconnect category
}
```

**Mapping logic — when category is provided**
```typescript
// Step 1: Clear existing mapping for this category (another folder may own it)
await UserRoutingFolder.updateOne(
  { userId, category },
  { $set: { category: null } }
)

// Step 2: Set new mapping on this folder
await UserRoutingFolder.updateOne(
  { _id, userId },
  { $set: { category, updatedAt: new Date().toISOString() } }
)
```

---

#### DELETE /api/downloads/settings/routing/folders/:id

Delete a folder. Any category mapped to this folder is automatically disconnected (set to null).

---

### 3.5 Removal Control

#### DELETE /api/downloads/removal/:hash

Cancel a pending removal job. Called when user clicks "Keep File".

```typescript
const jobId = `remove:${req.user.id}:${req.params.hash}`
const job   = await removalQueue.getJob(jobId)
await job?.remove()
await DownloadRepository.markKept({ userId: req.user.id, hash: req.params.hash })
```

---

#### PATCH /api/downloads/removal-confirmed

Extension calls this after successfully removing a file from disk.

**Request body**
```typescript
{
  savedPath: string
  hash:      string
}
```

---

## 4. BullMQ — Removal Queue

All duplicate file removal is handled asynchronously via BullMQ. The extension never manages timers — the API owns the grace period entirely.

### 4.1 Queue Definition

```typescript
// api/src/queues/removal.queue.ts

export const removalQueue = new Queue('download-removal', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail:     { count: 50 },
    attempts:         3,
    backoff: {
      type:  'exponential',
      delay: 2000   // 2s, 4s, 8s
    }
  }
})
```

---

### 4.2 Scheduling a Removal

Called when a duplicate is detected and auto-remove is enabled. Job ID is namespaced by `userId:hash` — one active job per file hash per user.

```typescript
// api/src/queues/removal.queue.ts

export async function scheduleRemoval(
  userId:             string,
  savedPath:          string,
  hash:               string,
  gracePeriodMinutes: number
): Promise<void> {

  const jobId = `remove:${userId}:${hash}`

  // Cancel existing job for this hash (user re-downloaded same file)
  const existing = await removalQueue.getJob(jobId)
  if (existing) {
    await existing.remove()

    // Remove old file immediately — it's now confirmed duplicate
    io.to(`user:${userId}`).emit('remove:file', {
      type:      'remove:file',
      savedPath: existing.data.savedPath
    })
  }

  // Schedule new job for the latest download
  await removalQueue.add(
    'remove-duplicate',
    { userId, savedPath, hash },
    { jobId, delay: gracePeriodMinutes * 60 * 1000 }
  )
}
```

---

### 4.3 Worker

```typescript
// api/src/workers/removal.worker.ts

export const removalWorker = new Worker(
  'download-removal',
  async (job) => {
    const { userId, savedPath, hash } = job.data

    // Signal extension to remove the file from disk
    io.to(`user:${userId}`).emit('remove:file', {
      type: 'remove:file',
      savedPath,
      hash,
    })

    await DownloadRepository.markRemovalPending({ userId, hash })
  },
  { connection: redis, concurrency: 20 }
)

removalWorker.on('failed', (job, err) => {
  logger.error('Removal job failed', { jobId: job?.id, err: err.message })
})
```

---

### 4.4 Edge Case — User Re-downloads Within Grace Period

```
file.pdf downloaded → job created: remove:userId:hash123 → 15 min timer starts
         ↓
8 minutes later → file (1).pdf downloaded → same hash detected
         ↓
scheduleRemoval called again with same hash
         ↓
Existing job found → cancelled
Old file (file.pdf) removed immediately via WebSocket signal
New job created for file (1).pdf → fresh 15 min timer
         ↓
One job per hash — no orphans, no conflicts ✅
```

---

## 5. Extension Sync Flow

Settings are synced to the Chrome extension via direct message passing. The extension stores settings in `chrome.storage.local` and reads them synchronously on every download event.

### 5.1 Sync Triggers

| Trigger | Message Type | Payload |
|---|---|---|
| On login / signup | `AUTH_SUCCESS` | Full settings + auth token |
| Any setting changed | `SETTINGS_UPDATED` | Full settings object |
| On logout | `AUTH_LOGOUT` | Clear storage + cancel alarms |
| SW wakes, no cache | API fetch fallback | `GET /downloads/settings` |

---

### 5.2 Settings Object Sent to Extension

```typescript
interface ExtensionSettings {
  trackingEnabled:    boolean
  autoRemoveEnabled:  boolean
  gracePeriodType:    'immediate' | 'delayed'
  gracePeriodMinutes: 15 | 30 | 60
  routingEnabled:     boolean
  domainRules:   { domain: string; rule: string }[]
  categoryRules: { category: string; rule: string }[]
  routingFolders: { folderName: string; category: string | null }[]
  syncedAt: string
}
```

---

### 5.3 Dashboard — Sending to Extension

```typescript
// dashboard/src/utils/extension.utils.ts

export async function syncSettingsToExtension(
  settings: ExtensionSettings
): Promise<void> {
  try {
    await chrome.runtime.sendMessage(EXTENSION_ID, {
      type:    'SETTINGS_UPDATED',
      payload: settings
    })
  } catch {
    // Extension not installed — fail silently
  }
}

// Called after every successful PATCH
const mutation = useMutation({
  mutationFn: DownloadSettingsAPI.patch,
  onSuccess: (updatedSettings) => {
    queryClient.setQueryData(['downloadSettings'], updatedSettings)
    syncSettingsToExtension(updatedSettings)
  }
})
```

---

### 5.4 Extension — Message Handler

```typescript
// extension/src/service-worker/background.ts

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'AUTH_SUCCESS': {
      const { accessToken, userId, settings } = message.payload
      chrome.storage.local.set({
        accessToken,
        userId,
        downloadSettings: { ...settings, syncedAt: new Date().toISOString() }
      })
      sendResponse({ success: true })
      return true
    }

    case 'SETTINGS_UPDATED': {
      chrome.storage.local.set({
        downloadSettings: { ...message.payload, syncedAt: new Date().toISOString() }
      })
      sendResponse({ success: true })
      return true
    }

    case 'AUTH_LOGOUT': {
      chrome.storage.local.clear()
      chrome.alarms.clearAll()
      sendResponse({ success: true })
      return true
    }

  }
})
```

---

### 5.5 WebSocket Events

| Event | Payload | Description |
|---|---|---|
| `remove:file` | `{ type, savedPath, hash }` | Signal extension to remove file from disk |
| `settings:updated` | `{ type, settings }` | Push full settings after any change |

---

### 5.6 Extension — Remove File Handler

```typescript
socket.on('remove:file', async ({ savedPath, hash }) => {

  // Strategy 1 — search by savedPath in Chrome download history
  const [item] = await chrome.downloads.search({ filename: savedPath })

  if (item) {
    await chrome.downloads.removeFile(item.id)
    await chrome.downloads.erase({ id: item.id })

    // Confirm back to API
    await apiRequest('/downloads/removal-confirmed', {
      method: 'PATCH',
      body:   JSON.stringify({ savedPath, hash })
    })
    return
  }

  // Strategy 2 — file not in Chrome history (moved or already deleted)
  await apiRequest('/downloads/removal-failed', {
    method: 'PATCH',
    body:   JSON.stringify({ savedPath, hash })
  })
})
```

---

## 6. Rule Priority Order

When multiple rules apply to a download, the following priority order determines the outcome. Higher priority wins.

| Priority | Rule | Effect |
|---|---|---|
| 1 | Master tracking OFF | Stop all processing — ignore download entirely |
| 2 | Domain `dont_track` | Ignore download from this domain entirely |
| 3 | Category `dont_track` | Skip duplicate detection for this file type |
| 4 | Auto-remove OFF | Record + detect only — no removal |
| 5 | Domain `never_auto_remove` | Record + detect — never delete |
| 6 | Category `never_auto_remove` | Record + detect — never delete |
| 7 | Grace period | Schedule removal via BullMQ after delay |
| 8 | Immediate | Signal extension to remove file right away |

---

## 7. Download Routing

Routing is handled in the extension via `chrome.downloads.onDeterminingFilename`. The API stores the configuration — the extension applies it at download time.

### 7.1 Extension Implementation

```typescript
// extension/src/service-worker/background.ts

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  chrome.storage.local.get('downloadSettings', ({ downloadSettings }) => {

    if (!downloadSettings?.routingEnabled) {
      suggest({ filename: item.filename })
      return true
    }

    const category = getCategoryFromMime(item.mime)

    // Check if category is in dont_track — skip routing
    const categoryRule = downloadSettings.categoryRules
      .find(r => r.category === category)
    if (categoryRule?.rule === 'dont_track') {
      suggest({ filename: item.filename })
      return true
    }

    const folder = downloadSettings.routingFolders
      .find(f => f.category === category)

    if (!folder) {
      suggest({ filename: item.filename })  // no mapping — use default
      return true
    }

    const filename = item.filename.split(/[/\\]/).pop()
    suggest({
      filename:       `${folder.folderName}/${filename}`,
      conflictAction: 'uniquify'
    })
    return true
  })
})
```

> **Note:** Paths are relative to the user's Downloads directory. Chrome creates subfolders automatically if they do not exist. Categories in the "Dont Track" bucket are never routed.

---

## 8. Endpoint Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/downloads/settings` | Fetch all settings |
| `PATCH` | `/downloads/settings` | Update scalar settings |
| `GET` | `/downloads/settings/rules/domains` | List domain rules |
| `POST` | `/downloads/settings/rules/domains` | Add domain rule |
| `PATCH` | `/downloads/settings/rules/domains/:id` | Edit domain rule |
| `DELETE` | `/downloads/settings/rules/domains/:id` | Remove domain rule |
| `POST` | `/downloads/settings/rules/categories` | Set category rule (upsert) |
| `DELETE` | `/downloads/settings/rules/categories/:id` | Remove category rule |
| `GET` | `/downloads/settings/routing/folders` | List routing folders |
| `POST` | `/downloads/settings/routing/folders` | Create folder (max 10) |
| `PATCH` | `/downloads/settings/routing/folders/:id` | Rename or remap folder |
| `DELETE` | `/downloads/settings/routing/folders/:id` | Delete folder |
| `DELETE` | `/downloads/removal/:hash` | Cancel pending removal |
| `PATCH` | `/downloads/removal-confirmed` | Extension confirms removal done |
| `PATCH` | `/downloads/removal-failed` | Extension reports removal failed |

---

*SurfBud · Download Configuration API Spec · v1.0 · March 2026*
