# 🗺️ Flavor Atlas

A recipe book organized by cuisine: browse Filipino, Chinese, Korean and Japanese dishes, see ingredients and steps, rate recipes, and (soon) write recipes with AI assistance.

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
| `npm run db:reset` | Restore `db.json` from the committed seed |
| `npm run typecheck` / `lint` / `build` | Quality checks |

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

## Project structure

```
src/
  app/          App providers and router
  components/   Shared layout and UI components
  features/     Code grouped by feature: recipes, cuisines, ratings
  lib/          Config and shared utilities
  pages/        Route-level pages
```

Each feature has a `schema.ts` with Zod schemas. They are the single source of truth: TypeScript types are inferred from them, and the same schemas validate forms and AI output.

## Roadmap

- [x] **Phase 1:** project foundation, routing, seed data
- [ ] **Phase 2:** browse cuisines and recipes, recipe detail
- [ ] **Phase 3:** create, edit and delete recipes
- [ ] **Phase 4:** ratings
- [ ] **Phase 5:** AI-assisted descriptions, steps and ingredients
- [ ] **Phase 6:** phone preview, tests, polish
