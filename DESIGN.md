# Stitch Web — Design System

Specification for the interface. `src/styles.css` (`:root` block) is the token
source; this document is the standard it is held to. Rules reference tokens only —
no ad-hoc values anywhere in component styles.

- **Surface class:** desktop web tool, also used on mobile web (responsive).
- **Palette owner:** we own it (single dark scheme). No host palette to respect.
- **Scope:** the app shell and all three editors. The generated image content
  (user screenshots, device frames) is **not** styled by this system.

## Principles

1. **One fixed viewport, stable layout.** The preview never grows with its content,
   so adding/removing images never reflows the page. Controls live in one column of
   fixed width; the canvas takes the rest.
2. **Tokens decide, not taste.** Every colour, space, radius, size and duration is a
   named token. A new value means a new token, agreed here — otherwise reuse.
3. **Two roles per control.** Track vs. thumb, surface vs. border, muted vs. text.
   Active state is the only place the accent gradient appears.
4. **Legible at a glance.** Secondary copy is muted, tertiary is faint; nothing
   communicates meaning by colour alone (confidence also shows a percentage).
5. **Thumb-sized targets.** Interactive controls are ≥ 44px tall on touch surfaces.

## Foundations

Layers are declared in a fixed order (color → typography → space → shape →
elevation → layout → motion). Later layers only consume earlier names.

### Color (roles)

| Token | Value | Use |
| --- | --- | --- |
| `--c-canvas` | `#0b0c10` | App background |
| `--c-surface` | `#14161d` | Panels, cards, dropzone |
| `--c-surface-2` | `#1b1e27` | Raised controls: segmented track, inputs, image rows |
| `--c-surface-3` | `#232733` | Inset / hover fill, range track |
| `--c-border` | `#2a2e3a` | Default border |
| `--c-border-soft` | `#21242e` | Dividers, panel outline |
| `--c-text` | `#e8eaf0` | Primary text |
| `--c-text-muted` | `#8a90a2` | Labels, secondary text |
| `--c-text-faint` | `#5f6577` | Hints, disabled |
| `--c-accent` | `#5b8cff` | Active selection, links, focus ring basis |
| `--c-accent-2` | `#7c5cff` | Gradient partner |
| `--c-on-accent` | `#ffffff` | Text/knob on accent |
| `--c-danger` | `#ff5c72` | Destructive |
| `--c-success` | `#37d67a` | Success status, "good" confidence |
| `--c-warning` | `#ffb020` | Warning, "ok" confidence |
| `--c-focus` | `#8fb0ff` | `:focus-visible` ring |
| `--c-scrim` | `rgba(11,12,16,.66)` | Busy overlay |
| `--c-checker` | `rgba(255,255,255,.025)` | Checkerboard behind transparent output |

Contrast: `--c-text` on `--c-surface` ≈ 13.6:1; `--c-text-muted` on `--c-surface`
≈ 5.6:1; `--c-on-accent` on `--c-accent` ≈ 3.3:1 (large/bold labels only). Muted on
canvas is ≥ 4.5:1. Confidence is never colour-only (a percentage is shown).

### Typography

| Token | Value | Use |
| --- | --- | --- |
| `--font-sans` | system stack | Everything |
| `--fs-2xs` | 11px | Hints, badges, zoom readout |
| `--fs-xs` | 12px | Labels, secondary |
| `--fs-sm` | 13px | Controls, panel titles |
| `--fs-md` | 14px | Body / brand |
| `--fs-lg` | 16px | Emoji / marks |
| `--fs-xl` | 20px | Reserved |
| `--fw-regular/medium/semibold/bold` | 400/500/600/700 | — |
| `--lh-tight` / `--lh-normal` | 1.3 / 1.6 | Headings / prose |

### Space — 4px base

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 · `--sp-8` 32.

### Shape

`--r-xs` 6 · `--r-sm` 8 · `--r-md` 10 · `--r-lg` 14 · `--r-xl` 18 · `--r-pill` 999.

### Size

