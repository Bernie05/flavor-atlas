# Flavor Atlas

Recipe book organized by cuisine. React 19 + Vite + TypeScript (strict), React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS v4, json-server as a fake REST API. The owner is a software engineering student: briefly explain design decisions and point out patterns worth learning.

## Commands

```bash
npm run dev:all      # json-server on :3001 + Vite on :5173
npm run dev:mock     # Vite only, in-memory data (no API)
npm run db:reset     # restore db.json from db.seed.json (needed after seed shape changes)
npm test             # Vitest unit tests
npm run typecheck && npm run lint && npm test && npm run build   # run before every commit
npm run build:demo   # single-file build in dist-demo/ (mock data + memory router)
```

## Architecture

- `src/features/<feature>/`: everything for one feature: `schema.ts` (Zod), `queries.ts`, `utils.ts` (+ tests), `components/`.
- `src/services/data/`: the `DataService` interface with two implementations, `httpDataService` (json-server) and `mockDataService` (in-memory seed). `index.ts` picks one from `VITE_DATA_SOURCE`. UI code imports `dataService` only, never an implementation.
- `src/pages/`: route-level components. `src/app/router.tsx` defines routes once for both browser and memory routers.
- `src/lib/config.ts` is the only file that reads `import.meta.env`.

## Rules

- **Zod schemas are the source of truth.** Derive types with `z.infer`; never hand-write a type that duplicates a schema. Validate data where it enters the app (HTTP responses, forms, AI output).
- **New data operations go on `DataService` and in both implementations**, so the mock demo keeps working.
- **Server state goes through TanStack Query** using the factories in `features/*/queries.ts` (`useQuery(recipeQueries.detail(id))`). After a mutation, invalidate by factory key (`recipeQueries.all()`), never with hand-typed keys. No `useEffect` fetching.
- **Pure logic lives in `utils.ts` with a test next to it.** Components stay thin.
- **UI work follows the `flavor-atlas-ui` skill** (`.claude/skills/flavor-atlas-ui/SKILL.md`): theme tokens only, both themes, phone first. For bigger UI changes, run the `ui-reviewer` agent before committing.
- Every list or detail view handles loading, error and empty states.
- Imports use the `@/` alias for anything outside the current feature folder.
- Keep runtime data out of git: `db.json` is ignored; edit `db.seed.json` instead.

## Gotchas

- React Router's `setSearchParams` functional updater does not queue like `setState`. Keep fast-changing UI state (search, sort) in React state and rebuild the URL from it. See `CuisinePage.tsx`.
- Page background and font are set outside `@layer` in `src/index.css` on purpose, so a host page's body reset can't override them.
- The phone preview (artifact) blocks `alert()`, `confirm()` and `prompt()`. Build confirmations as in-page dialogs.
- API keys never go in frontend code: anything in the bundle is public. AI calls will go through a server function.

## Git

- Small commits per phase or fix, imperative subject line, body explains why.
- Never commit `.env`, `db.json`, `dist*/` or `.claude/settings.local.json`.
