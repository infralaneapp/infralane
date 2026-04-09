# OpsFlow Design System

Blends Notion's warm, approachable light mode with Linear's precision engineering for components.

## 1. Philosophy

A warm, clean productivity tool. Notion's "blank canvas" warmth as the foundation — warm neutrals, whisper-thin borders, generous whitespace. Linear's precision for interactive components — tight typography, deliberate spacing, status-driven color.

## 2. Color Palette

### Backgrounds
- **Canvas**: `#f6f5f4` (Notion warm white — main page background)
- **Surface**: `#ffffff` (cards, panels, elevated content)
- **Surface Muted**: `#f9f8f7` (subtle alternating sections, hover states)
- **Sidebar**: `#f6f5f4` (navigation background)

### Text
- **Primary**: `#1a1a1a` (warm near-black — headings, primary content)
- **Secondary**: `#37352f` (Notion warm dark — body text)
- **Muted**: `#6b6660` (warm gray — descriptions, metadata)
- **Faint**: `#a39e98` (Notion warm gray 300 — placeholders, disabled, timestamps)

### Brand & Accent
- **Accent**: `#5e6ad2` (Linear indigo — primary CTAs, active states)
- **Accent Hover**: `#4f5bc4` (darker indigo for hover)
- **Accent Soft**: `#eef0fb` (tinted indigo background for badges, highlights)
- **Accent Text**: `#5e6ad2` (links, interactive text)

### Status (Linear-inspired, precise and intentional)
- **Open**: `#5e6ad2` / `#eef0fb` (indigo — new, needs attention)
- **In Progress**: `#d97706` / `#fef3cd` (amber — active work)
- **Waiting**: `#8b5cf6` / `#f3f0ff` (violet — blocked on requester)
- **Resolved**: `#10b981` / `#ecfdf5` (emerald — complete)
- **Closed**: `#6b6660` / `#f5f4f3` (warm gray — archived)

### Borders & Dividers
- **Border**: `rgba(0, 0, 0, 0.08)` (Notion whisper border — default)
- **Border Strong**: `rgba(0, 0, 0, 0.14)` (inputs focus, emphasis)
- **Divider**: `rgba(0, 0, 0, 0.06)` (table rows, subtle separators)

### Feedback
- **Danger**: `#dc2626` (errors, destructive actions)
- **Danger Soft**: `#fef2f2`
- **Warning**: `#d97706`
- **Warning Soft**: `#fffbeb`
- **Success**: `#10b981`
- **Success Soft**: `#ecfdf5`

## 3. Typography

**Font**: Inter Variable with `font-feature-settings: "cv01", "ss03"` (Linear's geometric alternates).
Fallbacks: `-apple-system, system-ui, Segoe UI, sans-serif`.

**Monospace**: `ui-monospace, SF Mono, Menlo, monospace`

### Scale

| Role | Size | Weight | Letter Spacing | Line Height |
|------|------|--------|---------------|-------------|
| Display | 36px (2.25rem) | 600 | -0.8px | 1.1 |
| Page Title | 24px (1.5rem) | 600 | -0.5px | 1.2 |
| Section Title | 18px (1.125rem) | 600 | -0.3px | 1.3 |
| Card Title | 16px (1rem) | 600 | -0.2px | 1.4 |
| Body | 14px (0.875rem) | 400 | normal | 1.5 |
| Body Medium | 14px (0.875rem) | 500 | normal | 1.5 |
| Caption | 13px (0.8125rem) | 400 | normal | 1.4 |
| Label | 12px (0.75rem) | 500 | 0.02em | 1.3 |
| Badge | 11px (0.6875rem) | 600 | 0.03em | 1.2 |

### Principles
- Negative letter-spacing on headings (tighter = larger)
- Weight 500 for UI elements (Linear's between-weight feel)
- Weight 600 for emphasis (not 700 — avoids heaviness)
- Uppercase + tracking for labels and metadata headers

## 4. Spacing

8px base grid. Primary rhythm: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- Component internal padding: 16-24px
- Card padding: 24px
- Section gaps: 24px
- Page padding: 24-32px
- Sidebar width: 260px

## 5. Border Radius

| Element | Radius |
|---------|--------|
| Buttons, inputs | 8px |
| Cards, panels | 12px |
| Badges, pills | 9999px |
| Avatars | 50% |
| Small elements (tooltips) | 6px |

## 6. Shadows

Notion-style multi-layer, extremely subtle:

- **Card**: `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`
- **Card Hover**: `0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)`
- **Dropdown**: `0 4px 16px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.1)`
- **None on most elements** — borders do the work, not shadows

## 7. Components

### Buttons
- **Primary**: `bg-accent text-white`, 8px radius, 500 weight, 14px. Hover: `bg-accent-hover`.
- **Secondary**: `bg-white border-border text-secondary`, 8px radius. Hover: `bg-surface-muted`.
- **Ghost**: `bg-transparent text-muted`. Hover: `bg-surface-muted`.
- **Danger**: `bg-danger text-white`. Hover: darker.
- Padding: `8px 16px` (default), `6px 12px` (small).
- Active: `scale(0.98)` transform.

### Cards
- `bg-white`, `1px solid rgba(0,0,0,0.08)`, 12px radius.
- `shadow-card` elevation.
- Hover: optional `shadow-card-hover` transition.

### Inputs
- `bg-white`, `1px solid rgba(0,0,0,0.08)`, 8px radius.
- 14px text, `#a39e98` placeholder.
- Focus: `border-accent`, `ring-2 ring-accent/10`.
- Padding: `8px 12px`.

### Badges / Status Pills
- 9999px radius (full pill).
- 11px font, weight 600, uppercase letter-spacing.
- Tinted background + darker text per status color.
- Compact: `4px 10px` padding.

### Tables
- Header: `bg-canvas`, 12px uppercase label text, `text-faint`.
- Rows: white bg, `border-b border-divider`.
- Row hover: `bg-surface-muted` transition.
- Cell padding: `12px 16px`.

### Navigation / Sidebar
- `bg-canvas` background, `border-r border-border`.
- Nav items: 14px, weight 500, `text-muted`. Active: `text-accent bg-accent-soft`.
- Hover: `bg-surface-muted`.
- Compact vertical spacing: `4px` between items, `8px` padding per item.

### Activity Timeline
- Left border accent line (`2px border-l border-border`).
- `pl-16px` content offset.
- Timestamp in `text-faint` caption size.
- Actor name in `text-secondary` body medium.

## 8. Dark Mode (Future)

Reserve Linear's dark palette for future dark mode toggle:
- Canvas: `#0f1011`
- Surface: `#191a1b`
- Text primary: `#f7f8f8`
- Accent stays: `#5e6ad2` / `#7170ff`
- Borders: `rgba(255,255,255,0.08)`

## 9. Do's and Don'ts

### Do
- Use warm neutrals (yellow-brown undertones, not blue-gray)
- Keep borders whisper-thin: `rgba(0,0,0,0.08)` max
- Use Inter with `"cv01", "ss03"` everywhere
- Negative letter-spacing on headings
- Use accent color sparingly — CTAs, active states, links only
- Let whitespace breathe — generous padding between sections
- Status colors are functional, not decorative

### Don't
- Don't use pure black (`#000000`) for text — use warm near-black
- Don't use heavy borders or thick dividers
- Don't use weight 700 — max is 600
- Don't add color for decoration — the palette is mostly neutral
- Don't use drop shadows for primary depth — use borders
- Don't mix warm and cool grays
