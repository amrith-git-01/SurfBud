# SurfBud — GitHub Copilot Instructions

## Project Overview
SurfBud is an AI-powered browser productivity platform. One GitHub repo, three independent deployable units:
```
surfbud/
├── api/         Node.js + Express + TypeScript → Railway/Render
├── dashboard/   React + Vite + TypeScript → Vercel
├── extension/   Chrome MV3 + TypeScript → Web Store
└── docs/
```
No shared build-time code. Runtime communication via HTTPS REST + WebSocket only. Phase 1 — no Free/Pro tiers, no feature gating, full product for all users.

---

## Tech Stack
| Folder | Stack |
|---|---|
| `api/` | Express, MongoDB/Mongoose, Redis, BullMQ, Socket.IO, Zod, JWT, Groq SDK |
| `dashboard/` | React 18, Tailwind CSS, Recharts, Zustand, React Query, Socket.IO Client |
| `extension/` | Chrome MV3, React (side panel + popup), Service Worker |

---

## Architecture — Non-Negotiable

### Layer Rule
```
Route → Controller → Service → Repository → Model

Controller  → imports Services only (no Models, no DB)
Service     → imports Repositories + other Services (no raw DB queries)
Repository  → imports Models only (zero business logic)
```

### Three Critical Patterns
```
1. AI is always async        → BullMQ queue, NEVER inline in request handler
2. Metrics are pre-computed  → read UserMetrics document, NEVER aggregate on demand
3. WebSocket sends deltas    → NEVER full dataset, user-specific rooms only
```

### Auth
Access token 15min (Authorization header) + refresh token 7d (httpOnly cookie + Redis). No `plan` claim in JWT.

### Shared Types
`src/types/shared/` is duplicated across all three folders. Any change must update all three in one commit. Authoritative source is `api/src/types/shared/`.

---

## TypeScript Rules

