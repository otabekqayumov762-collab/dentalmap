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
- **Controls**: `bg-control` + `border-control-border`. Do NOT dress a control in
  the surface scale — `control` was once byte-identical to `surface-50`, which
  put an input at 1.05:1 against its card and left the whole boundary resting on
  a border that was itself under 3:1.
- **On the gradient**: `text-on-brand`. It does NOT flip with the theme, because
  the gradient does not either — `text-ink-900` inverts to near-white in dark and
  put white on bright teal.
- Radius: `rounded-control` (small controls: inputs, OTP cells, icon tiles),
  `rounded-card`, `rounded-sheet`, `rounded-pill`. Four values, no more.
  `rounded-card` on a 48px control makes it a lozenge — that is what
  `rounded-control` exists for.
- Shadow: `shadow-card`, `shadow-float`. Tailwind v4 inlines these, so a
  `.dark { --shadow-card }` override is DEAD — the dark variants live as
  `.dark .shadow-card` rules in globals.css. Do not "fix" them back into @theme.
- Spacing rhythm: `fieldGap` (2) < `groupGap` (4) < `blockGap` (6) <
  `screenGap` (8). They must differ: when field-to-field, card-to-card and
  form-to-header were all 16px, the screen read as a list of equally-related
  boxes and the eye had nothing to group by.
- Type: `sectionTitleClass` > `labelClass` > `hintClass`. A section title has to
  outrank a label by SIZE, not only weight — both were 14px.
- No arbitrary values. `text-[0.95rem]` is not a scale step.

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
- `PhoneField` — phone input with fixed **+998** prefix + `90 123 45 67` mask.
  Uncontrolled: `<PhoneField name="phone" defaultValue={...} />` (submits
  "+998 90 123 45 67" via hidden input). Controlled: `<PhoneField value={x}
  onValueChange={setX} name="phone" />`. Use it for EVERY phone input.

## Overflow rule (mobile-critical)
Never let a row overflow the viewport. For horizontal chip/scroll rows use
`overflow-x-auto no-scrollbar` AND make sure ancestors can shrink: parent grid
must be `grid-cols-1` (not bare `grid`) and flex/grid children need `min-w-0`.
Verify nothing is wider than the screen.

## Visual language
- Calm medical palette; generous whitespace; `rounded-card` for surfaces,
  `rounded-control` for controls.
- Soft shadows (`shadow-card`), not borders, for elevation.
- **The brand gradient means ONE thing: the action that moves you forward.**
  Three identical gradient pills once competed on the auth screen — two toggles
  and the CTA — so nothing read as primary. Toggles use a raised neutral.
- Section titles: `sectionTitleClass`; meta text: `text-ink-500 text-sm`.
  `ink-400` fails 4.5:1 on both the card and the control fill — it is not a text
  colour, only a decorative one.
- Choosers disappear once the choice is made. A wizard past step one shows an
  exit, not the controls that got you in.

## Contrast floors (measured, not assumed)
- Text: 4.5:1 against whatever it actually sits on — check the CONTROL fill for
  placeholders, not the card.
- Control boundary and focus ring: 3:1.
- Check BOTH themes. Most regressions here were dark-only.

## Definition of done (per file)
- File renders with Tailwind only (no legacy classes).
- `npm run typecheck` and `npm run lint` pass.
- No inline styles, no hardcoded hex.

## Audit checklist (make every screen ideal)
When polishing a screen, verify ALL of these:
1. **Consistent inputs** — use ONLY shared primitives: `Field`, `TextareaField`,
   `PhoneField` (phone), `Select` (single pick), `OptionGrid` (compact multi/single
   choice grid), `MultiSelectSheet` (many options → bottom sheet). NEVER hand-roll
   `<input>` with custom icon shells. Every input has a label; no icon on some and
   bare on others.
2. **375px, no horizontal overflow** — test at 375px width. Rows that can exceed
   width use `overflow-x-auto no-scrollbar` with `min-w-0` and a `grid-cols-1`
   parent (bare `grid` defaults to max-content). Never let anything be wider than
   the viewport.
3. **Cards** — `rounded-card bg-surface-0 shadow-card` (or `Card`), even padding,
   grouped logically. Avoid a long stack of many separate one-line cards — group
   related rows into one divided card.
4. **Titles** — section titles clearly outrank field labels (bigger/bolder).
5. **Role-appropriate** — never show patient-only actions in doctor views or vice
   versa.
6. **States** — every list has empty/loading/error states.
7. **Tokens only** — no inline `style={{}}`, no hardcoded hex.
8. **Bottom sheets** — use `Sheet` (has drag-to-close + X built in).

## Maps
Use `src/dental-map/lib/yandex.ts` — `loadYandex()`, `TASHKENT`, `TASHKENT_BOUNDS`,
`isYandexEnabled()`, `yandexMapsUrl()`. Prefer Yandex when `isYandexEnabled()`;
otherwise fall back to Leaflet + OpenStreetMap. Yandex JS API v2.1 uses `[lat,lng]`.
