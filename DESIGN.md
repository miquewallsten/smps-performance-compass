# Design System — SMPS Performance Compass

> Generated via impeccable. Last updated: 2026-05-26

## Design Token Reference

### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | 210 20% 98% | 215 50% 8% | Page background |
| `--foreground` | 215 50% 15% | 210 20% 90% | Primary text |
| `--primary` | 215 50% 15% | 210 20% 90% | Header bar, brand |
| `--accent` | 350 80% 42% | 350 80% 50% | CTAs, highlights, nav active |
| `--muted` | 210 15% 95% | 215 40% 18% | Secondary backgrounds |
| `--card` | 0 0% 100% | 215 45% 12% | Card surfaces |
| `--border` | 214 20% 88% | 215 35% 22% | Borders, dividers |
| `--smps-navy` | 215 50% 15% | — | Brand navy |
| `--smps-red` | 350 80% 42% | — | Brand accent |
| `--smps-gold` | 40 60% 50% | — | Warnings, highlights |
| `--smps-success` | 145 60% 40% | — | Success states |
| `--smps-warning` | 35 90% 55% | — | Caution states |

### Typography

| Role | Family | Weight | Size |
|------|--------|--------|------|
| Display / Headings | Source Sans 3, system-ui, sans-serif | 600–700 | 20–24px |
| Body / UI | Source Sans 3, system-ui, sans-serif | 400–600 | 12–16px |
| Section title | Body | 600, uppercase, tracking-widest | 12px |
| Stat value | Body, bold, tracking-tight | 700 | 24px |
| Badge | Body, medium | 500 | 12px |
| Nav label | Body | 500 | 14px |
| Auth headings | Playfair Display, Georgia, serif | 700 | 24–32px |

### Spacing

- Page padding: `p-4` (mobile), `md:p-5` (desktop)
- Card padding: `p-4` (flat), `p-5` (elevated)
- Section gap: `space-y-4` (page), `gap-3` (grids)
- Sidebar width: `w-52` (expanded), `w-14` (collapsed)
- Header height: `h-14`

### Radii

- Default: `0.5rem` (via `--radius`)
- Buttons: `rounded-md`
- Cards: `rounded-lg` (flat), `rounded-xl` (elevated)
- Avatars/badges: `rounded-full`

## Surface Variants

| Class | Usage | Visual |
|-------|-------|--------|
| `.smps-surface-flat` | Inline sections | No bg, no border |
| `.smps-surface-card` | Standard cards | Rounded, bordered, white bg |
| `.smps-surface-elevated` | Featured cards | Rounded-xl, shadow-sm |
| `.smps-surface-hero` | Hero/banner | Primary bg, white text |

## Motion System

### Principles (per Emil Kowalski / impeccable)

1. **Specific transitions only** — Never `transition-all`. Always specify exact properties: `transition-[background-color,border-color,transform,box-shadow]`
2. **Enter > Exit** — Enter animations 200ms ease-out, exits 150ms ease-in. Exits feel decisive.
3. **Hover guards** — `@media (hover: hover) and (pointer: fine)` for hover transforms (prevents sticky hover on touch)
4. **Active press** — All interactive elements use `:active { scale(0.97) }` or `scale(0.95)` for tactile feedback
5. **Stagger rhythm** — 60ms between sibling items. Use `.smps-stagger` for lists, `.smps-delay-*` for manual placement
6. **Max duration** — No animation exceeds 350ms. Micro-interactions 100–200ms.

### Animation Classes

| Class | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `.smps-fade-in` | 200ms | ease-out | General appear |
| `.smps-fade-up` | 250ms | ease-out | Cards entering |
| `.smps-slide-in` | 200ms | ease-out | Sidebar items |
| `.smps-scale-in` | 150ms | ease-out | Modals, popovers |
| `.smps-reveal` | 350ms | cubic-bezier(0.16, 1, 0.3, 1) | Stat cards, featured |
| `.smps-slide-up` | 250ms | ease-out | Bottom-up entries |

### Stagger Delays

`.smps-delay-1` through `.smps-delay-8`: 60ms, 120ms, 180ms, ..., 480ms

## Component Patterns

### Buttons

```html
<button class="smps-btn px-4 py-2 bg-accent text-accent-foreground hover:opacity-90">
  Action
</button>
```

All buttons use `.smps-btn` for `:active` press. Specific `transition-[opacity,transform]` on hover.

### Cards with hover

```html
<div class="smps-surface-elevated smps-card-hover">
  <!-- hover lift only on pointer devices -->
</div>
```

### Stat cards

```html
<button class="smps-stat-card smps-reveal">
  <Icon class="h-4 w-4 text-accent" />
  <p class="smps-stat-value">42</p>
  <p class="text-[11px] text-muted-foreground uppercase tracking-wide">Label</p>
</button>
```

### Section titles with accent dot

```html
<p class="smps-section-title flex items-center">
  <span class="smps-accent-dot" />Section Label
</p>
```

### Accent bar (replaces border-l-4 AI slop)

```html
<div class="smps-accent-bar pl-4">
  Content with vertical accent line
</div>
```

## Anti-patterns (Do Not)

- ❌ `transition-all` — Always specify properties
- ❌ `ease-in` on UI elements (use `ease-out` or `ease-in-out`)
- ❌ `duration > 350ms` on micro-interactions
- ❌ `border-l-4` for accent indicators (use `.smps-accent-bar`)
- ❌ `bg-black` overlays (use `.smps-overlay`)
- ❌ Hover transforms without `@media (hover: hover)` guard
- ❌ Rounded pill buttons (use `rounded-md`)
- ❌ Generic SaaS gradients
- ❌ Playful icons or emoji in UI chrome
- ❌ English text anywhere in UI

## File Structure

```
src/index.css          — Design tokens, surface variants, motion utilities
src/components/Layout  — App shell, sidebar, header, mobile nav
src/pages/Dashboard    — Stat cards, expandable sections
src/pages/Login        — Auth screen with gradient header
src/pages/CopilotChat  — AI assistant chat interface
```
