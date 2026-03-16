# 🏄 SurfBud — Technical Architecture

> **Version:** 1.2 — March 2026
> **Stack:** TypeScript · React · Node.js · Express · MongoDB · Redis · Socket.IO · BullMQ · Groq
> **Structure:** Single GitHub repository · Three folders · Independent deployments via path-filtered CI

> ⚠️ **Product Scope Note:**
> SurfBud is currently in full-product development phase. **There is no Free vs Pro tier distinction at this stage.** All features described in this document are built as a single, unified product. Subscription tiers, feature gating, and monetization are deferred until after the full product is built, validated, and ready for public launch. Every user during development has access to the complete feature set.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Tech Stack Reference](#3-tech-stack-reference)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Chrome Extension Architecture](#5-chrome-extension-architecture)
6. [Backend Architecture — MVC + Layered](#6-backend-architecture--mvc--layered)
7. [AI Router — Groq Multi-Model Fallback](#7-ai-router--groq-multi-model-fallback)
8. [WebSocket Architecture](#8-websocket-architecture)
9. [Pre-Materialized Metrics System](#9-pre-materialized-metrics-system)
10. [Database Design](#10-database-design)
11. [Dashboard & Charts Architecture](#11-dashboard--charts-architecture)
12. [Side Panel Architecture](#12-side-panel-architecture)
13. [Authentication & Security](#13-authentication--security)
14. [Job Queue System](#14-job-queue-system)
15. [Shared Types Strategy](#15-shared-types-strategy)
16. [Environment & Configuration](#16-environment--configuration)
17. [Scalability Path](#17-scalability-path)
18. [Design Principles Summary](#18-design-principles-summary)

---

## 1. Project Overview

SurfBud is a full-stack, AI-powered browser productivity platform built as:

- A **Chrome Extension** (Manifest V3) with a persistent **Side Panel** as the primary UI
- A **React Dashboard** web app for deep analytics, metrics, and configuration
- A **Node.js + Express API** backend with real-time WebSocket support
- An **AI layer** powered by Groq's free tier with a multi-model fallback chain

### Development Philosophy

> **Build the full product first. Monetize later.**
>
> The entire product — every feature, every AI capability, every chart — is built as one complete experience. No feature is hidden behind a paywall during development. Subscription tiers (Free / Pro) are a future concern, designed and implemented only after the full product is built, tested, and ready for real users. This keeps the codebase simple, the architecture clean, and the focus where it belongs: shipping a great product.

### Current Development Status

| Phase | Status | Description |
|---|---|---|
| **Phase 1 — Full Product Build** | 🟢 Active | Build every feature for all users, no tier gating |
| **Phase 2 — Beta** | ⏳ Pending | Real user testing, feedback, iteration |
| **Phase 3 — Monetization** | ⏳ Deferred | Design and implement Free / Pro tiers after Phase 2 |

### Core Feature Pillars

| Pillar | Description |
|---|---|
| **Contextual Modes** | Dev Mode, Chill Mode, Deep Work, custom — open tab sets, apply blocking rules, start timers |
| **AI-Powered Insights** | Natural language summaries, nudges, suggestions via Groq multi-model chain |
| **Streak & Habit Tracking** | Behavioral streaks tied to mode usage, gamified milestones |
| **Download Monitor** | Real-time download tracking, categorization, unopened file alerts |
| **Live Metrics Dashboard** | Pre-computed charts via Recharts, WebSocket-powered live updates |

---

## 2. Repository Structure

SurfBud lives in a **single GitHub repository** with three clearly separated folders — one per deployable unit. There are no workspaces, no package managers linking them together, and no shared build pipeline. Each folder is a completely self-contained project that happens to live in the same repo.

```
github.com/you/surfbud
├── api/          →  deploys to AWS EC2 / ECS
├── dashboard/    →  deploys to Vercel / Netlify
├── extension/    →  builds to /dist zip → Chrome Web Store
└── docs/         →  all project documentation
```

### Why One Repo, Three Folders

| Concern | Answer |
|---|---|
| **Do deployments stay independent?** | Yes — path-filtered GitHub Actions. A change in `dashboard/` never triggers the `api/` pipeline |
| **Does Chrome Web Store still work?** | Yes — Vercel, AWS, and Chrome Web Store all support deploying from a subfolder |
| **Is it a monorepo with workspaces?** | No — no `pnpm-workspace.yaml`, no Turborepo, no linking. Three plain independent projects in one repo |
| **Why not three separate repos?** | You are one developer. One clone, one issue board, one PR history, one portfolio link. Cross-cutting changes (e.g. updating a shared type) happen in a single commit |

### Top-Level Structure

```
surfbud/                             ← github.com/you/surfbud
│
├── .github/
│   └── workflows/
│       ├── api.yml                  ← triggers only on changes to api/**
│       ├── dashboard.yml            ← triggers only on changes to dashboard/**
│       └── extension.yml            ← triggers only on changes to extension/**
│
├── api/                             ← Node.js + Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts
│   │   │   ├── redis.ts
│   │   │   ├── socket.ts
│   │   │   ├── bullmq.ts
│   │   │   └── env.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── mode.routes.ts
│   │   │   ├── session.routes.ts
│   │   │   ├── download.routes.ts
│   │   │   ├── streak.routes.ts
│   │   │   ├── insight.routes.ts
│   │   │   ├── metrics.routes.ts
│   │   │   └── ai.routes.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   │   └── ai/
│   │   │       ├── ai.service.ts
│   │   │       ├── model.registry.ts
│   │   │       ├── model.router.ts
│   │   │       ├── circuit.breaker.ts
│   │   │       ├── prompt.builder.ts
│   │   │       └── response.parser.ts
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── websocket/
│   │   ├── jobs/
│   │   ├── types/
│   │   │   └── shared/              ← local copy of shared types
│   │   │       ├── mode.types.ts
│   │   │       ├── metrics.types.ts
│   │   │       ├── socket.types.ts
│   │   │       ├── download.types.ts
│   │   │       ├── streak.types.ts
│   │   │       └── ai.types.ts
│   │   └── utils/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── dashboard/                       ← React + Vite web app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── charts/
│   │   └── types/
│   │       └── shared/              ← local copy of shared types
│   │           ├── mode.types.ts
│   │           ├── metrics.types.ts
│   │           ├── socket.types.ts
│   │           ├── download.types.ts
│   │           ├── streak.types.ts
│   │           └── ai.types.ts
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── README.md
│
├── extension/                       ← Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── background/              ← Service Worker
│   │   ├── sidepanel/               ← React app — PRIMARY UI
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── index.tsx
│   │   ├── popup/                   ← React app — quick actions
│   │   │   ├── components/
│   │   │   └── index.tsx
│   │   ├── content/                 ← Content scripts
│   │   └── types/
│   │       └── shared/              ← local copy of shared types
│   │           ├── mode.types.ts
│   │           ├── metrics.types.ts
│   │           ├── socket.types.ts
│   │           ├── download.types.ts
│   │           ├── streak.types.ts
│   │           └── ai.types.ts
│   ├── public/
│   │   └── icons/
│   ├── manifest.json
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts               ← multi-entry build (background, sidepanel, popup, content)
│   ├── tsconfig.json
│   └── README.md
│
├── docs/                            ← all project documentation
│   ├── ARCHITECTURE.md              ← this file
│   ├── MARKET_ANALYSIS.md
│   ├── COMPETITIVE_INTELLIGENCE.md
│   ├── API_REFERENCE.md             ← (future)
│   ├── FEATURE_ROADMAP.md           ← (future)
│   ├── DATABASE_SCHEMA.md           ← (future)
│   └── EXTENSION_GUIDE.md           ← (future)
│
├── .gitignore                       ← covers all three folders
└── README.md                        ← top-level project overview + quick start
```

### CI/CD — Path Filters Keep Deployments Isolated

This is the critical piece that makes one repo behave like three independent repos for deployment. Each workflow only fires when its own folder changes.

```yaml
# .github/workflows/api.yml
name: Deploy API
on:
  push:
    branches: [main]
    paths:
      - 'api/**'        ← ONLY fires when something inside api/ changes
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install & Build
        working-directory: ./api
        run: npm install && npm run build
      - name: Deploy to AWS EC2/ECS
        run: # aws ecs update-service or ssh deploy script
```

```yaml
# .github/workflows/dashboard.yml
name: Deploy Dashboard
on:
  push:
    branches: [main]
    paths:
      - 'dashboard/**'  ← ONLY fires when something inside dashboard/ changes
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        run: vercel --prod --cwd ./dashboard
```

```yaml
# .github/workflows/extension.yml
name: Build Extension
on:
  push:
    branches: [main]
    paths:
      - 'extension/**'  ← ONLY fires when something inside extension/ changes
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Extension
        working-directory: ./extension
        run: npm install && npm run build
      - name: Upload dist as artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-dist
          path: extension/dist/   ← download this zip and submit to Chrome Web Store
```

> A fix in `api/src/services/mode.service.ts` triggers **only** the API deployment.
> The dashboard and extension pipelines do not run. Zero interference.

### Branch Strategy

```
main              ← protected, always deployable
dev               ← integration branch, merge features here first

feature/api/      ← e.g. feature/api/ai-router
feature/dash/     ← e.g. feature/dash/streak-chart
feature/ext/      ← e.g. feature/ext/side-panel-ui
fix/api/
fix/dash/
fix/ext/
```

Prefixing with `api/`, `dash/`, or `ext/` makes it immediately clear which part of the product a branch belongs to. Combined with path-filtered CI, only the relevant pipeline fires on each merge.

### Shared Types — Same Commit Rule

Since `src/types/shared/` is duplicated across all three folders, any change must be applied to all three in the same commit:

```bash
# Example: adding a new field to ModeSession

# Edit all three in one go
vim api/src/types/shared/mode.types.ts
vim dashboard/src/types/shared/mode.types.ts
vim extension/src/types/shared/mode.types.ts

# Commit all three together
git add api/src/types/shared/mode.types.ts \
        dashboard/src/types/shared/mode.types.ts \
        extension/src/types/shared/mode.types.ts

git commit -m "types: add color field to ModeSession"
```

One commit. All three folders updated. Git history shows exactly when and why the type changed.

### How the Three Folders Communicate at Runtime

The folders share no code at build time. They share data at runtime through the API and WebSocket only.

```
extension/
  │
  │  HTTPS REST  (tab events, mode switches, downloads)
  │  ─────────────────────────────────────────────────▶  api/
  │                                                         │
  │                                                         │  Socket.IO push
  │  ◀──────────────────────────────────────────────────── │
  │  (live updates: mode changed, insight ready,            │
  │   download complete, streak milestone)                  │
  │                                                         │
dashboard/                                                   │
  │                                                         │
  │  HTTPS REST  (initial data load, chart snapshots)       │
  │  ─────────────────────────────────────────────────▶  api/
  │                                                         │
  │  Socket.IO   (live chart deltas, AI nudges)             │
  │  ◀──────────────────────────────────────────────────── │
```

---

## 3. Tech Stack Reference

### Backend
| Technology | Role | Why |
|---|---|---|
| **Node.js + Express** | API server | Industry standard, excellent TypeScript support |
| **TypeScript** | Language | Type safety across all layers, consistent shared types across repos |
| **MongoDB + Mongoose** | Primary database | Document model fits metrics/modes/sessions naturally |
| **Redis** | Cache + queues + pub/sub | Rate limiting, AI cache, BullMQ job queues, Socket.IO adapter |
| **Socket.IO** | WebSocket server | Real-time events to dashboard + side panel |
| **BullMQ** | Job queue | Async AI jobs, cron tasks, metrics rollups — never blocks the API |
| **Zod** | Validation | Runtime schema validation on all incoming requests |
| **JWT** | Authentication | Stateless auth — single token, 7 day expiry |
| **IANA Timezone** | User preference | Stored on User doc · auto-detected from client · drives all date resets |

### AI Layer
| Technology | Role |
|---|---|
| **Groq SDK** | Primary AI inference — free tier, 500-1000+ tokens/sec |
| **openai/gpt-oss-120b** | Tier 1 — deep weekly insights, complex reasoning |
| **openai/gpt-oss-20b** | Tier 2 — daily nudges, tool calls, chat interface |
| **llama-3.3-70b-versatile** | Tier 3 — summaries, suggestions, fallback |
| **mixtral-8x7b-32768** | Tier 4 — mid-complexity, high volume |
| **llama-3.1-8b-instant** | Tier 5 — real-time hints, lightweight tasks |
| **Redis** | AI response cache — TTL-based, prevents redundant API calls |

### Frontend
| Technology | Role |
|---|---|
| **React + Vite** | Dashboard web app |
| **TypeScript** | Type safety, local shared types in `src/types/shared/` |
| **Tailwind CSS** | Utility-first styling |
| **Recharts** | Chart library for all metrics visualizations |
| **Zustand** | Lightweight global state management |
| **Socket.IO Client** | WebSocket connection to backend |
| **React Query** | Server state, caching, background refetching |

### Chrome Extension
| Technology | Role |
|---|---|
| **Manifest V3** | Extension platform (future-proofed) |
| **React** | Side panel UI + popup UI |
| **Chrome Side Panel API** | Primary persistent UI surface |
| **Chrome Downloads API** | Download monitoring |
| **Chrome Tabs API** | Tab event tracking, mode management |
| **Service Worker** | Background event processing |

### Infrastructure
| Technology | Role |
|---|---|
| **AWS EC2 / ECS** | API hosting |
| **Vercel / Netlify** | Dashboard static hosting |
| **MongoDB Atlas** | Managed MongoDB |
| **AWS ElastiCache** | Managed Redis (prod) · Docker locally |
| **AWS SES** | Transactional email (streak digests) |

---

## 4. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHROME BROWSER                              │
│                                                                 │
│  ┌─────────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Side Panel    │    │    Popup     │    │   Content     │  │
│  │  (React app)    │    │ (Quick Acts) │    │   Scripts     │  │
│  │  PRIMARY UI     │    └──────┬───────┘    └──────┬────────┘  │
│  │  WebSocket ◀────│──────────┐│                   │           │
│  └────────┬────────┘          ││                   │           │
│           │                   ││                   │           │
│  ┌────────▼───────────────────▼▼───────────────────▼────────┐  │
│  │              Background Service Worker                    │  │
│  │     (tab events · download API · mode logic · REST)       │  │
│  └────────────────────────────┬──────────────────────────────┘  │
└───────────────────────────────│─────────────────────────────────┘
                                │ HTTPS REST
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                        NODE.JS API                            │
│                                                               │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  REST API   │   │  Socket.IO   │   │  BullMQ Workers  │   │
│  │  (Express)  │   │  (WS Server) │   │  (Async Jobs)    │   │
│  └──────┬──────┘   └──────┬───────┘   └────────┬─────────┘   │
│         │                 │                     │             │
│  ┌──────▼─────────────────▼─────────────────────▼──────────┐  │
│  │                    SERVICE LAYER                         │  │
│  │  ModeService · AIService · StreakService · Metrics...    │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                  REPOSITORY LAYER                        │  │
│  └──────────┬───────────────────────────────────┬───────────┘  │
│             │                                   │              │
│      ┌──────▼──────┐                    ┌───────▼──────┐       │
│      │   MongoDB   │                    │    Redis     │       │
│      │ (persistent)│                    │(cache+queues)│       │
│      └─────────────┘                    └──────────────┘       │
└───────────────────────────────────────────────────────────────┘
                                │
                         WebSocket push
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                    REACT DASHBOARD                             │
│         (Recharts · Zustand · React Query · Socket.IO)        │
│    Live charts · Metrics · Mode builder · AI insights feed    │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Chrome Extension Architecture

### Manifest V3 Structure

```json
{
  "manifest_version": 3,
  "name": "SurfBud",
  "permissions": [
    "tabs",
    "downloads",
    "storage",
    "sidePanel",
    "notifications",
    "alarms"
  ],
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/index.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/index.js"]
    }
  ]
}
```

### Three UI Surfaces

```
┌─────────────────────────────────────────────────────┐
│  SIDE PANEL (Primary — persistent, always visible)  │
│  ┌──────────────────────────────────────────────┐   │
│  │  🏄 SurfBud          [Dev Mode 🟢] [2:34:00] │   │ ← Status bar (live WS)
│  ├──────────────────────────────────────────────┤   │
│  │  Focus Score: 87 ████████░░                  │   │ ← Live metric
│  │  Streak: 🔥 14 days                          │   │ ← Live streak
│  ├──────────────────────────────────────────────┤   │
│  │  📥 downloads/resume_v3.pdf    2 mins ago    │   │ ← Live download feed
│  │  🌐 github.com/surfbud         active tab    │   │
│  │  💡 "You've been focused for 2h — great!"   │   │ ← AI nudge
│  ├──────────────────────────────────────────────┤   │
│  │  [Switch Mode] [Focus] [Open Dashboard]      │   │ ← Quick actions
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│  POPUP (Quick actions only)  │
│  One-click mode switch       │
│  Streak check-in             │
│  Start focus session         │
│  Open full dashboard ↗       │
└──────────────────────────────┘
```

### Background Service Worker — Event Flow

The service worker is **stateless** (Manifest V3 can sleep). It fires events and calls the REST API — it does not maintain a WebSocket connection.

```typescript
// background/index.ts

// Tab events → REST API
chrome.tabs.onActivated.addListener(async (info) => {
  await api.post('/sessions/tab-event', {
    type: 'TAB_ACTIVATED',
    tabId: info.tabId,
    timestamp: Date.now()
  })
})

// Download events → REST API
chrome.downloads.onCreated.addListener(async (item) => {
  await api.post('/downloads', {
    filename: item.filename,
    url: item.url,
    startTime: item.startTime,
    state: item.state
  })
})

// Mode switch → REST API
const activateMode = async (modeId: string) => {
  const mode = await api.post(`/modes/${modeId}/activate`)
  // Open tab set for this mode
  mode.tabs.forEach(url => chrome.tabs.create({ url }))
  // Apply blocking rules
  applyBlockingRules(mode.blockedDomains)
}
```

### Communication Architecture

```
Service Worker          Backend             Side Panel / Dashboard
(fires & forgets)       (processes)         (receives & renders)
      │                     │                       │
      │── REST POST ────────▶│                       │
      │   (tab event)        │── Socket.IO emit ────▶│
      │                     │   (dashboard:update)   │
      │── REST POST ────────▶│                       │
      │   (download)         │── Socket.IO emit ────▶│
      │                     │   (download:new)       │
```

> **Why no WebSocket in service worker?**
> Manifest V3 service workers can be terminated by Chrome at any time. A WebSocket in a service worker will drop silently. The side panel maintains the persistent WebSocket connection instead.

---

## 6. Backend Architecture — MVC + Layered

### The Request Lifecycle

```
Incoming Request
      │
      ▼
┌─────────────┐
│   Router    │  → defines route, attaches middleware chain
└──────┬──────┘
       │
┌──────▼──────┐
│  Middleware │  → auth → validate → rateLimit → log
└──────┬──────┘
       │
┌──────▼──────┐
│ Controller  │  → extract params from req → call service → return res
└──────┬──────┘
       │
┌──────▼──────┐
│   Service   │  → ALL business logic lives here, nothing else
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │  → ALL database queries live here, nothing else
└──────┬──────┘
       │
┌──────▼──────┐
│    Model    │  → Mongoose schema + TypeScript interface
└──────┬──────┘
       │
┌──────▼──────┐
│  MongoDB    │
└─────────────┘
```

### Full Folder Structure

```
api/src/
│
├── config/
│   ├── db.ts               ← MongoDB connection + retry logic
│   ├── redis.ts            ← Redis client (ioredis)
│   ├── socket.ts           ← Socket.IO server setup
│   ├── bullmq.ts           ← Queue definitions
│   └── env.ts              ← Zod-validated environment variables
│
├── routes/
│   ├── index.ts            ← Master router — mounts all sub-routers
│   ├── auth.routes.ts
│   ├── mode.routes.ts
│   ├── session.routes.ts
│   ├── download.routes.ts
│   ├── streak.routes.ts
│   ├── insight.routes.ts
│   ├── metrics.routes.ts   ← All chart data endpoints
│   └── ai.routes.ts        ← Conversational AI interface
│
├── controllers/
│   ├── auth.controller.ts
│   ├── mode.controller.ts
│   ├── session.controller.ts
│   ├── download.controller.ts
│   ├── streak.controller.ts
│   ├── insight.controller.ts
│   ├── metrics.controller.ts   ← Serves pre-computed chart payloads
│   └── ai.controller.ts
│
├── services/
│   ├── auth.service.ts
│   ├── mode.service.ts
│   ├── session.service.ts
│   ├── download.service.ts
│   ├── streak.service.ts
│   ├── insight.service.ts
│   ├── metrics.service.ts      ← Incremental metric updates
│   ├── notification.service.ts
│   └── ai/
│       ├── ai.service.ts           ← Orchestrator
│       ├── model.registry.ts       ← All Groq models + rate limits
│       ├── model.router.ts         ← Picks best available model
│       ├── circuit.breaker.ts      ← Failure tracking per model
│       ├── prompt.builder.ts       ← Model-aware prompt generation
│       └── response.parser.ts      ← Normalise outputs across models
│
├── repositories/
│   ├── user.repository.ts
│   ├── mode.repository.ts
│   ├── session.repository.ts
│   ├── download.repository.ts
│   ├── streak.repository.ts
│   ├── insight.repository.ts
│   └── metrics.repository.ts   ← Reads/writes UserMetrics documents
│
├── models/
│   ├── user.model.ts
│   ├── mode.model.ts
│   ├── session.model.ts
│   ├── download.model.ts
│   ├── streak.model.ts
│   ├── insight.model.ts
│   └── user-metrics.model.ts   ← Pre-materialized metrics document
│
├── middleware/
│   ├── auth.middleware.ts       ← JWT verification
│   ├── validate.middleware.ts   ← Zod schema validation
│   ├── rateLimit.middleware.ts  ← Redis-backed rate limiting
│   └── error.middleware.ts      ← Global error handler
│
├── websocket/
│   ├── socket.manager.ts        ← Connection management, rooms
│   └── events/
│       ├── mode.events.ts
│       ├── metrics.events.ts    ← Pushes chart deltas live
│       ├── download.events.ts
│       ├── streak.events.ts
│       └── insight.events.ts
│
├── jobs/
│   ├── ai.insight.job.ts        ← AI generation worker
│   ├── streak.eval.job.ts       ← Midnight streak evaluator
│   ├── metrics.rollup.job.ts    ← Periodic pre-aggregation
│   └── email.digest.job.ts      ← Weekly email summary
│
└── utils/
    ├── logger.ts
    ├── pagination.ts
    └── date.utils.ts
```

### Layer Rules — Non-Negotiable

```
✅  Router     → imports Middleware + Controller
✅  Controller → imports Service only
✅  Service    → imports Repository + other Services
✅  Repository → imports Model only
✅  Model      → imports nothing (Mongoose schema)

❌  Controller → NEVER imports Repository directly
❌  Service    → NEVER writes raw MongoDB queries
❌  Repository → NEVER contains business logic
❌  Any layer  → NEVER imports from a layer above it
```

### Example — Mode Activation End to End

```typescript
// 1. ROUTE
// mode.routes.ts
router.post(
  '/:id/activate',
  authenticate,                          // middleware: verify JWT
  validate(ActivateModeSchema),          // middleware: Zod validation
  modeController.activate                // controller
)

// 2. CONTROLLER
// mode.controller.ts
activate = async (req: Request, res: Response) => {
  const session = await this.modeService.activateMode(
    req.user.id,
    req.params.id
  )
  res.status(200).json({ success: true, session })
}

// 3. SERVICE
// mode.service.ts
activateMode = async (userId: string, modeId: string): Promise<ModeSession> => {
  const mode = await this.modeRepository.findById(modeId)
  if (!mode) throw new NotFoundError('Mode not found')

  const session = await this.sessionRepository.create({
    userId, modeId, startedAt: new Date()
  })

  // Update pre-materialized metrics (incremental)
  await this.metricsService.onModeActivated(userId, modeId)

  // Queue AI suggestion job (async — does not block response)
  await this.aiQueue.add('mode-suggestion', { userId, modeId })

  // Broadcast to dashboard + side panel via WebSocket
  socketManager.emitToUser(userId, 'mode:activated', { session, mode })

  return session
}

// 4. REPOSITORY
// mode.repository.ts
findById = async (id: string): Promise<Mode | null> => {
  return ModeModel.findById(id).lean()
}
```

---

## 7. AI Router — Groq Multi-Model Fallback

### Model Registry

All models are available to all users. The router selects the best model based on **task complexity**, not user subscription tier.

```typescript
// services/ai/model.registry.ts

export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'openai/gpt-oss-120b',
    tier: 1,
    usedFor: ['weekly_summary', 'deep_insight', 'complex_reasoning'],
    reasoningEffort: 'high',
    tokensPerMinute: 6000,
    requestsPerDay: 1000,
  },
  {
    id: 'openai/gpt-oss-20b',
    tier: 2,
    usedFor: ['daily_nudge', 'chat_interface', 'tool_calls'],
    reasoningEffort: 'medium',
    tokensPerMinute: 10000,
    requestsPerDay: 1000,
  },
  {
    id: 'llama-3.3-70b-versatile',
    tier: 3,
    usedFor: ['summary', 'suggestion', 'fallback'],
    tokensPerMinute: 6000,
    requestsPerDay: 500,         // tokens/day: 500K
  },
  {
    id: 'mixtral-8x7b-32768',
    tier: 4,
    usedFor: ['mid_complexity', 'high_volume'],
    tokensPerMinute: 5000,
    requestsPerDay: 14400,
  },
  {
    id: 'llama-3.1-8b-instant',
    tier: 5,
    usedFor: ['realtime_hint', 'tab_suggestion', 'lightweight'],
    tokensPerMinute: 30000,
    requestsPerDay: 14400,
  },
]
```

### Circuit Breaker + Fallback Chain

```typescript
// services/ai/circuit.breaker.ts

// Each model has a circuit state tracked in Redis
// States: CLOSED (healthy) → OPEN (failing) → HALF_OPEN (testing)

export class CircuitBreaker {
  async isAvailable(modelId: string): Promise<boolean> {
    const state = await redis.get(`circuit:${modelId}`)
    if (state === 'OPEN') return false
    return true
  }

  async recordFailure(modelId: string): Promise<void> {
    const key = `circuit:failures:${modelId}`
    const failures = await redis.incr(key)
    await redis.expire(key, 60)             // reset failure count after 60s

    if (failures >= 3) {
      await redis.set(`circuit:${modelId}`, 'OPEN', 'EX', 60)  // open for 60s
    }
  }

  async recordSuccess(modelId: string): Promise<void> {
    await redis.del(`circuit:${modelId}`)
    await redis.del(`circuit:failures:${modelId}`)
  }
}
```

```typescript
// services/ai/model.router.ts

export class ModelRouter {
  async route(task: AITask): Promise<AIResponse> {

    // 1. Filter models appropriate for this task type
    const candidates = MODEL_REGISTRY.filter(m => m.usedFor.includes(task.type))

    for (const model of candidates) {

      // 2. Check circuit breaker
      const available = await this.circuitBreaker.isAvailable(model.id)
      if (!available) continue

      // 3. Check rate limit headroom in Redis
      const withinLimit = await this.checkRateLimit(model.id)
      if (!withinLimit) continue

      // 4. Check response cache — never call AI for cached content
      const cached = await this.cache.get(task.cacheKey)
      if (cached) return cached

      try {
        // 5. Build model-appropriate prompt
        const prompt = this.promptBuilder.build(task, model.id)

        // 6. Call Groq
        const response = await groq.chat.completions.create({
          model: model.id,
          messages: prompt,
          reasoning_effort: model.reasoningEffort ?? undefined,
        })

        // 7. Parse + normalise response
        const result = this.responseParser.parse(response, model.id)

        // 8. Cache result with TTL
        await this.cache.set(task.cacheKey, result, task.cacheTTL)

        // 9. Record success, reset circuit
        await this.circuitBreaker.recordSuccess(model.id)

        return result

      } catch (error) {
        if (error.status === 429) {
          // Rate limited — record failure, try next model
          await this.circuitBreaker.recordFailure(model.id)
          continue
        }
        throw error
      }
    }

    // 10. All models exhausted → serve stale cache
    const stale = await this.cache.getStale(task.cacheKey)
    if (stale) return { ...stale, fromStaleCache: true }

    // 11. Absolute last resort → template response
    return this.templateFallback(task.type)
  }
}
```

### Full Fallback Chain Visualized

```
AI Request (e.g. weekly summary)
        │
        ▼
Is gpt-oss-120b circuit CLOSED and within rate limit?
  YES → call Groq → cache result → return ✅
  NO  ↓
Is gpt-oss-20b circuit CLOSED and within rate limit?
  YES → call Groq → cache result → return ✅
  NO  ↓
Is llama-3.3-70b circuit CLOSED and within rate limit?
  YES → call Groq → cache result → return ✅
  NO  ↓
Is mixtral-8x7b circuit CLOSED and within rate limit?
  YES → call Groq → cache result → return ✅
  NO  ↓
Is llama-3.1-8b circuit CLOSED and within rate limit?
  YES → call Groq → cache result → return ✅
  NO  ↓
Is there a cached response (even stale)?
  YES → return stale cache with flag ✅
  NO  ↓
Return pre-written template response — user never sees an error ✅
```

### Prompt Builder — Model-Aware

```typescript
// services/ai/prompt.builder.ts
// Different models need different prompt styles

build(task: AITask, modelId: string): ChatMessage[] {
  const isLargeModel = modelId.includes('120b') || modelId.includes('70b')

  if (isLargeModel) {
    // Large models handle rich, contextual prompts
    return [
      { role: 'system', content: SURFBUD_SYSTEM_PROMPT_DETAILED },
      { role: 'user', content: this.buildRichPrompt(task) }
    ]
  } else {
    // Smaller models need concise, structured prompts
    return [
      { role: 'system', content: SURFBUD_SYSTEM_PROMPT_CONCISE },
      { role: 'user', content: this.buildStructuredPrompt(task) }
    ]
  }
}
```

---

## 8. WebSocket Architecture

### Event Taxonomy

All socket events follow a `domain:action` naming convention.

```typescript
// packages/types/src/socket.types.ts

// Extension → Backend (ingress events)
export type ExtensionEvent =
  | 'mode:activate'
  | 'mode:deactivate'
  | 'tab:opened'
  | 'tab:closed'
  | 'download:started'
  | 'download:completed'
  | 'focus:ping'            // heartbeat every 30s while mode active

// Backend → Dashboard + Side Panel (broadcast events)
export type ServerEvent =
  | 'dashboard:mode:updated'
  | 'dashboard:metrics:delta'    // single new data point for chart
  | 'dashboard:download:new'
  | 'dashboard:download:updated'
  | 'dashboard:streak:updated'
  | 'dashboard:insight:new'
  | 'dashboard:focus:score'      // live focus score tick
  | 'dashboard:nudge'            // AI proactive nudge
```

### Connection Strategy

```
Side Panel (React mini-app)          Full Dashboard (React web app)
    │                                        │
    │  Subscribes to lightweight events      │  Subscribes to ALL events
    │  ─────────────────────────────         │  ───────────────────────
    │  • focus:score (live)                  │  • All metric deltas
    │  • mode:updated                        │  • Chart data streams
    │  • download:new (toast)                │  • AI insight feed
    │  • streak:updated                      │  • Historical analytics
    │  • nudge (AI message)                  │  • Team events (future)
    └──────────────────┐                     └──────────────┐
                       │                                    │
                       └──────────── Socket.IO ─────────────┘
                                         │
                                    Backend API
                               (emits to user room)
```

### Socket Manager

```typescript
// websocket/socket.manager.ts

export class SocketManager {
  private io: Server

  // Each user gets their own room — all their devices listen together
  joinUserRoom(socket: Socket, userId: string) {
    socket.join(`user:${userId}`)
  }

  // Emit to all of a user's connected clients (side panel + dashboard)
  emitToUser(userId: string, event: ServerEvent, data: unknown) {
    this.io.to(`user:${userId}`).emit(event, data)
  }

  // Side panel only — for lightweight, non-chart events
  emitToSidePanel(userId: string, event: ServerEvent, data: unknown) {
    this.io.to(`sidepanel:${userId}`).emit(event, data)
  }
}
```

### Live Chart Update Strategy

```
Initial Dashboard Load
  → REST API call → returns full pre-computed metrics document
  → Recharts renders full chart from snapshot

Live Updates (while dashboard is open)
  → WebSocket emits delta: { date: '2026-03-04', score: 87 }
  → React appends new data point to chart state
  → Recharts re-renders ONLY the new point — no full reload
  → Smooth, efficient, no flicker
```

---

## 9. Pre-Materialized Metrics System

> This is the most important performance decision in SurfBud's backend.
> **Metrics are never calculated on demand. They are always pre-computed and stored.**

### The UserMetrics Document

```typescript
// models/user-metrics.model.ts

interface UserMetrics {
  userId: ObjectId                    // one document per user — full access, no tier gating

  // ── Updated on every mode session end (incremental $inc)
  modeTime: {
    modeId: ObjectId
    modeName: string
    color: string
    totalMinutes: number
    sessionsCount: number
    lastActive: Date
  }[]

  // ── Updated daily at midnight (BullMQ cron)
  dailyFocusScores: {
    date: string                      // 'YYYY-MM-DD'
    score: number                     // 0–100
    focusedMinutes: number
    distractedMinutes: number
    dominantMode: string
    streakActive: boolean
  }[]                                 // keep last 365 entries

  // ── Updated on every download completion (incremental)
  downloadStats: {
    total: number
    byCategory: {
      category: 'document' | 'image' | 'code' | 'media' | 'archive' | 'other'
      count: number
      totalSizeBytes: number
    }[]
    unopenedCount: number
    lastDownloadAt: Date
  }

  // ── Updated daily at midnight (BullMQ cron)
  streakCalendar: {
    date: string
    streakActive: boolean
    modesUsed: string[]
    focusScore: number
  }[]                                 // keep last 365 entries (GitHub heatmap style)

  // ── Updated weekly on Sunday (BullMQ cron)
  weeklySnapshots: {
    weekStart: string
    totalFocusedMinutes: number
    avgFocusScore: number
    topSites: { domain: string, visits: number, timeSpent: number }[]
    topMode: string
    streakDays: number
    aiSummary: string                 // pre-generated AI insight stored here
  }[]                                 // keep last 52 weeks

  // ── Rolling 30-day top sites (updated on tab close)
  topSites: {
    domain: string
    visitCount: number
    totalTimeSeconds: number
    lastVisited: Date
    associatedMode: string
  }[]

  // ── Metadata
  lastUpdated: Date
  dataVersion: number                 // for schema migrations
}
```

### Two Update Strategies

**Strategy 1 — Incremental (event-triggered, real-time)**

Used for: download stats, mode time, top sites

```typescript
// services/metrics.service.ts

// Called when a download completes — atomic update, no recalculation
async onDownloadCompleted(userId: string, download: Download) {
  await UserMetricsModel.updateOne(
    { userId },
    {
      $inc: {
        'downloadStats.total': 1,
        'downloadStats.byCategory.$[cat].count': 1,
        'downloadStats.byCategory.$[cat].totalSizeBytes': download.fileSize,
      },
      $set: { 'downloadStats.lastDownloadAt': new Date() }
    },
    { arrayFilters: [{ 'cat.category': download.category }] }
  )
}

// Called when a mode session ends
async onModeSessionEnd(userId: string, modeId: string, durationMinutes: number) {
  await UserMetricsModel.updateOne(
    { userId },
    {
      $inc: {
        'modeTime.$[mode].totalMinutes': durationMinutes,
        'modeTime.$[mode].sessionsCount': 1,
      },
      $set: { 'modeTime.$[mode].lastActive': new Date() }
    },
    { arrayFilters: [{ 'mode.modeId': modeId }] }
  )
}
```

**Strategy 2 — Scheduled Rollup (BullMQ cron)**

Used for: daily focus scores, streak calendar, weekly snapshots

```typescript
// jobs/metrics.rollup.job.ts

// Runs every day at 00:00 — processes yesterday's raw events
async processDailyRollup(userId: string) {
  const yesterday = getYesterday()

  // Query raw session events for yesterday only
  const sessions = await SessionModel.find({
    userId,
    date: yesterday
  })

  // Compute aggregated day score
  const focusScore = computeFocusScore(sessions)
  const focusedMinutes = sumFocusedMinutes(sessions)

  // Write single pre-computed entry — fast forever after
  await UserMetricsModel.updateOne(
    { userId },
    {
      $push: {
        dailyFocusScores: {
          $each: [{ date: yesterday, score: focusScore, focusedMinutes }],
          $slice: -365           // keep last 365 days only
        }
      },
      $set: { lastUpdated: new Date() }
    }
  )
}
```

### Chart Query Performance

Because of pre-materialization, **every chart endpoint is O(1)**:

```typescript
// controllers/metrics.controller.ts

// Focus score line chart — last 30 days
getFocusChart = async (req: Request, res: Response) => {
  const metrics = await this.metricsRepository.findByUserId(req.user.id)
  // Already computed — just slice the array
  res.json(metrics.dailyFocusScores.slice(-30))
  // Response time: < 20ms regardless of how long user has used SurfBud
}

// Mode time pie chart
getModeTimeChart = async (req: Request, res: Response) => {
  const metrics = await this.metricsRepository.findByUserId(req.user.id)
  res.json(metrics.modeTime)
  // Response time: < 20ms
}

// Streak calendar heatmap (GitHub-style)
getStreakCalendar = async (req: Request, res: Response) => {
  const metrics = await this.metricsRepository.findByUserId(req.user.id)
  res.json(metrics.streakCalendar.slice(-365))
  // Response time: < 20ms
}
```

### dataVersion — Schema Migration Strategy

```typescript
// When you need to change the metrics schema in the future:

// 1. Increment CURRENT_METRICS_VERSION
const CURRENT_METRICS_VERSION = 2

// 2. Migration job finds all outdated documents
await UserMetricsModel.find({ dataVersion: { $lt: CURRENT_METRICS_VERSION } })
  .cursor()
  .eachAsync(async (doc) => {
    const migrated = migrateMetrics(doc, doc.dataVersion, CURRENT_METRICS_VERSION)
    await migrated.save()
  })

// Without dataVersion you have no way to know which documents need migration
```

---

## 10. Database Design

### MongoDB Collections

```
users                 ← auth, preferences, timezone (IANA name — no subscription field during dev phase)
modes                 ← mode definitions, tab sets, blocking rules
sessions              ← raw mode session events (start/end/duration)
downloads             ← raw download events
streaks               ← streak definitions and current state
insights              ← AI-generated insight documents
user_metrics          ← ⭐ pre-materialized metrics (one per user)
tab_events            ← raw tab activity (archived after rollup)
```

### Critical Indexes

```typescript
// These indexes make all chart and session queries fast

// sessions — most queries filter by user + time range
{ userId: 1, createdAt: -1 }
{ userId: 1, modeId: 1, createdAt: -1 }

// downloads
{ userId: 1, downloadedAt: -1 }
{ userId: 1, category: 1 }

// user_metrics — single document lookup by userId
{ userId: 1 }                           // unique index

// insights
{ userId: 1, generatedAt: -1 }
{ userId: 1, type: 1, generatedAt: -1 }

// tab_events — kept short-lived, archived after daily rollup
{ userId: 1, timestamp: -1 }
{ userId: 1, timestamp: 1, ttl: 1 }     // TTL index — auto-expire after 7 days
```

### Redis Key Structure

```
# Rate limiting
ratelimit:{userId}:{endpoint}           TTL: 60s

# AI circuit breaker
circuit:{modelId}                       TTL: 60s (open duration)
circuit:failures:{modelId}              TTL: 60s

# AI response cache
ai:cache:{taskType}:{userId}:{hash}     TTL: varies (6h for daily, 24h for weekly)

# Active sessions
session:active:{userId}                 TTL: none (cleared on mode deactivate)

# Socket rooms
socket:sidepanel:{userId}              TTL: none (cleared on disconnect)

# Active user timezones cache (built at startup, updated on new user registration)
active:timezones                        TTL: none (permanent, updated in-place)

# BullMQ queues (managed by BullMQ)
bull:ai-insights:{jobId}
bull:metrics-rollup:{jobId}
bull:streak-eval:{jobId}
```

---

## 11. Dashboard & Charts Architecture

### Chart Components → API Endpoints Mapping

| Chart | Type | Endpoint | Update Strategy |
|---|---|---|---|
| Focus Score Over Time | LineChart | `GET /metrics/focus-score?range=30d` | WebSocket delta |
| Time Per Mode | PieChart | `GET /metrics/mode-time` | WebSocket delta |
| Daily Activity | BarChart | `GET /metrics/daily-activity?range=7d` | WebSocket delta |
| Streak Calendar | Heatmap | `GET /metrics/streak-calendar` | Daily rollup |
| Download Categories | PieChart | `GET /metrics/downloads` | WebSocket delta |
| Top Sites Per Mode | HBarChart | `GET /metrics/top-sites?mode=dev` | Daily rollup |
| Productivity Radar | RadarChart | `GET /metrics/weekly-radar` | Weekly rollup |
| Weekly Trend | AreaChart | `GET /metrics/weekly-trend?range=12w` | Weekly rollup |

### Chart Data Flow

```
Dashboard Loads
      │
      ├── REST: GET /metrics/*  ─────────────────────────▶ MongoDB
      │         (fetch full pre-computed snapshots)        (< 20ms)
      │
      ▼
Recharts renders full charts from snapshot
      │
      ▼
WebSocket connection established
      │
      ▼
User browses / switches modes / downloads files
      │
      ▼
Extension fires events → Backend processes → emits delta via Socket.IO
      │
      ▼
{ event: 'dashboard:metrics:delta', data: { chart: 'focus-score', point: { date, score } } }
      │
      ▼
React hook appends new point to chart state
      │
      ▼
Recharts re-renders only the new data point — smooth, no flicker
```

### Custom React Hook Pattern

```typescript
// dashboard/src/hooks/useMetricsChart.ts

export function useMetricsChart(chartType: ChartType) {
  const [data, setData] = useState<ChartPoint[]>([])
  const { socket } = useSocket()

  // Load initial snapshot via REST
  useEffect(() => {
    api.get(`/metrics/${chartType}`).then(res => setData(res.data))
  }, [chartType])

  // Append live deltas via WebSocket
  useEffect(() => {
    socket.on('dashboard:metrics:delta', (delta) => {
      if (delta.chart !== chartType) return
      setData(prev => [...prev.slice(-364), delta.point])  // rolling window
    })
    return () => socket.off('dashboard:metrics:delta')
  }, [socket, chartType])

  return data
}

// Usage in any chart component — clean and reusable
const focusData = useMetricsChart('focus-score')
```

---

## 12. Side Panel Architecture

### Information Hierarchy

```
Side Panel — 3 Zones
┌─────────────────────────────────┐
│  ZONE 1: STATUS BAR (always visible, always live)
│  ┌─────────────────────────────┐│
│  │ 🏄 SurfBud  [Dev Mode 🟢]  ││  ← active mode (WS)
│  │ ⏱ 2:34:12  🔥 14 day streak││  ← session timer + streak (WS)
│  │ Focus: ████████░░ 82       ││  ← live focus score (WS)
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  ZONE 2: LIVE FEED (scrollable) │
│  ┌─────────────────────────────┐│
│  │ 📥 resume_v3.pdf  2m ago   ││  ← new download toast (WS)
│  │ 💡 "Strong focus session!"  ││  ← AI nudge (WS)
│  │ 🌐 github.com  active tab  ││  ← tab activity (WS)
│  │ 🔥 Streak milestone: 14d!  ││  ← milestone event (WS)
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  ZONE 3: QUICK ACTIONS (fixed)  │
│  ┌─────────────────────────────┐│
│  │ [Switch Mode▾] [⏸ Pause]   ││
│  │ [📊 Dashboard ↗]           ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Side Panel WebSocket Subscription

```typescript
// extension/src/sidepanel/hooks/useSidePanelSocket.ts

// Side panel only subscribes to lightweight, actionable events
const SIDE_PANEL_EVENTS: ServerEvent[] = [
  'dashboard:mode:updated',
  'dashboard:focus:score',
  'dashboard:download:new',
  'dashboard:streak:updated',
  'dashboard:nudge',
]

// Full dashboard subscribes to everything (all metrics, chart deltas, etc.)
```

---

## 13. Authentication & Security

### JWT Strategy

```
Login
  → Validate credentials
  → Generate single JWT (7 day expiry)
  → Return token to client

Authenticated Request
  → Client sends: Authorization: Bearer <token>
  → auth.middleware.ts verifies signature + expiry
  → req.user populated with { id, email }
  → Request proceeds

Logout
  → Client discards token
  → No server-side state to clean up
```

> **Intentional simplicity:** No refresh tokens, no Redis token store, no httpOnly cookies.
> A 7-day token covers normal usage. If a token needs invalidating before expiry (e.g. password
> change), that is a Phase 2 concern. For Phase 1, keep auth simple and move fast.

### Timezone Detection

User's IANA timezone is auto-detected from the client on login — zero user input needed.

```typescript
// Dashboard + extension send this on every login
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
// e.g. 'Asia/Kolkata', 'America/New_York', 'Europe/London'

// Auth endpoint saves it to User doc
await UserRepository.updateTimezone(userId, timezone)
```

Stored as `timezone: string` on the User model (default: `'UTC'`).
Used by `DownloadMetricsService` and the metrics-rollup cron worker to compute
date strings (`today`, `weekStart`, `monthStart`) in the user's local time.

On registration/login, if the timezone is new, it is added to the `active:timezones`
Redis cache so the cron worker picks it up without a DB scan:
```typescript
const cached: string[] = JSON.parse(await redis.get('active:timezones') ?? '[]')
if (!cached.includes(timezone)) {
  cached.push(timezone)
  await redis.set('active:timezones', JSON.stringify(cached))
}
```
This ensures "today's downloads" resets at the user's local midnight — not UTC midnight.

```typescript
// src/utils/date.utils.ts
export function toDateString(date: Date, timezone: string = 'UTC'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
  }).format(date)
  // en-CA locale produces YYYY-MM-DD natively — no string manipulation needed
}
```

> **Note on subscription claims in JWT:** No subscription tier or feature flag is encoded in the JWT during the current development phase. All authenticated users have identical access. When monetization is introduced in Phase 3, a `plan` claim will be added to the token payload and a `checkPlan` middleware will be introduced — but this requires zero changes to the existing auth flow.

### Security Middleware Stack

```typescript
// Every request passes through this chain
app.use(helmet())                    // security headers
app.use(cors(corsOptions))           // whitelist dashboard + extension origins
app.use(express.json({ limit: '10kb' }))   // prevent large payload attacks
app.use(requestLogger)               // correlation ID on every request

// Per-route middleware
router.use(authenticate)             // verify JWT
router.use(validate(schema))         // Zod schema validation
router.use(rateLimiter)              // Redis-backed, per-user limits
```

---

## 14. Job Queue System

### BullMQ Queue Architecture

```
Queue: ai-insights
  ├── Job: generate-daily-nudge     (triggered after each mode session)
  ├── Job: generate-weekly-summary  (every Sunday 08:00)
  └── Job: generate-mode-suggestion (triggered on mode activation)

Queue: metrics-rollup
  └── Job: metrics-rollup           (every 30 min — resets period counts for users
                                     whose IANA timezone is currently at midnight)
                                     Only touches users in midnight-window timezones.
                                     Most runs exit after one Redis read.

Queue: streak-evaluation
  └── Job: evaluate-all-streaks     (every day 00:01)

Queue: email-digest
  └── Job: send-weekly-digest       (every Monday 08:00)
```

### Why Jobs Are Critical for AI

```
❌ Without BullMQ (naive approach):
   User switches mode → API handler calls Groq AI → waits 3-8 seconds → returns
   Result: every mode switch takes 3-8 seconds. Unusable.

✅ With BullMQ:
   User switches mode → API handler queues AI job → returns immediately (< 50ms)
   BullMQ worker processes job in background → result arrives via WebSocket
   Result: instant response + AI insight appears smoothly when ready
```

---

## 15. Shared Types Strategy

Each of the three folders (`api/`, `dashboard/`, `extension/`) contains an identical copy of the shared type definitions at `src/types/shared/`. There is no build-time linking between them — they are plain TypeScript files copied into each folder.

The **same-commit rule** (documented in Section 2) ensures they stay in sync: any change to a shared type must update all three folders in a single commit.

### The Shared Types Files

```typescript
// src/types/shared/mode.types.ts  — identical in api/, dashboard/, extension/
export interface Mode {
  id: string
  userId: string
  name: string
  color: string
  icon: string
  tabs: string[]
  blockedDomains: string[]
  focusTimerMinutes?: number
  createdAt: Date
  updatedAt: Date
}

export interface ModeSession {
  id: string
  userId: string
  modeId: string
  modeName: string
  startedAt: Date
  endedAt?: Date
  durationMinutes?: number
}

// src/types/shared/socket.types.ts
export interface MetricsDelta {
  chart: ChartType
  point: ChartPoint
  timestamp: Date
}

export type ServerEvent =
  | 'dashboard:mode:updated'
  | 'dashboard:metrics:delta'
  | 'dashboard:download:new'
  | 'dashboard:streak:updated'
  | 'dashboard:insight:new'
  | 'dashboard:focus:score'
  | 'dashboard:nudge'

// src/types/shared/metrics.types.ts
export interface FocusScorePoint {
  date: string
  score: number
  focusedMinutes: number
  dominantMode: string
}

export interface ModeTimePoint {
  modeId: string
  modeName: string
  color: string
  totalMinutes: number
  sessionsCount: number
}
```

### Future Migration Path (Phase 3)

When the product is stable and types are settled, the migration to a proper shared package is straightforward:

```
Step 1: Extract src/types/shared/ files into a new docs/types/ folder
Step 2: Publish to npm (private) or GitHub Packages as @surfbud/types
Step 3: In each folder: npm install @surfbud/types
Step 4: Replace local imports → package imports (import path change only)
Step 5: Delete src/types/shared/ from all three folders
```

This migration touches only import paths — zero logic changes, zero refactoring.

---

## 16. Environment & Configuration

Each folder has its own `.env` file — there is no shared environment config. Each `.env.example` is committed to the repo (without real values) so anyone cloning knows exactly what variables are needed.

### api/ — `.env`

```bash
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://...

# Redis
REDIS_URL=redis://...

# JWT
JWT_SECRET=your-secret-here   # min 32 chars — openssl rand -hex 32
JWT_EXPIRES_IN=7d

# Groq
GROQ_API_KEY=gsk_...

# AWS SES (email digests)
AWS_SES_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# CORS — whitelist both dashboard and extension origins
DASHBOARD_ORIGIN=https://app.surfbud.dev
EXTENSION_ORIGIN=chrome-extension://your-extension-id
```

### dashboard/ — `.env`

```bash
# Points to api/
VITE_API_URL=https://api.surfbud.dev
VITE_SOCKET_URL=wss://api.surfbud.dev
```

### extension/ — `.env`

```bash
# Points to api/
VITE_API_URL=https://api.surfbud.dev
VITE_SOCKET_URL=wss://api.surfbud.dev
```

### Zod Environment Validation (surfbud-api)

```typescript
// config/env.ts — crashes on startup if any env var is missing or wrong type
const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  GROQ_API_KEY: z.string().startsWith('gsk_'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DASHBOARD_ORIGIN: z.string().url(),
  EXTENSION_ORIGIN: z.string(),
})

export const env = EnvSchema.parse(process.env)
```

---

## 17. Scalability Path

The layered architecture scales without rewriting. You add instances and separate workers as load grows.

```
Stage 1 — Full Product Build (now)
  Single Node.js process
  MongoDB Atlas M0 (free)
  Redis via Docker locally
  Deploy: AWS EC2 (single instance)
  All features enabled for all users — no tier gating
  Cost: $0/month

Stage 2 — Beta (50–500 users)
  Same codebase, zero changes needed
  MongoDB Atlas M10 ($57/mo)
  AWS ElastiCache (cache.t3.micro)
  Add PM2 process manager
  Deploy: AWS EC2
  Cost: ~$60/month

Stage 3 — Growth + Monetization (500–10K users)
  Introduce Free / Pro tier gating (Phase 3 of product plan)
  Multiple Node.js instances behind Nginx
  Socket.IO with Redis adapter (multi-instance WS)
  Separate BullMQ worker process
  MongoDB Atlas M30
  Deploy: AWS ECS + load balancer
  Cost: ~$200/month

Stage 4 — Scale (10K+ users)
  Extract AI worker as standalone service
  MongoDB sharding
  Redis Cluster
  CDN for dashboard (CloudFront)
  Only now consider splitting into microservices
```

> The discipline of the Repository pattern is what enables this.
> Swapping MongoDB Atlas tiers or adding read replicas
> requires zero application code changes.

---

## 18. Design Principles Summary

These are the non-negotiable rules that keep SurfBud's codebase clean as it grows:

| Principle | Rule |
|---|---|
| **Layer isolation** | Each layer only imports from the layer directly below it |
| **Repository-only queries** | No raw MongoDB query exists outside a repository file |
| **Service-only logic** | No business logic exists outside a service file |
| **Controller thinness** | Controllers only extract request params and call one service method |
| **Pre-compute, don't compute** | Metrics are never calculated during a user request — always pre-materialized |
| **Async AI always** | AI calls never happen in the request-response cycle — always queued via BullMQ |
| **WebSocket deltas only** | WebSocket pushes data point deltas, not full dataset refreshes |
| **Typed everywhere** | Every function parameter, return value, and socket event is fully typed in TypeScript |
| **Shared types discipline** | Any change to `src/types/shared/` in one folder must be mirrored in all three folders in the same commit |
| **Cache aggressively** | Every AI response is cached in Redis with TTL — never call AI for cached content |
| **Never fail the user** | The AI fallback chain ends with a template response — users never see an error state |
| **No tier gating during build** | All features are available to all users during Phase 1 — no Free/Pro split until Phase 3 |

---

> **Next documents in this series:**
> - `FEATURE_ROADMAP.md` — MVP sprint plan, ticket breakdown, v1 → v2 progression
> - `API_REFERENCE.md` — All REST endpoints, request/response schemas, WebSocket events
> - `EXTENSION_GUIDE.md` — Chrome extension build guide, Manifest V3 patterns, side panel setup
> - `DATABASE_SCHEMA.md` — Full Mongoose schemas, index strategy, migration patterns

---

*SurfBud Technical Architecture — v1.3 — March 2026*
*Built with TypeScript · React · Node.js · MongoDB · Redis · Groq*
*Single GitHub repo · Three folders · Path-filtered CI · Phase 1: Full product build*
