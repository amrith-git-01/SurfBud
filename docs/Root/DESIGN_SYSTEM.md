# 🏄 SurfBud — Design System

> **Version:** 1.1 — March 2026
> **Theme:** Ocean Teal · Light Background · Premium Dashboard · Glassmorphic Charts & Cards
> **Fonts:** Plus Jakarta Sans + Inter + JetBrains Mono

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Elevation & Shadows](#5-elevation--shadows)
6. [Glassmorphic Effects](#6-glassmorphic-effects)
7. [Animation & Motion](#7-animation--motion)
8. [Component Patterns](#8-component-patterns)
9. [CSS Custom Properties — Full Token Reference](#9-css-custom-properties--full-token-reference)
10. [Tailwind Configuration](#10-tailwind-configuration)
11. [Safety Rules — What We Never Animate](#11-safety-rules--what-we-never-animate)

---

## 1. Design Philosophy

### The Core Principle

> **Animations should feel like the UI is alive — not like it's showing off.**

Every visual decision in SurfBud serves one of three purposes:

```
1. Communicate      → color, typography, and hierarchy tell the user what matters
2. Respond          → micro-interactions confirm the UI heard them
3. Celebrate        → milestone moments feel earned and delightful
```

Anything that doesn't serve one of these three purposes doesn't belong in the design.

### The Product Aesthetic

SurfBud is a tool people keep open **all day.** The design must be:

- **Focused but not sterile** — a productivity tool with personality
- **Alive but not distracting** — real-time updates feel smooth, never jarring
- **Premium but accessible** — looks better than every other extension without feeling cold
- **Cohesive with the name** — SurfBud implies ocean, movement, a companion

The result is **Ocean Teal on Ice White** — calm, distinctive, and unmistakably SurfBud.

### What We Avoid

```
❌ Purple gradients on white — the most overused AI product aesthetic
❌ Pure grey/black shadows — disconnected from the brand
❌ Generic blue — indistinguishable from Notion, Linear, Vercel
❌ Dark theme — SurfBud is a light, airy dashboard (not a code editor)
❌ Bounce animations everywhere — reserve spring for milestone moments only
❌ Animating layout properties — only transform and opacity, always
```

---

## 2. Color System

### Design Principle

The palette has four layers — Foundation, Primary, Semantic, and Accent. Every color has a reason to exist. Nothing is decorative.

```
Foundation  → backgrounds, surfaces, borders (neutral canvas)
Primary     → ocean teal (brand identity, actions, active states)
Semantic    → success, warning, danger, info (data meaning)
Accent      → mode colors, chart series, category indicators
```

### Foundation — Backgrounds & Surfaces

```
#F0F9FF   --color-bg-page        Ice blue white — the canvas everything sits on
#FFFFFF   --color-bg-card        Pure white cards on top of the page background
#E0F2FE   --color-border         sky-100 — subtle card edges, barely visible
#BAE6FD   --color-border-strong  sky-200 — section dividers, emphasized borders
#F8FFFE   --color-bg-hover       Teal tint hover on interactive rows/items
```

> The page background is NOT pure white — `#F0F9FF` is sky-50, an ice blue white.
> This gives SurfBud a subtle teal personality even in the background, making the
> whole product feel cohesive rather than generic.

### Primary — Ocean Teal Scale

```
#164E63   --color-teal-900       Darkest — strong text emphasis on light bg
#155E75   --color-teal-800       Dark — subheadings, emphasized labels
#0E7490   --color-teal-700       Primary hover state
#0891B2   --color-primary        ⭐ THE PRIMARY — buttons, links, active nav, icons
#06B6D4   --color-teal-500       Lighter primary — icon fills, highlights
#22D3EE   --color-teal-400       Glow accent — focus rings, active indicators
#CFFAFE   --color-primary-light  Teal-50 — badge fills, tag backgrounds, tints
```

### Text

```
#0F172A   --color-text-heading   slate-950 — metric numbers, page titles
#1E293B   --color-text-strong    slate-800 — card headings, important labels
#334155   --color-text-body      slate-700 — body text, descriptions
#64748B   --color-text-secondary slate-500 — labels, captions
#94A3B8   --color-text-muted     slate-400 — timestamps, metadata
#CBD5E1   --color-text-ghost     slate-300 — placeholder text, ghost states
```

### Semantic — Status & Data Colors

Each semantic color has three variants: full color for text/icons, a light background tint for badge fills, and a dark variant for text on white.

```
─── SUCCESS / POSITIVE ──────────────────────────────────
#14532D   --color-success-dark   dark green text
#16A34A   --color-success        ⭐ streak active, positive delta, new files
#DCFCE7   --color-success-light  success badge background

─── WARNING / CAUTION ───────────────────────────────────
#78350F   --color-warning-dark   dark amber text
#D97706   --color-warning        ⭐ streak at risk, duplicate files, nudges
#FEF3C7   --color-warning-light  warning badge background

─── DANGER / NEGATIVE ───────────────────────────────────
#7F1D1D   --color-danger-dark    dark red text
#DC2626   --color-danger         ⭐ streak broken, negative delta, errors
#FEE2E2   --color-danger-light   danger badge background

─── INFO / NEUTRAL ──────────────────────────────────────
#1E3A5F   --color-info-dark      dark blue text
#2563EB   --color-info           ⭐ tooltips, informational badges, neutral data
#EFF6FF   --color-info-light     info badge background
```

### Complementary Accent Colors

Teal sits between blue and green on the color wheel. These three families are its natural complements:

```
─── CORAL (triadic — warm contrast) ─────────────────────
Pairs with teal for: health bars, storage charts, new vs duplicate data
#EA580C   --color-coral          orange-600 — your existing orange, keep it
#FED7AA   --color-coral-light    orange-200
#FFF7ED   --color-coral-bg       orange-50 background

─── VIOLET (triadic — cool contrast) ────────────────────
Pairs with teal for: Dev Mode, AI insight cards, focus states
#7C3AED   --color-violet         violet-600
#EDE9FE   --color-violet-light   violet-100
#F5F3FF   --color-violet-bg      violet-50 background

─── EMERALD (analogous — cool complement) ───────────────
Pairs with teal for: streaks, positive trends, Study Mode, growth
#059669   --color-emerald        emerald-600
#D1FAE5   --color-emerald-light  emerald-100
#ECFDF5   --color-emerald-bg     emerald-50 background

─── ROSE (warm accent) ──────────────────────────────────
Pairs with teal for: Chill Mode, entertainment, relaxed states
#E11D48   --color-rose           rose-600
#FFE4E6   --color-rose-light     rose-100
#FFF1F2   --color-rose-bg        rose-50 background
```

### Mode Identity Colors

Each mode has its own color that bleeds into the side panel header and badges:

```
Dev Mode      #7C3AED   violet    focused, technical, deep work
Chill Mode    #E11D48   rose      relaxed, fun, entertainment
Deep Work     #0891B2   teal      same as primary — maximum focus state
Study Mode    #059669   emerald   growth, learning, fresh thinking
Custom Mode   user-picked at mode creation
```

### Color Pairing Rules

```
Teal + Coral    → most used pairing — health bars, storage, new vs duplicate
Teal + Violet   → developer pairing — Dev Mode, AI insights, focus sessions
Teal + Emerald  → growth pairing — streaks, goals, study sessions
Teal + Rose     → personality pairing — Chill Mode, relaxed browsing

Never pair teal with:
  ❌ Warm yellow  — clashes, feels cheap
  ❌ Brown/beige  — wrong color temperature
  ❌ Neon green   — competes with teal
  ❌ Pure black   — teal loses its refinement on pure black
```

---

## 3. Typography

### Font Families

```
Display    Plus Jakarta Sans   weights: 600, 700
           → page titles, card headings, mode names, SurfBud wordmark
           → geometric, modern, slightly more expressive than Inter at large sizes

UI         Inter               weights: 400, 500, 600, 700
           → all interface text: nav, labels, body, descriptions, buttons
           → designed specifically for screens and dashboards

Numbers    Inter               with font-variant-numeric: tabular-nums lining-nums
           → ALL metric numbers, chart labels, tables, timers
           → tabular-nums: every digit is the same width — columns never shift
           → lining-nums: all numbers sit on the baseline — clean, grounded

Mono       JetBrains Mono      weight: 400
           → file paths, download filenames, domain names, URL displays
```

### Font Loading (Google Fonts)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?
  family=Plus+Jakarta+Sans:wght@600;700&
  family=Inter:wght@400;500;600;700&
  family=JetBrains+Mono:wght@400&
  display=swap" rel="stylesheet">
```

### Type Scale

```
12px  / 0.75rem    captions, timestamps, metadata, chart axis labels
13px  / 0.8125rem  small labels, table headers, secondary descriptions
14px  / 0.875rem   body text, nav items, button labels, card descriptions
16px  / 1rem       card headings, section titles, form labels
20px  / 1.25rem    page subheadings, modal titles
24px  / 1.5rem     page titles
32px  / 2rem       large metric numbers (THIS WEEK: 11)
48px  / 3rem       hero metric numbers (today's primary count)
```

### Line Height

```
1.2     leading-tight    metric numbers, single-line labels — solid and grounded
1.375   leading-snug     card headings, nav items
1.5     leading-normal   body text, descriptions — comfortable reading default
1.625   leading-relaxed  AI insight text, longer paragraphs — needs breathing room
```

### Letter Spacing

```
-0.025em  tracking-tight    large display numbers (48px hero) — premium feel
 0em      tracking-normal   body text, card headings — default
+0.05em   tracking-wide     small uppercase labels — slight authority
+0.1em    tracking-widest   section labels, badge text (OVERVIEW, THIS WEEK)
```

### Font Weight Rules

```
400   Regular    body text, descriptions, timestamps, muted metadata
500   Medium     nav items, labels, secondary headings — slight emphasis
600   SemiBold   card headings, active nav, primary labels, metric labels
700   Bold       page titles, hero metric numbers, mode names, CTA buttons
```

> Never skip a weight level for emphasis. If something isn't important enough
> to be 600, it should be 400. The 500 weight is reserved for things that sit
> exactly between — not as a default.

### Component Typography Specifications

```
─── NAVIGATION ──────────────────────────────────────────────
Nav item inactive    Inter 500    14px  text-secondary  tracking-normal
Nav item active      Inter 600    14px  text-primary    tracking-normal
                     + teal underline 2px (sliding indicator)

─── PAGE LEVEL ──────────────────────────────────────────────
Page title           Plus Jakarta Sans 700  24px  text-heading   leading-tight
Page subtitle        Inter 400             14px  text-muted     leading-normal

─── CARDS ───────────────────────────────────────────────────
Section label        Inter 500  12px  text-muted    uppercase  tracking-widest
                     (OVERVIEW · THIS WEEK · DOWNLOADS HEALTH)
Card heading         Plus Jakarta Sans 600  16px  text-strong  leading-snug
Card description     Inter 400             13px  text-muted   leading-normal

─── METRICS ─────────────────────────────────────────────────
Hero number          Inter 700  48px  text-heading  tabular-nums  leading-tight
                     letter-spacing: -0.025em
Large metric         Inter 700  32px  text-heading  tabular-nums  leading-tight
Small metric         Inter 600  20px  text-heading  tabular-nums  leading-snug
Metric label         Inter 400  12px  text-muted    leading-normal
Delta positive       Inter 500  13px  color-success
Delta negative       Inter 500  13px  color-danger
Comparison text      Inter 400  12px  text-muted    (0 vs yesterday)

─── SIDE PANEL ──────────────────────────────────────────────
Mode name            Plus Jakarta Sans 600  15px  text-strong
Session timer        Inter 700  20px  tabular-nums  text-primary  leading-tight
Focus score number   Inter 700  32px  tabular-nums  text-heading  leading-tight
Feed item text       Inter 400  13px  text-body     leading-snug
Feed timestamp       Inter 400  11px  text-muted

─── AI INSIGHTS ─────────────────────────────────────────────
Insight text         Inter 400  14px  text-body    leading-relaxed
                     (longer text — needs breathing room)
Insight label        Inter 600  11px  text-primary  uppercase  tracking-wide

─── DATA & CHARTS ───────────────────────────────────────────
Chart axis labels    Inter 400  11px  text-muted    tabular-nums
Chart tooltip        Inter 500  12px  text-strong
Table headers        Inter 600  12px  text-muted    uppercase  tracking-wide
Table cells text     Inter 400  14px  text-body
Table cells number   Inter 500  14px  tabular-nums  text-body

─── FILENAMES & DOMAINS ─────────────────────────────────────
Download filename    JetBrains Mono 400  13px  text-body
Domain name          JetBrains Mono 400  12px  text-muted
File path            JetBrains Mono 400  12px  text-muted

─── BUTTONS ─────────────────────────────────────────────────
Primary button       Inter 600  14px  tracking-normal
Secondary button     Inter 500  14px  tracking-normal
Ghost button         Inter 500  14px  tracking-normal

─── BADGES & TAGS ───────────────────────────────────────────
Mode badge           Plus Jakarta Sans 600  11px  uppercase  tracking-wide
Status badge         Inter 500             11px  tracking-normal
```

### The Numeral Rule — Always

Every number in the product — metrics, charts, timers, tables, counts — must use:

```css
font-variant-numeric: tabular-nums lining-nums;
```

In Tailwind: `class="tabular-nums"`

This ensures digits are equal width (columns never shift) and sit on the baseline (clean and grounded). Combined with `min-width` on metric containers, count-up animations and live number updates cause zero layout displacement.

### The Hierarchy Test

Every screen must pass this scan in under 3 seconds:

```
Level 1 — What page am I on?
          Plus Jakarta Sans 700, 24px — page title

Level 2 — What are the main sections?
          Inter 500, 12px, uppercase, tracking-widest — section labels

Level 3 — What are the key numbers?
          Inter 700, 48px or 32px, tabular-nums — hero metrics

Level 4 — What does the number mean?
          Inter 400, 12px, text-muted — metric label below the number

Level 5 — Is this good or bad?
          Inter 500, 13px, green or red — delta comparison
```

---

## 4. Spacing & Layout

### 8px Base Grid

Every spacing value is a multiple of 8px. No exceptions.

```
4px    0.25rem   xs    tight internal padding (badge inner padding)
8px    0.5rem    sm    compact spacing (icon gaps, inline elements)
12px   0.75rem   md    default inner padding (small cards)
16px   1rem      lg    standard component padding
24px   1.5rem    xl    card padding, section gaps
32px   2rem      2xl   large section spacing
48px   3rem      3xl   page-level vertical rhythm
64px   4rem      4xl   major section separation
```

### Card Layout Rules

```css
/* Always use gap — never margin between cards */
.card-grid {
  display: grid;
  gap: 16px;              /* 2 × base unit */
}

/* Standard card */
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

/* Compact metric card */
.card-metric {
  border-radius: 10px;
  padding: 16px;
}
```

> Always use CSS Grid or Flexbox `gap` between cards — never `margin-bottom`.
> This ensures card hover `translateY` animations never cause overlap.

### Border Radius Scale

```
4px    rounded     small elements — badges, tags, chips
6px    rounded-md  inputs, small buttons
8px    rounded-lg  buttons, tooltips, dropdowns
10px   rounded-xl  compact metric cards
12px   rounded-2xl standard cards
16px   rounded-3xl large feature cards, modals
```

---

## 5. Elevation & Shadows

### The Shadow Philosophy

All shadows use a subtle teal tint — not pure grey/black. A teal-tinted shadow ties elevation to the brand. Users feel the card belongs without consciously noticing the tint.

### Elevation Scale

```css
/* Level 0 — flat (disabled, inactive states) */
--shadow-none: none;

/* Level 1 — resting cards (default state) */
--shadow-sm:
  0 1px 3px rgba(8, 145, 178, 0.06),
  0 1px 2px rgba(8, 145, 178, 0.04);

/* Level 2 — hovered cards */
--shadow-md:
  0 8px 25px rgba(8, 145, 178, 0.10),
  0 4px 10px rgba(8, 145, 178, 0.07),
  0 1px 3px  rgba(8, 145, 178, 0.04);

/* Level 3 — dropdowns, floating panels, tooltips */
--shadow-lg:
  0 16px 40px rgba(8, 145, 178, 0.12),
  0 8px  16px rgba(8, 145, 178, 0.08),
  0 2px  4px  rgba(8, 145, 178, 0.04);

/* Level 4 — modals, dialogs */
--shadow-xl:
  0 24px 60px rgba(8, 145, 178, 0.15),
  0 12px 24px rgba(8, 145, 178, 0.10),
  0 4px  8px  rgba(8, 145, 178, 0.06);

/* Special — primary button glow */
--shadow-primary:
  0 4px 14px rgba(8, 145, 178, 0.35);

/* Special — primary button hover glow */
--shadow-primary-hover:
  0 6px 20px rgba(8, 145, 178, 0.45);

/* Special — mode active indicator ring */
--shadow-mode-ring:
  0 0 0 3px rgba(8, 145, 178, 0.15);

/* Special — streak milestone success glow */
--shadow-success-glow:
  0 0 20px 4px rgba(22, 163, 74, 0.3);
```

---

## 6. Glassmorphic Effects

### Design Principle

Glassmorphism in SurfBud is **purposeful, not decorative.** It is applied exclusively to metric cards and chart containers to:

```
1. Create visual depth     → frosted glass floats above the ice-blue page canvas
2. Soften data density     → charts with multiple lines feel lighter inside a glass shell
3. Reinforce brand warmth  → teal-tinted borders and shadows feel cohesive, not generic
4. Signal interactivity    → glass hover lift tells users these elements respond
```

Glass is **never** applied to navigation, tooltips, modals, or the side panel. Overuse destroys the effect — its value comes entirely from being used selectively.

### Glass Tokens

```css
/* ── BACKGROUNDS ──────────────────────────────────────────────────── */
--glass-bg:              rgba(255, 255, 255, 0.65);
/* chart containers — translucent, lets page color breathe through */

--glass-bg-strong:       rgba(255, 255, 255, 0.80);
/* metric cards — higher opacity for number legibility */

/* ── BORDERS ──────────────────────────────────────────────────────── */
--glass-border:          rgba(255, 255, 255, 0.50);
/* inner highlight border — top and left edges */

--glass-border-teal:     rgba(8, 145, 178, 0.15);
/* outer teal-tinted border — ties glass to brand */

/* ── BLUR ─────────────────────────────────────────────────────────── */
--glass-blur:            blur(12px);
/* chart containers — enough to read as frosted, not heavy */

--glass-blur-strong:     blur(20px);
/* metric cards — tighter, crisper surface for numbers */

/* ── SHADOWS ──────────────────────────────────────────────────────── */
--shadow-glass:
  0 8px 32px  rgba(8, 145, 178, 0.08),   /* ambient teal glow */
  0 2px 8px   rgba(8, 145, 178, 0.04),   /* close teal shadow */
  inset 0 1px 0 rgba(255, 255, 255, 0.60); /* inner top-edge highlight */

--shadow-glass-hover:
  0 12px 40px rgba(8, 145, 178, 0.13),   /* deeper ambient glow on hover */
  0 4px  12px rgba(8, 145, 178, 0.07),   /* stronger close shadow */
  inset 0 1px 0 rgba(255, 255, 255, 0.70); /* brighter inner highlight */
```

### Where Glass Is Applied

```
✅ Metric cards           (Overview grid — Today, This Week, This Month, Peak Hour)
✅ Chart containers       (all Recharts wrappers — Line, Bar, Area, Pie, Radar)
✅ Downloads Health bar   (the large segmented bar card)
✅ Storage Efficiency bar (the large segmented bar card)
✅ AI Insight cards       (insight feed in side panel and dashboard)

❌ Navigation bar         visual noise, illegible links behind blur
❌ Tooltips               too small — blur artifacts at small sizes
❌ Modals / dialogs       accessibility focus trap needs full opacity
❌ Side panel shell       mode color identity must be solid
❌ Toast notifications    fast-moving elements cause jank with backdrop-filter
❌ Skeleton loaders       backdrop-filter on placeholders is wasteful
❌ Buttons                glass buttons are illegible and feel broken
```

---

### Metric Card — Glass Surface

Metric cards use the stronger glass variant — higher opacity white and tighter blur — so numbers remain fully legible at the small card size.

```css
.card-metric-glass {
  background:               var(--glass-bg-strong);       /* rgba(255,255,255,0.80) */
  backdrop-filter:          var(--glass-blur-strong);     /* blur(20px) */
  -webkit-backdrop-filter:  var(--glass-blur-strong);
  border: 1px solid         var(--glass-border-teal);     /* outer teal tint */
  border-top:  1px solid    rgba(255, 255, 255, 0.80);    /* top highlight */
  border-left: 1px solid    rgba(255, 255, 255, 0.80);    /* left highlight */
  border-radius: 10px;
  padding: 16px;
  box-shadow:               var(--shadow-glass);
  will-change:              transform, box-shadow;
  transition:
    transform    200ms var(--ease-out),
    box-shadow   200ms var(--ease-out);
    /* NEVER transition width/height/padding — layout displacement */
}

.card-metric-glass:hover {
  transform:   translateY(-3px);         /* GPU only — zero layout impact */
  box-shadow:  var(--shadow-glass-hover);
}
```

```tsx
// React — metric card with glass surface
// minWidth on the number container prevents layout shift during count-up
<div className="card-metric-glass">
  <p className="section-label">THIS WEEK</p>
  <div style={{ minWidth: '4ch' }}>
    <p className="metric-hero tabular-nums">{count}</p>
  </div>
  <p className="metric-label">downloads</p>
  <span className="delta delta-negative">↓ 16 vs last week</span>
</div>
```

---

### Chart Container — Glass Shell

The glass effect sits entirely on the wrapper `div`. Recharts renders inside it normally — no changes to chart internals required.

```css
.chart-glass {
  background:               var(--glass-bg);              /* rgba(255,255,255,0.65) */
  backdrop-filter:          var(--glass-blur);            /* blur(12px) */
  -webkit-backdrop-filter:  var(--glass-blur);
  border: 1px solid         var(--glass-border-teal);
  border-top: 1px solid     rgba(255, 255, 255, 0.70);   /* inner highlight edge */
  border-radius: 12px;
  padding: 24px;
  box-shadow:               var(--shadow-glass);
  will-change:              transform, box-shadow;
  transition:
    transform    200ms var(--ease-out),
    box-shadow   200ms var(--ease-out);
}

.chart-glass:hover {
  transform:   translateY(-2px);         /* GPU only — 2px lift (not 3px — charts are larger) */
  box-shadow:  var(--shadow-glass-hover);
}
```

---

### Recharts — Full Integration Guide

All Recharts components follow the same pattern: glass wrapper → section label → optional header row → `ResponsiveContainer` → chart. The chart's internal colors come from `CHART_COLORS` — never hardcoded inline.

```typescript
// Chart color constants — use these everywhere, never hardcode
export const CHART_COLORS = {
  primary:   '#0891B2',   // ocean teal — main series
  secondary: '#06B6D4',   // teal-500 — secondary series
  success:   '#16A34A',   // green — positive data
  warning:   '#D97706',   // amber — caution data
  danger:    '#DC2626',   // red — negative data
  muted:     '#94A3B8',   // slate — grid lines, axes
  dev:       '#7C3AED',   // violet — Dev Mode series
  chill:     '#E11D48',   // rose — Chill Mode series
  study:     '#059669',   // emerald — Study Mode series
  coral:     '#EA580C',   // coral — duplicate/wasted data
} as const

// Shared axis and grid config
export const CHART_AXIS_STYLE = {
  style: {
    fontSize: 11,
    fontFamily: 'Inter, sans-serif',
    fill: '#94A3B8',           // --color-text-muted
  }
}

export const CHART_GRID_STYLE = {
  stroke: '#E0F2FE',           // --color-border
  strokeDasharray: '3 3',
}

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#FFFFFF',
    border: '1px solid #E0F2FE',
    borderRadius: 8,
    boxShadow: '0 8px 25px rgba(8,145,178,0.10)',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
  },
  labelStyle: {
    color: '#1E293B',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
  },
  itemStyle: {
    color: '#334155',
    fontFamily: 'Inter, sans-serif',
  },
}
```

#### Line Chart — Focus Score / Trend Over Time

```tsx
<div className="chart-glass">
  <p className="section-label">FOCUS SCORE — LAST 30 DAYS</p>
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
      <CartesianGrid {...CHART_GRID_STYLE} vertical={false} />
      <XAxis dataKey="date" {...CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
      <YAxis {...CHART_AXIS_STYLE} tickLine={false} axisLine={false} domain={[0, 100]} />
      <Tooltip {...CHART_TOOLTIP_STYLE} />
      <Line
        type="monotone"
        dataKey="score"
        stroke={CHART_COLORS.primary}
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 0 }}
        isAnimationActive={true}
        animationDuration={800}
        animationEasing="ease-out"
      />
    </LineChart>
  </ResponsiveContainer>
</div>
```

#### Area Chart — Weekly Trend / Download Volume

```tsx
<div className="chart-glass">
  <p className="section-label">DOWNLOAD ACTIVITY — 12 WEEKS</p>
  <ResponsiveContainer width="100%" height={200}>
    <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
      <defs>
        {/* Gradient fill — fades to transparent at bottom */}
        <linearGradient id="gradientTeal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <CartesianGrid {...CHART_GRID_STYLE} vertical={false} />
      <XAxis dataKey="week" {...CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
      <YAxis {...CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
      <Tooltip {...CHART_TOOLTIP_STYLE} />
      <Area
        type="monotone"
        dataKey="downloads"
        stroke={CHART_COLORS.primary}
        strokeWidth={2}
        fill="url(#gradientTeal)"          /* gradient fill — not flat color */
        dot={false}
        activeDot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 0 }}
        isAnimationActive={true}
        animationDuration={800}
        animationEasing="ease-out"
      />
    </AreaChart>
  </ResponsiveContainer>
</div>
```

#### Bar Chart — Daily Activity

```tsx
<div className="chart-glass">
  <p className="section-label">DOWNLOAD ACTIVITY — THIS WEEK</p>
  <ResponsiveContainer width="100%" height={180}>
    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barSize={24}>
      <CartesianGrid {...CHART_GRID_STYLE} vertical={false} />
      <XAxis dataKey="day" {...CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
      <YAxis {...CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
      <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(8,145,178,0.04)' }} />
      <Bar
        dataKey="count"
        fill={CHART_COLORS.primary}
        radius={[4, 4, 0, 0]}             /* rounded top corners only */
        isAnimationActive={true}
        animationDuration={600}
        animationEasing="ease-out"
      />
    </BarChart>
  </ResponsiveContainer>
</div>
```

#### Pie / Donut Chart — Mode Time Breakdown

```tsx
<div className="chart-glass">
  <p className="section-label">TIME BY MODE</p>
  <ResponsiveContainer width="100%" height={220}>
    <PieChart>
      <Pie
        data={modeData}
        cx="50%"
        cy="50%"
        innerRadius={60}                   /* donut — not full pie */
        outerRadius={90}
        paddingAngle={3}                   /* small gap between segments */
        dataKey="minutes"
        isAnimationActive={true}
        animationDuration={800}
        animationEasing="ease-out"
      >
        {modeData.map((entry) => (
          <Cell key={entry.mode} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip {...CHART_TOOLTIP_STYLE} />
    </PieChart>
  </ResponsiveContainer>
  {/* Legend below chart — not inside Recharts */}
  <div className="chart-legend">
    {modeData.map((entry) => (
      <span key={entry.mode} className="chart-legend-item">
        <span style={{ background: entry.color }} className="chart-legend-dot" />
        <span className="chart-legend-label">{entry.mode}</span>
      </span>
    ))}
  </div>
</div>
```

#### Radar Chart — Weekly Summary

```tsx
<div className="chart-glass">
  <p className="section-label">WEEKLY PERFORMANCE</p>
  <ResponsiveContainer width="100%" height={260}>
    <RadarChart data={radarData}>
      <PolarGrid stroke="#E0F2FE" />
      <PolarAngleAxis
        dataKey="metric"
        tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#94A3B8' }}
      />
      <Radar
        name="This Week"
        dataKey="value"
        stroke={CHART_COLORS.primary}
        fill={CHART_COLORS.primary}
        fillOpacity={0.12}
        isAnimationActive={true}
        animationDuration={800}
        animationEasing="ease-out"
      />
      <Tooltip {...CHART_TOOLTIP_STYLE} />
    </RadarChart>
  </ResponsiveContainer>
</div>
```

#### Downloads Health & Storage — Segmented Bar

These two use a custom segmented progress bar — not a Recharts component — but still get the glass treatment.

```tsx
<div className="chart-glass">
  <div className="chart-header">
    <div>
      <p className="card-heading">Downloads Health</p>
      <p className="card-description">Distribution of unique vs duplicate files</p>
    </div>
    <div className="chart-legend-inline">
      <span className="legend-dot" style={{ background: CHART_COLORS.success }} />
      <span>New ({newPct}%)</span>
      <span className="legend-dot" style={{ background: CHART_COLORS.coral }} />
      <span>Duplicate ({dupPct}%)</span>
    </div>
  </div>

  {/* Segmented bar — overflow hidden on track prevents any displacement */}
  <div className="segment-track">
    <div
      className="segment-fill segment-fill--success"
      style={{ width: `${newPct}%` }}        /* width transition is safe here: */
    />                                         /* track is overflow:hidden, fixed height */
    <div
      className="segment-fill segment-fill--coral"
      style={{ width: `${dupPct}%` }}
    />
  </div>

  <div className="segment-badges">
    <span className="badge badge-neutral">Total: {total}</span>
    <span className="badge badge-success">New: {newCount}</span>
    <span className="badge badge-coral">Duplicate: {dupCount}</span>
  </div>
</div>
```

```css
.segment-track {
  display: flex;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;                    /* contains fills — nothing can escape */
  background: var(--color-border);
  margin: 16px 0 12px;
}

.segment-fill {
  height: 100%;
  transition: width 600ms var(--ease-smooth);   /* safe — contained by overflow:hidden */
}

.segment-fill--success { background: var(--color-success); }
.segment-fill--coral   { background: var(--color-coral);   }
```

---

### AI Insight Card — Glass Variant

AI insight cards in the dashboard and side panel also get the glass treatment — they feel like the AI is surfacing something through the frosted surface.

```css
.insight-card-glass {
  background:               var(--glass-bg-strong);
  backdrop-filter:          var(--glass-blur-strong);
  -webkit-backdrop-filter:  var(--glass-blur-strong);
  border: 1px solid         var(--glass-border-teal);
  border-top: 1px solid     rgba(255, 255, 255, 0.80);
  border-left: 1px solid    rgba(255, 255, 255, 0.80);
  border-radius: 10px;
  padding: 16px;
  box-shadow:               var(--shadow-glass);
  will-change:              transform, box-shadow;
  transition:
    transform    200ms var(--ease-out),
    box-shadow   200ms var(--ease-out);
}

/* AI insight arrival animation — used when a new insight arrives via WebSocket */
.insight-card-glass.arriving {
  animation: insightArrive 400ms var(--ease-enter) forwards;
}

@keyframes insightArrive {
  from {
    opacity: 0;
    transform: translateY(10px);
    border-color: var(--color-teal-400);   /* brief teal border glow on arrival */
  }
  to {
    opacity: 1;
    transform: translateY(0);
    border-color: var(--glass-border-teal);
  }
}
```

---

### Legibility Rules — Glass + Text

Glass reduces background contrast slightly. These rules ensure legibility is never compromised.

```
Metric numbers        Always --color-text-heading (#0F172A)
                      Never text-secondary or muted on a glass card
                      The 0.80 opacity background keeps contrast ratio WCAG AA compliant

Chart labels          Inter 400 11px --color-text-muted is acceptable on chart glass
                      If labels feel washed out, step up to --color-text-secondary (#64748B)

Delta text            Never reduce font weight on glass surfaces
                      Keep Inter 500 for positive/negative deltas — glass is no excuse for lighter emphasis

Section labels        Uppercase + tracking-widest rule is unchanged on glass
                      Glass does not modify typographic hierarchy

Insight text          Inter 400 14px leading-relaxed — glass actually improves readability
                      The frosted surface softens the background, making text pop slightly more
```

### Tailwind Utilities — Glass Classes

Use these in JSX instead of inline styles. They map directly to the glass tokens.

```tsx
// Chart container
<div className="
  bg-white/65
  backdrop-blur-[12px]
  border border-white/50
  border-t-white/70
  rounded-2xl
  p-6
  shadow-glass
  hover:-translate-y-0.5
  hover:shadow-glass-hover
  transition-[transform,box-shadow]
  duration-200
  ease-out
  will-change-[transform,box-shadow]
">

// Metric card
<div className="
  bg-white/80
  backdrop-blur-[20px]
  border border-white/50
  border-t-white/80
  border-l-white/80
  rounded-xl
  p-4
  shadow-glass
  hover:-translate-y-[3px]
  hover:shadow-glass-hover
  transition-[transform,box-shadow]
  duration-200
  ease-out
  will-change-[transform,box-shadow]
">
```

### Fallback — No backdrop-filter Support

```css
/* Graceful degradation to solid white card */
@supports not (backdrop-filter: blur(1px)) {
  .chart-glass,
  .card-metric-glass,
  .insight-card-glass {
    background:    var(--color-bg-card);    /* solid white */
    border-color:  var(--color-border);
    box-shadow:    var(--shadow-sm);
    /* All other styles — border-radius, padding, hover — remain identical */
  }
}
```

### Performance Notes

```
will-change: transform, box-shadow
  → declared on all glass elements
  → tells the browser to promote these to their own compositor layer upfront
  → prevents jank on first hover

backdrop-filter: blur() is GPU-accelerated in all modern browsers
  → Chrome 76+, Firefox 103+, Safari 9+ — covers 98%+ of users
  → the @supports fallback handles the remainder

Do NOT apply glass to more than ~10 elements per viewport at once
  → each backdrop-filter creates a new compositing layer
  → stacking too many causes memory pressure and frame drops
  → the usage list above (metric cards + chart containers) stays well within this limit
```

---

## 7. Animation & Motion

### Core Philosophy

```
Layer 1 — Micro    (10–150ms)   felt, not seen     → hover, press, focus
Layer 2 — Transition (150–350ms) seen, not studied  → card enter, nav slide, page change
Layer 3 — Moment   (400–800ms)  noticed and felt   → streak milestone, mode switch, AI arrival
```

### Easing Curves

```css
:root {
  --ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1.0);   /* standard UI transitions */
  --ease-enter:  cubic-bezier(0.0, 0.0, 0.2, 1.0);   /* elements coming IN */
  --ease-exit:   cubic-bezier(0.4, 0.0, 1.0, 1.0);   /* elements going OUT */
  --ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1.0);   /* chart lines, progress bars */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* milestone moments only */
}
```

### Complete Timing Reference

```
─── MICRO (felt, not seen) ──────────────────────
Focus ring appear           100ms   ease-out
Button press :active         50ms   ease-out
Checkbox / toggle           150ms   ease-out
Input border highlight      150ms   ease-out
Icon color on hover         100ms   ease-out

─── TRANSITION (seen, not studied) ──────────────
Card hover lift             200ms   ease-out
Nav underline slide         250ms   ease-smooth
Page enter                  200ms   ease-enter
Page exit                   150ms   ease-exit
Dropdown open               200ms   ease-enter
Dropdown close              150ms   ease-exit
Feed item height expand     200ms   ease-out
Feed item content fade       200ms   ease-enter  (150ms delay after expand)
Toast slide in              300ms   ease-spring
Toast slide out             200ms   ease-exit
Mode badge switch           200ms   ease-spring
Chart new data point        300ms   ease-smooth
Panel color crossfade       300ms   ease-smooth

─── MOMENT (noticed and felt) ───────────────────
Mode switch full sequence   300ms   ease-smooth
Metric count-up             800ms   ease-out
Chart draw on load          800ms   ease-out
AI insight arrival          400ms   ease-enter  (fade + translateY)
Streak milestone pulse      600ms   ease-spring
Skeleton shimmer           1500ms   linear      (infinite loop)
```

### Animation Implementations

#### Card Hover — Float Effect

```css
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  transform: translateY(0px);
  will-change: transform, box-shadow;
  transition:
    transform      200ms var(--ease-out),
    box-shadow     200ms var(--ease-out),
    border-color   200ms var(--ease-out);
}

.card:hover {
  transform: translateY(-3px);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}
```

#### Navbar — Sliding Underline

One shared indicator element slides between nav items — not individual per-link underlines appearing and disappearing.

```css
.nav {
  position: relative;
  display: flex;
  gap: 32px;
}

.nav-link {
  color: var(--color-text-secondary);
  font: 500 14px/1.375 'Inter', sans-serif;
  padding: 8px 0;
  transition: color 150ms var(--ease-out);
}

.nav-link:hover  { color: var(--color-primary); }
.nav-link.active { color: var(--color-primary); }

/* The single sliding indicator */
.nav-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background: var(--color-primary);
  border-radius: 2px 2px 0 0;
  transition:
    left   250ms var(--ease-smooth),
    width  250ms var(--ease-smooth);
  /* JS updates left and width to match active link */
}
```

```typescript
// React — track active link position
const navRef = useRef<HTMLElement>(null)
const [indicator, setIndicator] = useState({ left: 0, width: 0 })

const updateIndicator = (el: HTMLElement) => {
  const nav = navRef.current
  if (!nav) return
  const navRect = nav.getBoundingClientRect()
  const linkRect = el.getBoundingClientRect()
  setIndicator({
    left: linkRect.left - navRect.left,
    width: linkRect.width
  })
}
```

#### Button Effects

```css
.btn-primary {
  background: var(--color-primary);
  color: white;
  border-radius: 8px;
  padding: 8px 16px;
  font: 600 14px/1 'Inter', sans-serif;
  box-shadow: var(--shadow-primary);
  transform: translateY(0);
  will-change: transform, box-shadow;
  transition:
    background    150ms var(--ease-out),
    box-shadow    150ms var(--ease-out),
    transform     100ms var(--ease-out);
}

.btn-primary:hover {
  background: var(--color-teal-700);
  box-shadow: var(--shadow-primary-hover);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0px);          /* press down — feels physical */
  box-shadow: var(--shadow-primary);
  transition-duration: 50ms;           /* snappy on press */
}
```

#### Page Transitions

```css
/* Pages must be position: absolute, inset: 0 */
/* This is non-negotiable — prevents layout collision */
.page-wrapper {
  position: absolute;
  inset: 0;
  overflow-y: auto;
}

.page-enter {
  opacity: 0;
  transform: translateY(8px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity    200ms var(--ease-enter),
    transform  200ms var(--ease-enter);
}

.page-exit-active {
  opacity: 0;
  transition: opacity 150ms var(--ease-exit);
}
```

#### Feed Item Entry — No Jump Pattern

The critical two-phase approach: space opens first, then content fades in. This prevents the sudden push that makes feeds feel jarring.

```css
.feed-item {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  animation:
    feedExpand  200ms var(--ease-out)           forwards,
    feedFadeIn  200ms var(--ease-enter) 150ms   forwards;
    /*                                  ↑ 150ms delay — space opens first */
}

@keyframes feedExpand {
  from { max-height: 0;    }
  to   { max-height: 80px; }
}

@keyframes feedFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Existing items shift up smoothly when new item pushes them */
.feed-item-existing {
  transition: transform 200ms var(--ease-smooth);
}
```

#### Metric Count-Up Hook

```typescript
// Always use with tabular-nums and min-width container
function useCountUp(target: number, duration: number = 800) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)    // 60fps steps
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target])

  return value
}

// Usage
const count = useCountUp(11)
// Container must have min-width and tabular-nums to prevent layout shift
// <span className="tabular-nums" style={{ minWidth: '4ch' }}>{count}</span>
```

#### Recharts — Chart Animations

```tsx
// Line chart draws left to right on load
<Line
  type="monotone"
  dataKey="score"
  stroke="var(--color-primary)"
  strokeWidth={2}
  dot={false}
  isAnimationActive={true}
  animationDuration={800}
  animationEasing="ease-out"
/>

// New live data point appended via WebSocket
// Simply append to data array — Recharts animates the extension naturally
// No additional animation code required
```

#### Mode Switch — Full Sequence

```css
/* 1. Active badge scales down */
.mode-badge.switching {
  transform: scale(0.92);
  transition: transform 100ms var(--ease-out);
}

/* 2. Panel header color crossfades to new mode color */
.panel-header {
  transition: background-color 300ms var(--ease-smooth);
}

/* 3. New mode badge springs in */
.mode-badge.entering {
  animation: modeBadgeIn 200ms var(--ease-spring) forwards;
}

@keyframes modeBadgeIn {
  from { transform: scale(0.85); opacity: 0.6; }
  to   { transform: scale(1.0);  opacity: 1.0; }
}
```

#### Streak Milestone Celebration

Reserved exclusively for milestone moments — 7, 14, 30 day streaks. The rarity is what makes it feel earned.

```css
/* 1. Streak number pulse */
.streak-number.milestone {
  animation: streakPulse 600ms var(--ease-spring) forwards;
  transform-origin: center;
}

@keyframes streakPulse {
  0%   { transform: scale(1);    }
  30%  { transform: scale(1.25); }
  60%  { transform: scale(0.95); }
  80%  { transform: scale(1.08); }
  100% { transform: scale(1);    }
}

/* 2. Card success glow */
.streak-card.milestone {
  animation: streakGlow 800ms var(--ease-out) forwards;
}

@keyframes streakGlow {
  0%   { box-shadow: var(--shadow-sm); }
  40%  { box-shadow: var(--shadow-success-glow); }
  100% { box-shadow: var(--shadow-sm); }
}
```

#### Skeleton Loading — Teal Shimmer

```css
.skeleton {
  background: linear-gradient(
    90deg,
    #E0F2FE 0%,
    #BAE6FD 50%,
    #E0F2FE 100%
  );
  background-size: 200% 100%;
  border-radius: 6px;
  animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Focus Ring — Branded Accessibility

```css
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(8, 145, 178, 0.25),
    0 0 0 1px #0891B2;
}
```

#### AI Insight Arrival

```css
.insight-card.arriving {
  animation: insightArrive 400ms var(--ease-enter) forwards;
}

@keyframes insightArrive {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### GPU Acceleration — Global Rule

Add `will-change` to all animated elements to pre-promote them to their own GPU layer. This prevents layout recalculation, text blurring, and card displacement during animation.

```css
.card,
.feed-item,
.mode-badge,
.streak-badge,
.page-wrapper,
.btn-primary,
.insight-card {
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}
```

---

## 8. Component Patterns

### SurfBud Wordmark

```
"Surf" → Plus Jakarta Sans 700, color: var(--color-primary)  [teal]
"Bud"  → Plus Jakarta Sans 700, color: var(--color-text-heading) [near black]
```

### Section Label Pattern

The most important typographic pattern in the product — preserve it exactly.

```tsx
<p className="text-xs font-medium uppercase tracking-widest text-muted">
  Overview
</p>
```

Used for: OVERVIEW · THIS WEEK · THIS MONTH · PEAK HOUR · DOWNLOADS HEALTH

### Metric Card Pattern

```tsx
<div className="card">
  <p className="section-label">This Week</p>
  <p className="metric-hero tabular-nums" style={{ minWidth: '4ch' }}>
    {count}
  </p>
  <p className="metric-label">downloads</p>
  <span className="delta delta-negative">
    ↓ 16 vs last week
  </span>
</div>
```

### Progress Bar Pattern (Health / Storage)

```tsx
// Two-color segmented bar — teal (positive) + coral (warning)
<div className="progress-track">
  <div
    className="progress-fill progress-fill--success"
    style={{ width: `${successPercent}%` }}
  />
  <div
    className="progress-fill progress-fill--warning"
    style={{ width: `${warningPercent}%` }}
  />
</div>
```

```css
.progress-track {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--color-border);
}

.progress-fill {
  height: 100%;
  transition: width 600ms var(--ease-smooth);  /* animates on data load */
}

.progress-fill--success { background: var(--color-success); }
.progress-fill--warning { background: var(--color-coral); }
```

### Toast Notification Pattern

```css
.toast {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-strong);
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: var(--shadow-lg);
  animation: toastEnter 300ms var(--ease-spring) forwards;
}

@keyframes toastEnter {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

---

## 9. CSS Custom Properties — Full Token Reference

```css
:root {

  /* ── FOUNDATION ───────────────────────────────────── */
  --color-bg-page:          #F0F9FF;
  --color-bg-card:          #FFFFFF;
  --color-border:           #E0F2FE;
  --color-border-strong:    #BAE6FD;
  --color-bg-hover:         #F8FFFE;

  /* ── PRIMARY TEAL ─────────────────────────────────── */
  --color-teal-900:         #164E63;
  --color-teal-800:         #155E75;
  --color-teal-700:         #0E7490;
  --color-primary:          #0891B2;
  --color-teal-500:         #06B6D4;
  --color-teal-400:         #22D3EE;
  --color-primary-light:    #CFFAFE;

  /* ── TEXT ─────────────────────────────────────────── */
  --color-text-heading:     #0F172A;
  --color-text-strong:      #1E293B;
  --color-text-body:        #334155;
  --color-text-secondary:   #64748B;
  --color-text-muted:       #94A3B8;
  --color-text-ghost:       #CBD5E1;

  /* ── SEMANTIC ─────────────────────────────────────── */
  --color-success:          #16A34A;
  --color-success-light:    #DCFCE7;
  --color-success-dark:     #14532D;
  --color-warning:          #D97706;
  --color-warning-light:    #FEF3C7;
  --color-warning-dark:     #78350F;
  --color-danger:           #DC2626;
  --color-danger-light:     #FEE2E2;
  --color-danger-dark:      #7F1D1D;
  --color-info:             #2563EB;
  --color-info-light:       #EFF6FF;
  --color-info-dark:        #1E3A5F;

  /* ── ACCENTS ──────────────────────────────────────── */
  --color-coral:            #EA580C;
  --color-coral-light:      #FED7AA;
  --color-coral-bg:         #FFF7ED;
  --color-violet:           #7C3AED;
  --color-violet-light:     #EDE9FE;
  --color-violet-bg:        #F5F3FF;
  --color-emerald:          #059669;
  --color-emerald-light:    #D1FAE5;
  --color-emerald-bg:       #ECFDF5;
  --color-rose:             #E11D48;
  --color-rose-light:       #FFE4E6;
  --color-rose-bg:          #FFF1F2;

  /* ── MODE COLORS ──────────────────────────────────── */
  --color-mode-dev:         #7C3AED;
  --color-mode-chill:       #E11D48;
  --color-mode-deepwork:    #0891B2;
  --color-mode-study:       #059669;

  /* ── SHADOWS ──────────────────────────────────────── */
  --shadow-none:            none;
  --shadow-sm:              0 1px 3px rgba(8,145,178,0.06), 0 1px 2px rgba(8,145,178,0.04);
  --shadow-md:              0 8px 25px rgba(8,145,178,0.10), 0 4px 10px rgba(8,145,178,0.07), 0 1px 3px rgba(8,145,178,0.04);
  --shadow-lg:              0 16px 40px rgba(8,145,178,0.12), 0 8px 16px rgba(8,145,178,0.08), 0 2px 4px rgba(8,145,178,0.04);
  --shadow-xl:              0 24px 60px rgba(8,145,178,0.15), 0 12px 24px rgba(8,145,178,0.10), 0 4px 8px rgba(8,145,178,0.06);
  --shadow-primary:         0 4px 14px rgba(8,145,178,0.35);
  --shadow-primary-hover:   0 6px 20px rgba(8,145,178,0.45);
  --shadow-mode-ring:       0 0 0 3px rgba(8,145,178,0.15);
  --shadow-success-glow:    0 0 20px 4px rgba(22,163,74,0.30);

  /* ── EASING ───────────────────────────────────────── */
  --ease-out:               cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-enter:             cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-exit:              cubic-bezier(0.4, 0.0, 1.0, 1.0);
  --ease-smooth:            cubic-bezier(0.4, 0.0, 0.2, 1.0);
  --ease-spring:            cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* ── SPACING ──────────────────────────────────────── */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-6:   24px;
  --space-8:   32px;
  --space-12:  48px;
  --space-16:  64px;

  /* ── BORDER RADIUS ────────────────────────────────── */
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   10px;
  --radius-2xl:  12px;
  --radius-3xl:  16px;
  --radius-full: 9999px;

  /* ── GLASSMORPHISM ────────────────────────────────── */
  --glass-bg:              rgba(255, 255, 255, 0.65);
  --glass-bg-strong:       rgba(255, 255, 255, 0.80);
  --glass-border:          rgba(255, 255, 255, 0.50);
  --glass-border-teal:     rgba(8, 145, 178, 0.15);
  --glass-blur:            blur(12px);
  --glass-blur-strong:     blur(20px);
  --shadow-glass:          0 8px 32px rgba(8,145,178,0.08), 0 2px 8px rgba(8,145,178,0.04), inset 0 1px 0 rgba(255,255,255,0.60);
  --shadow-glass-hover:    0 12px 40px rgba(8,145,178,0.13), 0 4px 12px rgba(8,145,178,0.07), inset 0 1px 0 rgba(255,255,255,0.70);
}
```

---

## 10. Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',   // primary
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        'mode-dev':      '#7C3AED',
        'mode-chill':    '#E11D48',
        'mode-deepwork': '#0891B2',
        'mode-study':    '#059669',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.5' }],
        'xs':  ['12px', { lineHeight: '1.5' }],
        'sm':  ['13px', { lineHeight: '1.5' }],
        'base':['14px', { lineHeight: '1.5' }],
        'md':  ['16px', { lineHeight: '1.375' }],
        'lg':  ['20px', { lineHeight: '1.375' }],
        'xl':  ['24px', { lineHeight: '1.2' }],
        '2xl': ['32px', { lineHeight: '1.2' }],
        '3xl': ['48px', { lineHeight: '1.2' }],
      },
      boxShadow: {
        'sm':           '0 1px 3px rgba(8,145,178,0.06), 0 1px 2px rgba(8,145,178,0.04)',
        'md':           '0 8px 25px rgba(8,145,178,0.10), 0 4px 10px rgba(8,145,178,0.07)',
        'lg':           '0 16px 40px rgba(8,145,178,0.12), 0 8px 16px rgba(8,145,178,0.08)',
        'xl':           '0 24px 60px rgba(8,145,178,0.15), 0 12px 24px rgba(8,145,178,0.10)',
        'primary':      '0 4px 14px rgba(8,145,178,0.35)',
        'primary-hover':'0 6px 20px rgba(8,145,178,0.45)',
        'success-glow': '0 0 20px 4px rgba(22,163,74,0.30)',
        'glass':        '0 8px 32px rgba(8,145,178,0.08), 0 2px 8px rgba(8,145,178,0.04), inset 0 1px 0 rgba(255,255,255,0.60)',
        'glass-hover':  '0 12px 40px rgba(8,145,178,0.13), 0 4px 12px rgba(8,145,178,0.07), inset 0 1px 0 rgba(255,255,255,0.70)',
      },
      backdropBlur: {
        'glass':        '12px',
        'glass-strong': '20px',
      },
      backgroundColor: {
        'glass':        'rgba(255,255,255,0.65)',
        'glass-strong': 'rgba(255,255,255,0.80)',
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '6px',
        'lg':  '8px',
        'xl':  '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

## 11. Safety Rules — What We Never Animate

### The Fundamental Rule

```
✅ SAFE to animate    → transform, opacity, filter
❌ NEVER animate      → width, height, top, left, right, bottom,
                        margin, padding, font-size, border-width
```

Safe properties are GPU-composited — they never cause layout recalculation. Dangerous properties trigger the browser's full layout engine and will shift surrounding content.

### Per-Animation Safety Checklist

```
Card hover lift
  ✅ transform: translateY(-3px) — GPU only, surrounding cards unaffected
  ✅ Cards use gap not margin — no overlap risk on hover

Nav underline slide
  ✅ position: absolute — completely outside document flow
  ✅ Siblings never move — indicator slides underneath them invisibly

Feed item entry
  ✅ Two-phase: height expands first (200ms), content fades second (150ms delay)
  ✅ No sudden push — space opens smoothly before content appears

Metric count-up
  ✅ tabular-nums — every digit is the same width, no horizontal shift
  ✅ min-width: 4ch on container — space reserved upfront, label never moves

Page transitions
  ✅ position: absolute, inset: 0 — pages stack in same space, never push
  ✅ Entering and exiting pages overlap cleanly, no scroll jump

Scale animations (streak milestone)
  ✅ transform: scale — layout box never changes, surrounding content unaware
  ✅ transform-origin: center — scales outward from center, not from corner

Progress bars
  ✅ width transition on fill — technically a layout property but safe at this
     scale (contained within a fixed-height overflow:hidden track)
  ✅ Track is overflow: hidden — nothing outside can ever be displaced
```

### Three Rules to Never Break

```
Rule 1 — Only animate transform and opacity
         Anything else causes layout recalculation and displaces content

Rule 2 — Never stack more than two simultaneous animations on one element
         Pick the two most important properties and animate only those

Rule 3 — Reserve ease-spring exclusively for celebration and milestone moments
         Streak milestones, mode switches, successful actions only
         Everything else uses ease-out — spring used too often loses its impact
```

---

> **Next documents in this series:**
> - `API_REFERENCE.md` — All REST endpoints, request/response schemas, WebSocket events
> - `DATABASE_SCHEMA.md` — Full Mongoose schemas, index strategy, migration patterns
> - `FEATURE_ROADMAP.md` — Sprint plan, ticket breakdown, build order

---

*SurfBud Design System — v1.1 — March 2026*
*Ocean Teal · Plus Jakarta Sans + Inter + JetBrains Mono · Light Theme*
*Glassmorphic Charts & Metric Cards · Smooth · Consistent · Immersive · Displacement-Free*
