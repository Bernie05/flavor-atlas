# 🗺️ Flavor Atlas

A recipe book organized by cuisine: browse Filipino, Chinese, Korean and Japanese dishes, add and edit your own, search and sort them, tick off ingredients as you prep, rate and review recipes, and get AI help writing descriptions, ingredient lists and steps.

## Design

**An atlas of plates.** Each cuisine is a colored region on the map (Filipino sun-yellow, Chinese lacquer red, Korean blue, Japanese plum) and every recipe is a plate set on its region's color. Cuisines carry the coordinates of their capital, quantities and times use a monospace face, and dish names use Young Serif. Every color is a theme token with light and dark values.

The full design system lives in [`.claude/skills/flavor-atlas-ui/SKILL.md`](.claude/skills/flavor-atlas-ui/SKILL.md).

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript (strict) |
| Routing | React Router |
| Server state | TanStack Query |
| Forms & validation | React Hook Form + Zod |
| Styling | Tailwind CSS v4 |
| Fake REST API | json-server |

## Getting started

```bash
npm install
cp .env.example .env   # optional: defaults to http://localhost:3001
npm run dev:all        # starts json-server (3001) and Vite (5173) together
```

Open http://localhost:5173.

After pulling changes to `db.seed.json`, run `npm run db:reset` so your local `db.json` matches the new data shape.

| Script | What it does |
|---|---|
| `npm run dev:all` | API + web app together |
| `npm run api` | json-server only, on port 3001 |
| `npm run dev` | Vite dev server only |
| `npm run dev:mock` | Web app with in-memory data, no API needed |
| `npm run db:reset` | Restore `db.json` from the committed seed |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` / `lint` / `build` | Quality checks |
| `npm run build:demo` | Self-contained single-file build in `dist-demo/` |

### Why `db.seed.json` and `db.json`?

json-server writes every create, update and delete directly into its JSON file. The seed data is committed as `db.seed.json` and copied to a git-ignored `db.json` on first run, so experimenting locally never changes tracked files.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/cuisines` | All cuisines |
| GET | `/recipes?cuisineId=korean` | Recipes in a cuisine |
| GET | `/recipes/:id?_embed=ratings` | One recipe with its ratings |
| POST / PUT / DELETE | `/recipes/:id` | Create, update, delete |
| POST | `/ratings` | Rate a recipe |

## Architecture

### Swappable data layer

```
pages / components
      │  useQuery(recipeQueries.detail(id))
      ▼
features/*/queries.ts      query factories: cache keys + fetchers
      │
      ▼
services/data/DataService  the interface
      ├── httpDataService  json-server over fetch, responses validated with Zod
      └── mockDataService  in-memory copy of db.seed.json
```

UI code depends only on the `DataService` interface. `VITE_DATA_SOURCE` picks the implementation, so the same app runs against json-server locally or fully offline as a demo.

### AI writing helpers

```
RecipeForm ✨ → AiService (interface)
                ├── httpAiService     → POST /api/ai → server/ai/handler.ts → Claude API
                └── artifactAiService → claude.ai viewer's "sample" capability (phone preview)
```

- The API key lives only on the server. `ANTHROPIC_API_KEY` has no `VITE_` prefix, so Vite never bundles it; `/api/ai` is served by a Vite dev-server plugin (`server/vitePluginAi.ts`).
- One prompt builder (`src/features/ai/prompts.ts`) serves both paths.
- The server uses structured outputs (`betaZodOutputFormat`) so Claude replies in the requested JSON shape, then the browser validates the reply again with the same rules as a hand-typed recipe.
- Suggestions are shown for review; nothing changes in the form until you choose **Use this**.

To try it locally, add a key to `.env` and restart `npm run dev`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key the app works normally and the AI buttons explain how to set it up. `/api/ai` exists only in the dev server for now; a production deployment needs the same handler as a serverless function.

### Environment variables

| Variable | Values | Default |
|---|---|---|
| `VITE_API_URL` | json-server base URL | `http://localhost:3001` |
| `VITE_DATA_SOURCE` | `http` or `mock` | `http` |
| `VITE_ROUTER_MODE` | `browser` or `memory` | `browser` |
| `VITE_AI_SOURCE` | `server` or `artifact` | `server` |
| `ANTHROPIC_API_KEY` | Claude API key, **server only** | none |

`.env.demo` sets the mock data source and memory router for `npm run dev:mock` and `npm run build:demo`.

## Project structure

```
src/
  app/          App providers and router
  components/   Shared layout and UI components
  features/     Code grouped by feature: recipes, cuisines, ratings
  lib/          Config and the query client
  pages/        Route-level pages
  services/     Data and AI access behind the DataService and AiService interfaces
server/         Server-only code: the /api/ai handler and its Vite plugin
```

Each feature has a `schema.ts` with Zod schemas. They are the single source of truth: TypeScript types are inferred from them, and the same schemas validate forms and AI output.

## Working with Claude Code

This repo ships Claude Code configuration in `.claude/`:

| Path | What it is |
|---|---|
| `CLAUDE.md` | Project memory: commands, architecture and rules Claude reads at the start of every session. |
| `.claude/skills/flavor-atlas-ui/` | A **skill**: the design system as instructions. Claude loads it automatically whenever it works on UI, so new pages match the existing design. |
| `.claude/agents/ui-reviewer.md` | A **subagent**: a read-only reviewer that audits contrast, accessibility and phone layout. Ask Claude to "run the ui-reviewer agent" after UI changes. |

## Roadmap

- [x] **Phase 1:** project foundation, routing, seed data
- [x] **Phase 2:** browse cuisines and recipes, search and sort, recipe detail, dark mode
- [x] **Redesign:** atlas-of-plates design system, ingredient checklist, Claude Code skill and reviewer agent
- [x] **Phase 3:** create, edit and delete recipes, with validation and a delete confirmation
- [x] **Phase 4:** ratings and reviews with optimistic updates
- [x] **Phase 5:** AI-assisted descriptions, ingredients and steps (Claude)
- [ ] **Phase 6:** dish variants and regional versions (e.g. Sinigang na Baboy, na Hipon, regional styles). See [docs/plans/dish-variants.md](docs/plans/dish-variants.md)
- [ ] **Phase 7:** tests, bundle size, polish
