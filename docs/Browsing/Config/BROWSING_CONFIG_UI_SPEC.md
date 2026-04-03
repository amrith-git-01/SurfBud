# SurfBud - Browsing Configuration UI Spec
**Version 1.0 - Phase 1 - March 2026**

---

## 1. Overview

The Browsing Configuration page lives at `/browsing/configure` and is opened from the main Browsing page via the Configure button.

### 1.1 Navigation

| Property | Value |
|---|---|
| Route | `/browsing/configure` |
| Entry point | `Configure` button on Browsing page header |
| Back navigation | `Back to Browsing` button at page top |
| Nav highlight | Browsing nav item stays active |

---

### 1.2 Save Behavior

Browsing configuration uses draft state with explicit save controls.

| Action | Behavior |
|---|---|
| Change a control | Updates local draft only |
| Save | Persists all changed scalar settings and domain rules |
| Cancel | Reverts draft to last persisted state |
| Save button state | Enabled only when draft is dirty |

This differs from Downloads Configure, which saves each interaction immediately.

---

## 2. Page Structure

Three sections are stacked vertically.

```
Back to Browsing

Browsing Configuration
Manage how SurfBud tracks your browsing sessions.

Master Toggles
Domain Rules
Session Thresholds
```

| Section | Purpose |
|---|---|
| Master Toggles | Global tracking and interaction capture controls |
| Domain Rules | Per-domain track or dont_track policy |
| Session Thresholds | Session filtering and merge behavior |

---

## 3. Master Toggles

Two toggle cards in a responsive grid.

### 3.1 Browsing Tracking

| Property | Value |
|---|---|
| Label | Browsing Tracking |
| Description | Track and record browsing sessions |
| Default | ON |
| OFF effect | Extension does not track browsing sessions |
| Warning text | SurfBud is not recording browsing sessions |

### 3.2 Interaction Tracking

| Property | Value |
|---|---|
| Label | Interaction Tracking |
| Description | Track clicks, keypresses, and scrolls within sessions |
| Default | ON |
| Dependency | Disabled when Browsing Tracking is OFF |
| Disabled tooltip | Enable Browsing Tracking first |
| OFF effect | Sessions still tracked, interactions recorded as zeros |

---

## 4. Domain Rules

Domain Rules uses the shared domain-rule editor pattern.

### 4.1 Rule Model

| Field | Value |
|---|---|
| Domain | Normalized hostname |
| Rule options | `track`, `dont_track` |

### 4.2 Layout

| Region | Behavior |
|---|---|
| Left panel | Add/edit form and active rules list |
| Right panel | Suggested domains from browsing history |
| Search | Filters both active rules and suggestions |

### 4.3 Suggestions

Each suggestion row can include:

| Field | Behavior |
|---|---|
| Domain | Source domain |
| Meta | Sessions and active time summary |
| Productivity tag | Productive, Distractive, or Neutral |
| Add action | Prefills/apply domain in add form |

---

## 5. Session Thresholds

Session Thresholds is shown as a glass card with two preset groups and a divider between groups on desktop.

### 5.1 Preset Controls

| Control | Presets | Helper Text |
|---|---|---|
| Minimum Session Duration | 10s, 20s, 30s, 60s | Sessions shorter than this are discarded. |
| Merge Gap | 10s, 20s, 30s, 60s | Same-domain sessions within this gap are merged. |

### 5.2 Interaction Rules

| Rule | Behavior |
|---|---|
| Disabled state | Entire section is non-interactive when page is busy or browsing tracking is OFF |
| Selection | Clicking a preset updates draft value |
| Layout | Mobile stacks rows; desktop uses two columns with divider |

---

## 6. Loading States

All configure sections use skeleton loaders with structure matching the final rendered container.

| Section | Skeleton Pattern |
|---|---|
| Master Toggles | Two card placeholders with title/description/toggle skeletons |
| Domain Rules | Shared domain-editor skeleton |
| Session Thresholds | Two preset-row skeleton groups |

---

## 7. Accessibility and Interaction

| Area | Requirement |
|---|---|
| Preset buttons | Rendered as radio-style controls with `role="radio"` and `aria-checked` |
| Preset groups | Wrapped with `role="radiogroup"` and `aria-label` |
| Disabled controls | Must not be focusable/clickable when blocked by dependency |

---

## 8. Data Contract Used By UI

The UI uses the shared `BrowsingSettings` shape:

```typescript
interface BrowsingSettings {
  trackingEnabled: boolean;
  interactionTrackingEnabled: boolean;
  minSessionDurationSeconds: number;
  mergeGapSeconds: number;
  domainRules: Array<{ _id: string; domain: string; rule: "track" | "dont_track" }>;
}
```

These types are duplicated across API, dashboard, and extension shared types and must stay in sync in one commit.
