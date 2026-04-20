---
name: stitch
description: >
  Use this skill whenever the user wants to generate, design, or prototype any UI screen,
  component, page, dashboard, or visual layout using Google Stitch. Triggers on any request
  involving UI generation, screen creation, component design, wireframing, or visual prototyping
  — even if the user doesn't say "Stitch" explicitly. Phrases like "build this page",
  "design this component", "create the UI for", "generate a screen for", "make this look
  good", "prototype this", or "generate variants" should all trigger this skill. When
  working on SurfBud specifically, always use this skill — it contains the full SurfBud
  design system and workflow for producing Dribbble-quality dashboard screens.
---

# Stitch UI Generation Skill

## Workflow — Always Follow This Order

```
1. RESOLVE PROJECT   → list_projects → if none: create_project first
2. DESIGN SYSTEM     → list_design_systems → if none: create_design_system with tokens below
                     → if exists: update_design_system if tokens need updating
                     → Always apply before generating screens — never skip
3. GENERATE          → generate_screen_from_text with a rich prompt (see §Prompt Writing)
                     → OR edit_screens if iterating on existing screen
4. REVIEW            → get_screen → generate_variants (2–4) if user wants options
5. PRESENT           → share screen URL or export details
```

## Design System — SurfBud Tokens

### Colors
```
Primary:        #0891B2   buttons, links, active states
Primary Hover:  #0E7490
Primary Light:  #CFFAFE   badge backgrounds

Background:     #F0F9FF   page — ice blue, NOT pure white
Card:           #FFFFFF
Border:         #E0F2FE
Border Strong:  #BAE6FD
Hover Row:      #F8FFFE

Text Heading:   #0F172A
Text Strong:    #1E293B
Text Body:      #334155
Text Secondary: #64748B
Text Muted:     #94A3B8

Success:        #16A34A   / light #DCFCE7
Warning:        #D97706   / light #FEF3C7
Danger:         #DC2626   / light #FEE2E2

Violet:         #7C3AED   Dev Mode, AI
Rose:           #E11D48   Chill Mode
Emerald:        #059669   Study Mode, streaks
Coral:          #EA580C   distracting, wasted
```

### Typography
```
Display / Headings:  Plus Jakarta Sans  600, 700
UI Text:             Inter              400, 500, 600, 700
Monospace:           JetBrains Mono     400  (filenames, domains, URLs)
Numbers:             Inter + tabular-nums + lining-nums — always, no exceptions
```

### Shadows — always teal-tinted, never pure grey
```
Resting:   0 1px 3px rgba(8,145,178,0.06)
Hover:     0 8px 25px rgba(8,145,178,0.10), 0 4px 10px rgba(8,145,178,0.07)
Float:     0 16px 40px rgba(8,145,178,0.12)
Button:    0 4px 14px rgba(8,145,178,0.35)
```

### Glass Effects
```
Metric cards:  bg rgba(255,255,255,0.80)  blur 20px  border rgba(8,145,178,0.15)
               border-top + border-left rgba(255,255,255,0.80) for inner highlight
               inset shadow: inset 0 1px 0 rgba(255,255,255,0.60)
Chart panels:  bg rgba(255,255,255,0.65)  blur 12px  border rgba(8,145,178,0.15)
```

### Border Radius
```
Badges:   4px    Buttons/inputs: 8px
Cards:    10–12px              Large cards: 16px
```

### Spacing  — 8px grid
```
4px inner badge · 8px compact · 16px card padding · 24px card + section gap · 48px between sections
```

---

## Prompt Writing

Always write rich, detailed prompts. Never vague one-liners.

### Template
```
Generate a [PAGE NAME] dashboard screen.

PURPOSE: [one sentence]

VISUAL STYLE: Dribbble-quality SaaS dashboard. Glassmorphic metric cards with backdrop-blur
and teal-tinted borders. Page background #F0F9FF (ice blue, not white). Cards white with
rgba(8,145,178,0.15) teal border. Teal-tinted shadows. Primary #0891B2 ocean teal.
Plus Jakarta Sans headings (600/700), Inter UI text. Tabular-nums on all numbers. Light theme only.

LAYOUT: [grid + section structure]

SECTION 1 — [NAME]: [every element, color, content, state]
SECTION 2 — [NAME]: [every element, color, content, state]

INTERACTIVE STATES: [hover, active, empty, loading]
BADGES: [pills, dots, status indicators]
```