- `strict: true`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch` in every tsconfig
- Never use `any` — use `unknown` and narrow it
- Always type function parameters and return values including async (`Promise<T>`)
- Never `@ts-ignore` — use `@ts-expect-error` with comment only if unavoidable
- Naming: `PascalCase` types/interfaces/components, `camelCase` variables/functions, `SCREAMING_CASE` constants, `kebab-case` file names
- Use `interface` for object shapes, `type` for unions/intersections
- Always `async/await` — never `.then().catch()` chains
- Never leave floating promises — always `await` or `void`
- Always handle null/undefined explicitly after DB queries
- String enums only — never numeric enums

```typescript
// Imports order: external → internal → types
import express from 'express'
import { ModeService } from '../services/mode.service'
import type { Request, Response } from 'express'
```

---

## Code Quality Rules

- **Guard clauses first** — validate/guard at top, happy path at bottom, no deep nesting
- **DRY** — if same logic appears in 2+ places, extract it
- **No magic values** — always named constants (`const JWT_ACCESS_TTL = '15m'`)
- **`const` by default** — `let` only when reassigning, never `var`
- **No `console.log`** — use structured logger (`pino`): `logger.info/error/warn`
- **Never swallow errors** — always log or re-throw in catch blocks
- **Single responsibility** — files over ~200 lines need splitting
- **Comments explain WHY** — not what; no commented-out code; TODOs need ticket/date
- **Immutability** — spread instead of mutate, map/filter/reduce instead of push/splice
- **Boolean vars** use `is/has/can/should` prefix
- **Event handlers** use `handle` prefix

---

## API — Backend Rules

### Controllers
Extract params → call ONE service method → return response. No business logic, no direct DB.

### Services
All business logic. Call repositories. Call other services. Queue AI jobs — never call Groq directly.

### Repositories
All DB queries, zero business logic. Always `.lean()` on read queries. Indexes defined in model schema.

### Error Handling
```typescript
// Custom error classes — never throw plain Error in services
class NotFoundError   extends AppError { constructor(m: string) { super(m, 404, 'NOT_FOUND') } }
class ForbiddenError  extends AppError { constructor(m: string) { super(m, 403, 'FORBIDDEN') } }
class ValidationError extends AppError { constructor(m: string) { super(m, 400, 'VALIDATION_ERROR') } }
class ConflictError   extends AppError { constructor(m: string) { super(m, 409, 'CONFLICT') } }
```
Global error handler in middleware — never send raw errors to client.

### Validation
Every route accepting body/params must have a Zod schema. Use reusable `validate(schema)` middleware.

### Route Middleware Order
`helmet → cors → rateLimiter → authenticate → validate → handler`

### Environment
Validate all env vars with Zod at startup — crash fast if misconfigured. Never hardcode secrets.

### BullMQ
Queue names as constants. Retry with exponential backoff (3 attempts: 2s/4s/8s). One worker per concern. Always handle `worker.on('failed', ...)`.

### WebSocket
Always join user-specific room on connect (`socket.join('user:${userId}')`). Emit to room — never `io.emit()`. Push deltas only. All events typed as `WsEvent` union.

### Groq AI Router
Multi-model fallback chain: `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` → `gemma2-9b-it`. Keep prompts in `api/src/ai/prompts/` — never inline in workers.

### Security
- JWT: access token in Authorization header, refresh token in Redis + httpOnly cookie only
- Rate limit: auth routes 10 req/15min per IP; API routes 120 req/min per user
- `helmet()` must be first middleware
- CORS: whitelist only — never `origin: '*'`
- Never build MongoDB filter objects from raw `req.body`

---

## Dashboard — React Rules

### Component Structure (always in this order)
1. Imports (external → internal → types)
2. Types/interfaces (`[ComponentName]Props`)
3. Component function
4. Sub-components (only if tiny + tightly coupled)
5. Helper functions

### Rules
- **Named exports always** — never `export default`
- Functional components only — no class components
- One component per file (unless sub-component is <20 lines and parent-only)
- Props destructured in signature — never `props.something` in body
- Custom hooks always start with `use`, return typed objects, one concern each

### Folder Structure
```
dashboard/src/
├── components/
│   ├── ui/        ← primitives, zero business logic
│   ├── charts/    ← Recharts wrappers
│   ├── layout/    ← Nav, Sidebar, PageShell
│   └── features/  ← domain composites
├── pages/         ← one file per route
├── hooks/         ← custom hooks
├── store/         ← Zustand stores
├── api/           ← React Query hooks
├── types/shared/  ← identical to api + extension shared types
└── utils/
```
Dependency flows upward only: `ui → charts → features → pages`. Never reverse.

### Tailwind
- Tailwind only — no inline styles, no CSS modules (except dynamic values Tailwind can't express)
- Use `cn()` for conditional classes
- Every `ui/` component must accept and forward `className`

### Performance
- `useMemo` for expensive derivations
- `useCallback` for callbacks passed to children
- Lazy load heavy routes with `React.lazy()`
- Wrap in `<Suspense fallback={<PageSkeleton />}>`

### Accessibility
- `aria-label` on all icon-only buttons
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`
- All interactive elements keyboard-navigable

---

## Dashboard — State Management

```
Server state  → React Query (useQuery, useMutation)
Client state  → Zustand (UI state, active mode, panel open/closed)
Form state    → local useState
Derived state → useMemo inside component — never store derived values
```
Never put server data in Zustand. Never fetch with `useState + useEffect`.

### React Query
- Query keys as constants in `QUERY_KEYS` object — never inline strings
- Wrap `useQuery` in custom hooks — never call directly in components
- `staleTime: 30_000` for metrics; adjust per endpoint
- Mutations always invalidate relevant queries on success
- Use optimistic updates for instant UI feedback

### Zustand
- One store per domain (`ui.store.ts`, `mode.store.ts`, `auth.store.ts`)
- Actions co-located with state in the store definition
- Subscribe to individual slices — never the whole store

### WebSocket + React Query
WebSocket pushes updates into React Query cache via `queryClient.setQueryData()`. Single source of truth.

---

## Dashboard — Design System

### Colors — CSS Variables Only
Never hardcode hex values. Always use CSS tokens or Tailwind mapped classes.
```
--color-primary:       #0891B2   buttons, links, active nav
--color-primary-700:   #0E7490   hover
--color-bg-page:       #F0F9FF   page background
--color-bg-card:       #FFFFFF   cards
--color-text-heading:  #0F172A
--color-text-body:     #334155
--color-text-muted:    #94A3B8   labels, timestamps
--color-success:       #16A34A
--color-danger:        #DC2626
```

