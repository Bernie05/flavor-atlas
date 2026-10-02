# 🗺️ Flavor Atlas

A recipe book organized by cuisine: browse Filipino, Chinese, Korean and Japanese dishes, search and sort them, see ingredients and steps, rate recipes, and (soon) write recipes with AI assistance. Supports light and dark mode.

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

### Environment variables

| Variable | Values | Default |
|---|---|---|
| `VITE_API_URL` | json-server base URL | `http://localhost:3001` |
| `VITE_DATA_SOURCE` | `http` or `mock` | `http` |
| `VITE_ROUTER_MODE` | `browser` or `memory` | `browser` |

`.env.demo` sets the mock data source and memory router for `npm run dev:mock` and `npm run build:demo`.

## Project structure

```
src/
  app/          App providers and router
  components/   Shared layout and UI components
  features/     Code grouped by feature: recipes, cuisines, ratings
  lib/          Config and the query client
  pages/        Route-level pages
  services/     Data access behind the DataService interface
```

Each feature has a `schema.ts` with Zod schemas. They are the single source of truth: TypeScript types are inferred from them, and the same schemas validate forms and AI output.

## Roadmap

- [x] **Phase 1:** project foundation, routing, seed data
- [x] **Phase 2:** browse cuisines and recipes, search and sort, recipe detail, dark mode
- [ ] **Phase 3:** create, edit and delete recipes
- [ ] **Phase 4:** ratings
- [ ] **Phase 5:** AI-assisted descriptions, steps and ingredients
- [ ] **Phase 6:** phone preview, tests, polish
