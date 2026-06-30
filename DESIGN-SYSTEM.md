# Dental Map — Design System & Migration Contract

Every UI agent MUST follow this. Goal: migrate the app off the legacy
`app/styles/*.css` files onto **Tailwind v4 + the shared primitives**, while
upgrading the visual quality (modern, calm, medical-grade, mobile-first).

## Stack
- Tailwind v4 (tokens defined in `app/globals.css` via `@theme`).
- Shared primitives in `src/dental-map/ui/` — import from `@/src/dental-map/ui`.
- Icons: `lucide-react` (already used everywhere).
- Telegram mini app → **mobile-first**, max width ~`max-w-md`, touch targets ≥ 40px.

## Hard rules
1. **No hardcoded hex colors.** Use tokens: `bg-brand-500`, `text-ink-700`,
   `bg-surface-50`, `text-danger`, etc. Doctor accent palette tokens:
   `accent-teal | accent-blue | accent-rose | accent-violet | accent-sky`.
2. **No inline `style={{}}`** (breaks the strict CSP `style-src 'self'`). Use
   Tailwind classes or dynamic className. (Leaflet's own JS styling is fine.)
3. **Reuse primitives** — do not re-implement buttons/cards/modals. If a new
   primitive is truly needed, add a NEW file in `ui/`; never edit existing ones
   so agents don't collide.
4. **Remove the legacy classes** you replace (the old `className="brand-card"`
   etc.). Do not leave dead class names.
5. Keep all behavior, props, form `name=` attributes, and Uzbek copy identical.
6. Accessibility: keep `aria-*`, `type="button"`, labels, focus states.

## Tokens (already in globals.css)
- Color: `brand-{50..900}` (teal), `accent-{50..900}` (blue),
  `ink-{400,500,700,900}` (text), `surface-{0,50,100,200}` (bg),
  `success`, `warning`, `danger`.
- Radius: `rounded-card`, `rounded-sheet`, `rounded-pill`.
- Shadow: `shadow-card`, `shadow-float`.

## Primitives (`import { ... } from "@/src/dental-map/ui"`)
- `Button` — `variant: primary|secondary|ghost|danger`, `size: sm|md|lg`.
- `IconButton` — round icon action; `variant: solid|soft|ghost`, `active`.
- `Card` — `as`, `interactive`; padded surface with shadow.
- `Badge` — `tone: brand|success|warning|danger|neutral`.
- `Chip` — selectable pill (filters, gender/role/service toggles); `active`.
- `Field` / `TextareaField` — labelled inputs; spread native props (`name`, `value`…).
- `Select` — custom dropdown with styled options; `value/options/onChange`, `name`.
- `Modal` — centered dialog (backdrop, Esc, scroll lock).
- `Sheet` — bottom sheet (mobile pickers).

## Visual language
- Calm medical palette; generous whitespace; `rounded-card`/`rounded-2xl`.
- Soft shadows (`shadow-card`), not borders, for elevation.
- Primary actions = `brand-500`; secondary = `surface-100`.
- Section titles: `text-ink-900 font-bold`; meta text: `text-ink-500 text-sm`.
- Lists/grids: comfortable gaps (`gap-3`/`gap-4`), avoid cramped layouts.

## Definition of done (per file)
- File renders with Tailwind only (no legacy classes).
- `npm run typecheck` and `npm run lint` pass.
- No inline styles, no hardcoded hex.
