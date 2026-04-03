# SurfBud - Browsing Configuration API Spec
**Version 1.0 - Phase 1 - March 2026**

---

## 1. Overview

This document defines the backend and extension sync contract for Browsing Configuration.

```
Base path:  /api/browsing/settings
Auth:       All settings endpoints require JWT (Authorization: Bearer <token>)
Save model: Dashboard uses explicit Save/Cancel draft flow
Sync:       Saved settings are forwarded to extension and persisted in chrome.storage.sync
```

---

## 2. Settings Model

Browsing configuration is represented by scalar settings plus domain rules.

```typescript
interface BrowsingSettings {
  trackingEnabled: boolean;
  interactionTrackingEnabled: boolean;
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
  domainRules: Array<{
    _id: string;
    domain: string;
    rule: "track" | "dont_track";
  }>;
}
```

### 2.1 Defaults

```typescript
const DEFAULT_BROWSING_SETTINGS = {
  trackingEnabled: true,
  interactionTrackingEnabled: true,
  minSessionDurationSeconds: 10,
  mergeGapSeconds: 30,
}
```

---

## 3. Validation Rules

Settings PATCH validation:

```typescript
trackingEnabled: boolean (optional)
interactionTrackingEnabled: boolean (optional)
minSessionDurationSeconds: int, min 1, max 300 (optional)
mergeGapSeconds: int, min 5, max 600 (optional)
```

Additional constraint: at least one field is required in PATCH body.

Domain rule validation:

```typescript
domain: non-empty string (normalized to hostname)
rule: "track" | "dont_track"
```

Duplicate domain per user returns conflict.

---

## 4. API Endpoints

### 4.1 Scalar Settings

#### GET /api/browsing/settings
Returns effective browsing settings for the authenticated user.

**Response**
```json
{
  "success": true,
  "data": {
    "trackingEnabled": true,
    "interactionTrackingEnabled": true,
    "minSessionDurationSeconds": 10,
    "mergeGapSeconds": 30,
    "domainRules": []
  }
}
```

#### PATCH /api/browsing/settings
Updates one or more scalar settings.

**Request body** (all optional, at least one required)
```typescript
{
  trackingEnabled?: boolean;
  interactionTrackingEnabled?: boolean;
  minSessionDurationSeconds?: number;
  mergeGapSeconds?: number;
}
```

**Response**
Returns full normalized settings payload (same shape as GET).

---

### 4.2 Domain Rules

#### GET /api/browsing/settings/rules/domains
Returns domain rules for the authenticated user.

#### POST /api/browsing/settings/rules/domains
Creates one domain rule.

**Request body**
```typescript
{
  domain: string;
  rule: "track" | "dont_track";
}
```

#### PATCH /api/browsing/settings/rules/domains/:id
Updates rule value for an existing domain rule.

**Request body**
```typescript
{
  rule: "track" | "dont_track";
}
```

#### DELETE /api/browsing/settings/rules/domains/:id
Deletes a domain rule by id.

---

## 5. Service and Repository Responsibilities

### 5.1 Controller Layer

- `BrowsingController.getSettings` returns settings envelope
- `BrowsingController.updateSettings` applies validated patch
- Domain rule CRUD controllers delegate to service methods

### 5.2 Service Layer

`BrowsingSettingsService` responsibilities:

- Ensures per-user settings document exists
- Applies defaults when settings are absent
- Normalizes and validates domain input
- Assembles settings response from scalar settings and domain rule documents
- Applies filtering behavior for ingest paths:
  - `trackingEnabled = false` drops all sessions
  - `dont_track` domain rules drop matching domains
  - `minSessionDurationSeconds` filters short sessions
  - `interactionTrackingEnabled = false` zeroes interaction counters

---

## 6. Extension Sync Contract

Browsing config is synced via two coordinated paths.

### 6.1 Push From Dashboard Save

1. Dashboard saves settings and rules to API.
2. Dashboard posts `SURFBUD_BROWSING_SETTINGS_SYNC` with payload:

```typescript
interface BrowsingSettingsSyncPayload {
  settings: BrowsingSettings;
  syncedAt: string;
  source: "dashboard" | "extension-fetch";
}
```

3. Content bridge forwards to extension runtime message `BROWSING_SETTINGS_SYNC`.
4. Service worker persists to `chrome.storage.sync` keys:
   - `browsingSettings`
   - `browsingSettingsSyncedAt`

### 6.2 Pull From API (Safety Sync)

Service worker also fetches `/api/browsing/settings` on auth/bootstrap and after receiving sync message to ensure storage reflects server truth.

---

## 7. Extension Consumption

The session engine reads `browsingSettings` from `chrome.storage.sync` and applies fields directly:

- `trackingEnabled`: master gate for session tracking
- `domainRules`: per-domain block list for `dont_track`
- `mergeGapSeconds`: merge consecutive same-domain sessions within threshold
- `minSessionDurationSeconds`: discard short sessions when closing
- `interactionTrackingEnabled`: enable or suppress key/click/scroll counters

No field renaming is performed between dashboard, API, and extension.

---

## 8. Shared Types Contract

`BrowsingSettings` and `BrowsingSettingsSyncPayload` must remain identical in:

- `api/src/types/shared/browsing-settings.types.ts`
- `dashboard/src/types/shared/browsing-settings.types.ts`
- `extension/src/types/shared/browsing-settings.types.ts`

Any shape change must update all three in one commit.