### Visual Hierarchy — 5 Levels (every screen must pass)
```
L1  Page title:      Plus Jakarta Sans 700  24px  #0F172A
L2  Section labels:  Inter 500  12px  uppercase  tracking-widest  #94A3B8
L3  Hero numbers:    Inter 700  32–48px  tabular-nums  #0F172A
L4  Metric label:    Inter 400  12px  #94A3B8  (below the number)
L5  Delta:           Inter 500  13px  #16A34A positive / #DC2626 negative
```

---

## SurfBud Component Patterns

Include these verbatim in prompts for consistent output.

**Metric card (glass)**
```
White bg rgba(255,255,255,0.80) backdrop-blur 20px border 1px solid rgba(8,145,178,0.15)
border-top/left rgba(255,255,255,0.80) rounded-xl shadow 0 8px 32px rgba(8,145,178,0.08).
Section label Inter 500 12px uppercase tracking-widest #94A3B8. Hero Inter 700 40px
tabular-nums #0F172A. Delta Inter 500 12px green/red. Hover: translateY(-3px) + shadow increase.
```

**Chart panel (glass)**
```
White bg rgba(255,255,255,0.65) backdrop-blur 12px border rgba(8,145,178,0.15) rounded-2xl p-6.
Chart series: primary #0891B2, positive #16A34A, negative #DC2626. Grid #E0F2FE. Axis Inter 11px #94A3B8.
```

**Row / feed item**
```
py-3 px-4 border-bottom #E0F2FE hover #F8FFFE 150ms. Logo 40×40 rounded-xl. Title Inter 500 14px
#1E293B. Meta Inter 400 12px #94A3B8. Status dot: productive #16A34A · distracting #DC2626 · neutral #94A3B8.
```

**Status badges**
```
NEW/MET:   bg #DCFCE7  text #16A34A
DUP/RISK:  bg #FEF3C7  text #D97706
ERROR:     bg #FEE2E2  text #DC2626
INFO:      bg #F0F9FF  text #0891B2
CUSTOM:    bg #F5F3FF  text #7C3AED
All: Inter 600 11px px-2 py-0.5 rounded-md
```

**Streak heatmap**
```
GitHub-style week grid. w-3 h-3 rounded-sm gap-0.5.
Met #16A34A · Partial #86EFAC · Missed #FCA5A5 · Inactive rgba(148,163,184,0.2)
Month labels 10px #94A3B8 above first week.
```

---

## What Makes It Dribbble vs Generic AI

```
✅ Teal-tinted shadows          ✅ Ice blue page bg #F0F9FF
✅ Glass + backdrop-blur        ✅ Tabular-nums on every metric
✅ Section labels uppercase     ✅ Colored status dots
✅ Gradient chart fills         ✅ Generous whitespace in cards

❌ Pure white background        ❌ Grey shadows
❌ Rainbow palette              ❌ All same text weight
❌ Tight spacing                ❌ Placeholder icons
```

## Iteration

**"make it better"** → `edit_screens` with specific targets:
```
"Increase metric number size. More breathing room inside cards. Taller chart area. Softer borders."
```

**"give me options"** → `generate_variants` with 3 genuinely different directions:
```
Variant 1: More data-dense — compact spacing, more info per card
Variant 2: More airy — fewer elements, larger cards, generous whitespace
Variant 3: Bolder — stronger color accents, larger type, more visual drama
```
Never generate variants that are just minor color tweaks.

## Common Mistakes

```
❌ Generating without applying design system first
❌ Vague prompts — always specify every section, component, and color
❌ Pure white page background — always #F0F9FF
❌ Grey shadows — always rgba(8,145,178,...) teal tint
❌ Forgetting tabular-nums on numbers
❌ Wrong project — always list_projects first
```