### Typography
- Display/headings → `font-display` (Plus Jakarta Sans) 600/700
- UI text → `font-sans` (Inter) 400/500/600/700
- **All metric numbers → `tabular-nums` + `min-width: 4ch` — no exceptions**
- Filenames/paths → `font-mono` (JetBrains Mono)

### Glass Effects
Applied ONLY to: metric cards · chart containers · AI insight cards.
NEVER on: nav · tooltips · modals · toasts · buttons.
```css
.card-metric-glass  → bg white/80, blur(20px), teal border
.chart-glass        → bg white/65, blur(12px), teal border
/* @supports not (backdrop-filter) → solid white fallback */
```

### Animations
```
✅ Safe (GPU):    transform · opacity · box-shadow · color · background-color
❌ Never animate: width · height · margin · padding · top · left

Timings: hover 200ms · nav indicator 250ms · page enter 200ms · count-up 800ms
ease-spring → ONLY streak milestones and mode switches
All others  → ease-out
```

### Shadows — Teal-Tinted Always
Never use Tailwind's default grey shadows. Use: `shadow-sm`, `shadow-md`, `shadow-glass`, `shadow-glass-hover`, `shadow-primary`.

### Spacing
8px base grid. Always `gap` between cards — never `margin`.

### Loading States
Skeleton screens for all data loading — never spinners for page/card loads. Every `ui/` component needs a matching `[Component]Skeleton`.

### Recharts
Always inside `ResponsiveContainer`. Use shared `CHART_COLORS`, `CHART_AXIS_STYLE`, `CHART_TOOLTIP_STYLE` constants. `Line: dot=false, animationDuration=800`. `Bar: radius={[4,4,0,0]}`. `Area: fillOpacity={0.12}`. Never fixed pixel width.

---

## Extension — Chrome MV3 Rules

### Architecture
```
service-worker/  → background.ts — event listeners, message routing, chrome.alarms
side-panel/      → React app, primary UI surface
popup/           → React app, minimal UI (mode switcher, quick stats)
content/         → content.ts — reads tab metadata only, never modifies page
utils/           → shared pure functions, message type constants
```

### Service Worker — Critical Rules
- ALL event listeners registered at **top level** — never inside callbacks (SW can restart any time)
- No persistent module-level variables — always read state from `chrome.storage`
- Return `true` from `onMessage` listener for async responses
- Use `chrome.alarms` for periodic tasks

### Message Passing
All messages typed as discriminated union `ExtensionMessage`. Use typed `sendMessage<T>()` helper — never raw `chrome.runtime.sendMessage` with unknown payload.

### Storage
Typed `getStorage<K>()` / `setStorage<K>()` helpers. `chrome.storage.local` for session data (10MB). `chrome.storage.sync` for user preferences only (100KB).

### Permissions
Principle of least privilege. Never request permissions speculatively. Never `"host_permissions": ["<all_urls>"]` unless absolutely required.

### Tabs API
Domain only — never store full URLs with params. Filter out `chrome://`, `extension://`, `about:` pages.

### API Communication
All calls use `fetch` with exponential backoff retry (3 attempts). Never XMLHttpRequest.

### No Remote Code
Never `eval()`, `new Function()`, or remote script tags. All code must be bundled. (Chrome Web Store will reject.)

---

## Shared Types Contract

All dates as ISO strings (`string`) — never `Date` objects. All IDs as `string` — never `ObjectId`. No Mongoose types in shared files. All API responses use envelope:
```typescript
interface ApiSuccess<T> { success: true;  data: T }
interface ApiError      { success: false; error: { code: string; message: string; issues?: unknown[] } }
type ApiResponse<T> = ApiSuccess<T> | ApiError
```

Core shared files: `mode.types.ts`, `download.types.ts`, `metrics.types.ts`, `user.types.ts`, `tab.types.ts`, `ai.types.ts`, `websocket.types.ts`

---

## Environment & Deployment

```
api/        → Railway/Render   (root: api/,        build: npm run build, start: npm start)
dashboard/  → Vercel/Netlify   (root: dashboard/,  build: npm run build, output: dist/)
extension/  → Chrome Web Store (root: extension/,  build: npm run build:ext)
```

CI is path-filtered — changes to `dashboard/**` never trigger api pipeline and vice versa.

Never commit `.env` files. Always commit `.env.example` with empty values. Validate all env vars with Zod at startup. No `console.log` in production. CORS origins updated to production URLs before deploy.
