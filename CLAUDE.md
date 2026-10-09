# Flavor Atlas

Recipe book organized by cuisine. React 19 + Vite + TypeScript (strict), React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS v4, json-server as a fake REST API. The owner is a software engineering student: briefly explain design decisions and point out patterns worth learning.

## Commands

```bash
npm run dev          # app + API on :5173 (json-server runs in-process behind the auth gateway)
npm run dev:mock     # Vite only, no API: seed data in memory (artifact data source falls back to it)
npm run db:reset     # restore db.json from db.seed.json, then restart dev (needed after seed shape changes)
npm test             # Vitest unit tests
npm run typecheck && npm run lint && npm test && npm run build   # run before every commit
# .githooks/pre-commit runs typecheck, lint and tests on every commit (activated by npm install)
npm run build:demo   # single-file build in dist-demo/ (seed + artifact db changes, memory router, viewer AI)
npm run auth:hash     # admin password hash + session secret for .env
# AI helpers need ANTHROPIC_API_KEY in .env (server only, no VITE_ prefix)
```

## Architecture

- `src/features/<feature>/`: everything for one feature: `schema.ts` (Zod), `queries.ts`, `utils.ts` (+ tests), `components/`.
- `src/services/data/`: the `DataService` interface with three implementations: `httpDataService` (json-server), `mockDataService` (seed in memory) and `artifactDataService` (phone preview: seed plus changes saved in the artifact's shared `db`, see `overlay.ts`). The last two share their query logic through `createSnapshotDataService(store)` in `snapshotDataService.ts`. `index.ts` picks one from `VITE_DATA_SOURCE`. UI code imports `dataService` only, never an implementation.
- `src/pages/`: route-level components; `src/pages/admin/` for the admin area. `src/app/router.tsx` defines routes once for both browser and memory routers.
- **Two sides:** the public site (`RootLayout`) is read-only. Every create, edit, delete and rating control lives under `/admin` (`AdminLayout` + `RequireAdmin`), whose pages are lazy routes. Never add controls that write shared data to public pages. Per-visitor conveniences kept in the visitor's own browser are fine (saved recipes, `features/saved/`): they change nothing anyone else sees.
- `src/lib/config.ts` is the only file that reads `import.meta.env`.
- **Keep the first download small.** Pages and parts a visitor reaches later load on demand: lazy routes in `router.tsx`, `React.lazy` for the map and cook mode, and the data service itself (`lazyDataService.ts`), so the json-server build never ships the seed. Library chunks are named in `vite.config.ts`; check `npm run build` output when adding a dependency.

## Rules

- **Zod schemas are the source of truth.** Derive types with `z.infer`; never hand-write a type that duplicates a schema. Validate data where it enters the app (HTTP responses, forms, AI output).
- **New data operations go on `DataService`, in `httpDataService` and in `createSnapshotDataService`** (which covers the mock and the artifact), so the demo keeps working.
- **Server state goes through TanStack Query** using the factories in `features/*/queries.ts` (`useQuery(recipeQueries.detail(id))`). After a mutation, invalidate by factory key (`recipeQueries.all()`), never with hand-typed keys. No `useEffect` fetching.
- **Pure logic lives in `utils.ts` with a test next to it.** Components stay thin.
- **Every recipe belongs to a dish** of the same cuisine; a regional version also has a same-cuisine region and a `variantNote`. `seed.test.ts` enforces this for `db.seed.json`: keep it passing when adding seed data. Creating a recipe under a new dish goes through `useSubmitRecipe` (creates the dish first).
- **UI work follows the `flavor-atlas-ui` skill** (`.claude/skills/flavor-atlas-ui/SKILL.md`): theme tokens only, both themes, phone first. For bigger UI changes, run the `ui-reviewer` agent before committing.
- **AI output is untrusted input.** Ask for a schema shape (structured outputs on the server, explicit JSON in the prompt for the artifact), then validate with `aiSuggestionSchemas` before it reaches the form. Suggestions are previewed; the cook accepts them explicitly.
- **One prompt builder** (`src/features/ai/prompts.ts`) for every AI path. Change prompts there, not in a service.
- **Access is enforced on the server.** Every write goes through the `/api/data` gateway (`server/auth/access.ts` decides). Hiding a button is never the protection. New write endpoints must check `isAdmin()` the same way.
- **Server-only secrets** live in `server/` and in env vars without the `VITE_` prefix. Never import `@anthropic-ai/sdk` from `src/`.
- Every list or detail view handles loading, error and empty states.
- Imports use the `@/` alias for anything outside the current feature folder.
- **Photos are credited and bundled.** Seed photos live in `public/photos/` as WebP (`/photos/<slug>.webp`), only from freely licensed sources, with `imageCredit` ("Photo: Author, License") and `imageSourceUrl`; `seed.test.ts` enforces both. Render photos through `RecipeCover` (resolves the path with `photoSrc`, falls back to the emoji on error) or `usePhoto` for background photos; never a bare `<img>`.
- Keep runtime data out of git: `db.json` is ignored; edit `db.seed.json` instead.

## Adding a cuisine

A cuisine is data: `countryCode`, capital `latitude`/`longitude` and a `hue` (0-360). With those:
- **Colors** come from the hue (`features/cuisines/palette.ts`, published by `CuisinePalettes` in both layouts). `palette.test.ts` proves text and pin contrast for every hue in both themes. The four seed cuisines keep hand-tuned palettes in `index.css`; a cuisine with neither falls back to the accent.
- **Flags** ship for every country on the map (`MAP_COUNTRIES` in `features/cuisines/flags.ts`, separate files in the build). A country outside the list needs adding there; `seed.test.ts` fails without it.
- **The pin** places itself; the map zooms to fit. A capital outside the drawn map (Pakistan to the Pacific, Java to Mongolia) needs a wider `BOUNDS` and a rerun of `scripts/generate-atlas-map.mjs`; `seed.test.ts` fails until then.
- Cuisine ids name CSS variables, so `cuisineSchema` only accepts slugs. Optional: a cloth pattern in `CuisineCloth.tsx` (otherwise atlas dots).

## Gotchas

- React Router's `setSearchParams` functional updater does not queue like `setState`. Keep fast-changing UI state (search, sort) in React state and rebuild the URL from it. See `CuisinePage.tsx`.
- Page background and font are set outside `@layer` in `src/index.css` on purpose, so a host page's body reset can't override them.
- Never run json-server's own CLI: this version ignores `--host`, listens on all interfaces and sends `Access-Control-Allow-Origin: *`. It runs in-process (`server/data/jsonServerApp.ts`) so the gateway is the only way in.
- Mount checks and handlers on the same path with the same matcher. A proxy keyed on a raw prefix once let `/api/dataratings` skip a gateway mounted at `/api/data`.
- json-server ignores the id you POST and assigns a random one. Cuisines need their slug id (page address, CSS color names), so `server/data/slugCreate.ts` creates them instead; add any other collection whose id matters to `SLUG_COLLECTIONS`.
- Deleting a record in json-server sets every reference to it to `null` (a recipe's `cuisineId: null`), which fails the schema and breaks the whole list. `server/data/integrity.ts` refuses deletes a recipe still depends on; use `_dependent=` to delete children with their parent.
- Test data changes against the real API too, not only the phone demo: the snapshot services keep ids and never null references, so they hide both problems above.
- json-server treats numeric-looking query values as numbers: `/ratings?recipeId=8` matches nothing because ids are strings ("8"). Use `_embed` (as the app does) or non-numeric values when filtering.
- React Hook Form's `valueAsNumber` / `setValueAs` don't apply to radio buttons; they return strings. Use `useController` for numeric radio groups (see `StarInput.tsx`).
- The Anthropic SDK throws a plain `Error` (not an SDK error class) when it finds no credentials; `server/ai/handler.ts` checks credential sources up front instead of matching the message.
- A layout route that wraps `<Outlet />` must keep the same element tree whether or not it adds banners; changing the parent remounts the page and wipes forms (see `RequireAdmin.tsx`).
- The phone preview (artifact) blocks `alert()`, `confirm()` and `prompt()`. Build confirmations as in-page dialogs.
- API keys never go in frontend code: anything in the bundle is public. AI calls will go through a server function.

## Git

- Small commits per phase or fix, imperative subject line, body explains why.
- Never commit `.env`, `db.json`, `dist*/` or `.claude/settings.local.json`.
