---
name: flavor-atlas-ui
description: Design system and UI conventions for Flavor Atlas. Use whenever creating or changing any page, component, color, font or layout in this repo (src/pages, src/components, src/features/*/components, src/index.css), so new UI matches the "atlas of plates" design in both light and dark mode.
---

# Flavor Atlas UI

Concept: **an atlas of dishes, set like a food magazine.** Each cuisine is a colored region on a map, every recipe is a food photo (or its emoji) set on its region's color, and big serif headlines with italic accents do the editorial work (patterns adapted from NYT Cooking and editorial food sites). Keep new UI inside this idea instead of adding unrelated decoration.

## Two sides

- **Public site** (`RootLayout`): read-only. No create, edit, delete or rating controls, ever. The only way in to admin is the quiet "Admin" link in the footer.
- **Admin** (`/admin`, `AdminLayout`): every change happens here. Plainer and task-focused, same tokens and fonts. Tables on wide screens, row lists on phones. All admin pages are lazy routes.

## Colors: always tokens, never literals

All colors are CSS variables in `src/index.css`, defined on `:root` (light) and redefined in two dark blocks (`@media (prefers-color-scheme: dark) :root:not([data-theme='light'])` and `:root[data-theme='dark']`). Tailwind utilities map to them through `@theme inline`.

| Role | Utilities |
|---|---|
| Page / cards | `bg-canvas`, `bg-surface`, `bg-surface-sunken` |
| Text | `text-ink`, `text-ink-muted`, `text-ink-subtle` |
| Borders | `border-line`, `ring-line`, `divide-line` (decorative); `border-line-strong` for form controls (3:1 required) |
| Links, focus, primary actions | `accent`, `accent-hover`, `accent-soft`, `accent-ink`, `on-accent` |
| Cuisine color (inside a tinted wrapper) | `bg-tint`, `bg-tint-soft`, `text-tint-ink`, `ring-tint` |
| Ratings / errors | `text-star`, `text-star-empty`, `text-danger` |

Rules:
- Never write a hex value or a Tailwind palette color (`bg-stone-100`, `text-red-600`) in a component. Add a token instead.
- A new token needs a light value on `:root` **and** the same dark value in **both** dark blocks.
- Contrast targets: 4.5:1 for text, 3:1 for large text (24px+), icons and control borders. Check new values with a script, not by eye.
- Primary controls are at least 40px tall (`min-h-10`).
- Text on `bg-tint-soft` uses `text-tint-ink`, never `text-tint` (the base cuisine color is for large numerals and accents, not body text).

## Cuisine tint

Wrap anything that belongs to a cuisine with `style={cuisineTint(cuisineId)}` from `src/features/cuisines/utils.ts`. It points `--tint*` at `--c-<cuisineId>*`, falling back to the accent for cuisines without a palette. To give a new cuisine its own colors, add `--c-<id>`, `--c-<id>-soft` and `--c-<id>-ink` in all three token blocks and check contrast (ink on soft ≥ 4.5:1).

## Typography

| Role | How |
|---|---|
| Headings, dish and cuisine names | `font-display` (Instrument Serif). h1–h3 get it automatically. Big sizes (`text-4xl` section, `text-6xl`+ page titles). One weight: never add `font-bold`. Wrap an accent word in `<em>` for the italic tint-colored accent ("Cook your way <em>around the world</em>"); at most one per heading. |
| Body | Figtree (default). |
| Labels, eyebrows, times, coordinates, quantities | `.label-mono` (IBM Plex Mono, uppercase, tracked) or `font-mono` for values. Add `tabular-nums` where digits line up. |

## Signature elements

- **Photos fill their area, never a circle.** Cards: `RecipeCover`, 4:3, edge to edge. Recipe hero and the featured card: the photo is the background, with `.photo-scrim` and `.on-photo` (a scoped theme that turns the tokens light, so stars, labels and links need no special cases). The credit is a small pill over the photo (`PhotoCredit`). `usePhoto` drops a photo that fails to load, and the emoji layout takes its place.
- **FoodEmoji** (`components/ui/FoodEmoji.tsx`): the picture for a recipe without a photo, set straight on `atlas-dots` (no plate). Use `recipe.emoji || cuisine.emoji`. `sm` is a tinted tile for list rows; `md`/`lg` float with a soft shadow.
- **Atlas dots** (`.atlas-dots`): dotted map background in the current tint. Use for covers and tinted headers only, not on every surface.
- **Coordinates**: cuisines show `origin · formatCoordinates(cuisine)` in `.label-mono`.
- **Region tag** (`features/dishes/components/RegionTag.tsx`): "📍 Name · coords" in `.label-mono` for regional versions. A regional version shows its tag plus the one-line `variantNote` (italic serif on the recipe hero, plain text on cards with `showVariantNote`). Classic versions show neither.

## Recipe page pattern

Breadcrumb (Recipes / Cuisine / Dish) → hero (tinted, dotted), region tag + note when regional → facts row (mono) → ingredients + steps → "Other ways to cook {dish}" row → reviews. On phones a sticky Ingredients / Steps toggle shows one at a time; on `md+` the ingredients sit in a sticky sidebar. Ingredient names in steps are highlighted with `highlightIngredients()`. The servings scaler rescales quantities with `scaleQuantity()`.

## Admin stat tiles

`StatTile`: sentence-case label, value in the **sans** font, semibold, proportional figures (no `tabular-nums`, never the serif), optional hint. A number that tells the story gets a tile, not a chart.

## Layout and components

- Max width `max-w-6xl`, side gutter `px-4`, sections separated with `space-y-*` / `gap-*`, not margins on children.
- Phone first: check 390px and 320px wide. Grids go 1 column (recipes) or 2 columns (cuisine tiles) on phones.
- Radius by role: `rounded-3xl` tinted headers, `rounded-2xl` cards, `rounded-full` pills, inputs and buttons.
- Recipe cards are editorial: the picture block (`rounded-2xl`, photo or emoji on `atlas-dots`) carries the card, text sits below on the page, hover underlines the title. Panels and lists use `bg-surface ring-1 ring-line`. No shadows except the floating emoji.
- Collection rows (`RecipeRow`) swipe sideways on phones (`snap-x`, ~78% card width) and become a grid on `sm+`.
- Primary button: `bg-ink text-canvas hover:bg-accent rounded-full`. Text links: `text-accent hover:text-accent-hover`.
- Forms: wrap controls in `Field` (`components/ui/form.tsx`) with `inputClass` and `describedBy()` from `formStyles.ts`. Validate with the Zod schema through `zodResolver`. Field errors are plain text linked by `aria-describedby`; the form has exactly one `role="alert"` summary ("Fix 3 fields to save."). Never use `window.confirm()`; use `ConfirmDialog`.
- Destructive actions: `text-danger` for the trigger, `bg-danger text-on-danger` for the confirm button inside `ConfirmDialog`.
- Every list fetch has three states: `CardGridSkeleton`, `ErrorState` (with retry), `EmptyState`.
- Motion: small and purposeful (the emoji tilts on hover, a photo zooms 3%). Always pair with `motion-reduce:` overrides.

## Before finishing UI work

1. `npm run typecheck && npm run lint && npm test`
2. Look at the change at 390px in light and dark mode (Playwright, `colorScheme: 'dark'`).
3. For bigger changes, run the `ui-reviewer` agent in `.claude/agents/`.