`--ctl-h-sm` 28 · `--ctl-h-md` 34 · `--ctl-h-lg` 40 · `--hit-min` 44 (touch).

### Component geometry

Repeated intrinsic sizes are tokens too, so a component never carries a raw value.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--border-w` | 1px | `--border-w-2` | 2px |
| `--border-w-dash` | 1.5px | `--thumb-border` | 3px |
| `--focus-ring` | 2px | `--focus-offset` | 2px |
| `--r-2xs` | 2px | `--caret` / `--caret-h` | 5px / 4px |
| `--sp-0-5` / `--sp-0-75` | 2px / 3px | `--fs-2xl` | 30px |
| `--spinner-size` | 18px | `--brand-mark` | 26px |
| `--range-h` | 22px | `--track-h` | 4px |
| `--range-thumb` / `-moz` | 16px / 14px | `--switch-w/h/knob` | 40 / 23 / 17px |
| `--color-swatch-w` | 34px | `--tray-thumb-w/h` | 72 / 100px |
| `--badge-h` / `--badge-sm` | 18px / 20px | `--icon-btn` | 22px |
| `--dot-size` | 9px | `--checker` | 22px |
| `--blur-appbar` / `--blur-scrim` | 14px / 3px | `--z-appbar` | 30 |

**Documented exceptions** (cannot be tokens): the `@media (min-width: 880px)`
breakpoint (custom properties are not allowed in media queries) and the 1px
`sr-only` clip rectangle (a utility, not a visual decision).

### Elevation

`--shadow-1` subtle (range thumb) · `--shadow-2` preview canvas · `--shadow-accent` active segment.

### Layout

| Token | Value | Use |
| --- | --- | --- |
| `--app-max` | 1680px | Centred app content cap |
| `--sidebar-w` | 380px | Desktop control column |
| `--appbar-h` | 56px | Sticky header height (offsets) |
| `--stage-h` | `clamp(320px, 58vh, 760px)` | Fixed preview viewport |
| `--panel-max` | 620px | Single-column control width cap |

Breakpoint: **880px** switches from one column (preview, then controls, capped at
`--panel-max` and centred) to two columns (preview flexes, controls sticky at
`--sidebar-w`).

### Motion

`--dur-fast` 0.12s, `--ease`. Bare state transitions only. `prefers-reduced-motion`
zeroes `--dur-fast` (spinner slows instead of stopping).

## Components

- **Appbar** — sticky, blurred canvas; brand · centered mode segmented · actions.
- **Segmented** (`Segmented`) — track `--c-surface-2`; item min `--ctl-h-md`; active
  = accent gradient + `--shadow-accent`. `wrap` variants lay out 2-per-row (md) or
  3-per-row (sm) so labels never collide in the 380px column.
- **Panel** — collapsible section; header ≥ `--hit-min`; body gap `--sp-3`.
- **Slider** — label left / value right; track `--c-surface-3`; accent thumb.
- **Toggle** — 40×23 track → accent when on; knob translate 17px.
- **Button** — default / primary (accent gradient) / ghost / danger; heights
  `--ctl-h-lg`, ghost `--ctl-h-sm`.
- **Segmented thumbnail tray** — 72×100, `object-fit: contain`, so a full screenshot
  is recognisable rather than cropped.
- **PreviewCanvas** — fixed-height stage; image `contain`-fitted; `适应` / `1:1`
  toggle; dims + zoom readout.

## Accessibility

- Focus: `:focus-visible` ring `--c-focus` on every interactive element.
- Hit targets: ≥ `--hit-min` on touch surfaces (panel headers, tray actions).
- Not colour-alone: confidence shows a dot **and** a percentage.
- Reduced motion: honoured via `--dur-fast: 0`, spinner period widened.
- Zoom: `1:1` shows the output at native pixels; the viewport scrolls, nothing clips.

## To confirm

- Whether a light scheme is wanted (tokens are role-based, so a second scheme is a
  token block, not a component change).
- Whether the control column should be user-resizable (`--sidebar-w`).
