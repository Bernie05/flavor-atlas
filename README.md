# 🗺️ Flavor Atlas

[![CI](https://github.com/Bernie05/flavor-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/Bernie05/flavor-atlas/actions/workflows/ci.yml)

A recipe book organized by cuisine, in two parts:

- **The site** (read-only): start from a map of East and Southeast Asia, or browse Filipino, Chinese, Korean and Japanese dishes and filter by time, difficulty and main ingredient. Each recipe scales from 1 to 24 servings (amounts stay readable: "1½ cups", "250 g", "6 onions"), has an ingredient checklist, a heart to **save** it to a list kept in your own browser, and a full-screen **cook mode** with one step at a time, tap-to-start timers and a screen that stays on. Each dish has a page with its everyday and regional versions (Adobong Dilaw from Batangas, Hakata ramen, Jeonju bibimbap…) and a comparison of what each version adds or leaves out.
- **The admin** (`/admin`, password protected): a dashboard, a recipe table to add, edit and delete recipes (with AI help writing descriptions, ingredients and steps), and review management. In the claude.ai phone preview, the artifact's owner is the admin and edits are saved in the artifact's database.

## Design

**An atlas of dishes, set like a food magazine.** Each cuisine is a colored region on the map (Filipino sun-yellow, Chinese lacquer red, Korean blue, Japanese plum), pinned at its capital on the home page's map, and every recipe is a food photo (or its emoji) set on its region's color. Headlines use Instrument Serif with italic accents; quantities and times use a monospace face. Every color is a theme token with light and dark values.

Patterns adapted from editorial recipe sites such as NYT Cooking: a serif-and-sans pairing, collections ("Ready in 30 minutes", "Most loved"), an Ingredients / Steps toggle on phones, ingredient names highlighted inside the steps, and a servings scaler.

The full design system lives in [`.claude/skills/flavor-atlas-ui/SKILL.md`](.claude/skills/flavor-atlas-ui/SKILL.md).

Recipe photos are freely licensed (mostly Wikimedia Commons) and bundled in `public/photos/`; see [`docs/photo-credits.md`](docs/photo-credits.md) for authors and licenses. The map's coastlines come from [Natural Earth](https://www.naturalearthdata.com/) (public domain), generated once into an SVG path by `scripts/generate-atlas-map.mjs`.

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript (strict) |
| Routing | React Router |
| Server state | TanStack Query |
| Forms & validation | React Hook Form + Zod |
| Styling | Tailwind CSS v4 |
| Fake REST API | json-server |

Country flags are SVGs from [flag-icons](https://github.com/lipis/flag-icons) (MIT).

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the admin login (below)
npm run dev            # the app and its API (json-server runs inside it)
```

Open http://localhost:5173.

### Admin login

Browsing is open to everyone. Everything that changes data lives under `/admin` and needs the admin password (the footer has a small "Admin" link). Set it up once:

```bash
npm run auth:hash      # asks for a password, prints two lines
# paste both lines into .env (git-ignored), then restart npm run dev
```

`.env` stores only a scrypt **hash** of the password and a random `SESSION_SECRET`, never the password itself. Without them, login is unavailable and every change is refused (secure by default). Then open http://localhost:5173/admin.

After pulling changes to `db.seed.json`, run `npm run db:reset` so your local `db.json` matches the new data shape.

| Script | What it does |
|---|---|
| `npm run dev` | The app and its API on port 5173 |
| `npm run dev:mock` | Web app with the seed data in memory, no API needed |
| `npm run db:reset` | Restore `db.json` from the committed seed (restart `npm run dev` afterwards) |
| `npm run auth:hash` | Create the admin password hash and session secret for `.env` |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` / `lint` / `build` | Quality checks |
| `npm run build:demo` | Self-contained single-file build in `dist-demo/` |

### Dishes, versions and regions

A **dish** (Adobo, Ramen) groups its **versions** (recipes). Each recipe has a `dishId`, an optional `variant` name and `mainIngredient`, and a `regionId` (`''` means a classic, cooked everywhere). Regional versions carry a one-line `variantNote` saying what makes them different. Regions belong to a cuisine and have coordinates, like cuisines do. `src/services/data/seed.test.ts` checks the seed's integrity (every recipe's dish and region belong to its cuisine, and so on). The research behind the regional versions is in [docs/plans/dish-variants.md](docs/plans/dish-variants.md).

### Why `db.seed.json` and `db.json`?

json-server writes every create, update and delete directly into its JSON file. The seed data is committed as `db.seed.json` and copied to a git-ignored `db.json` on first run, so experimenting locally never changes tracked files.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/cuisines` | All cuisines |
| GET | `/recipes?cuisineId=korean` | Recipes in a cuisine |
| GET | `/recipes?dishId=adobo` | Every version of a dish |
| GET / POST | `/dishes` | Dishes (grouped by `cuisineId`) |
| GET | `/regions` | Regions with coordinates |
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
      ├── httpDataService      json-server over fetch, responses validated with Zod
      ├── mockDataService      db.seed.json in memory
      └── artifactDataService  phone preview: db.seed.json + changes saved in the artifact's database
```

UI code depends only on the `DataService` interface. `VITE_DATA_SOURCE` picks the implementation, so the same app runs against json-server locally, fully offline, or as a claude.ai artifact.

The mock and the artifact share their query logic: `createSnapshotDataService(store)` takes any store that can read the whole database and put one record. In the artifact, that store keeps only *changes* in the shared database (an edited record, or a deletion marker) and lays them over the bundled seed (`overlay.ts`). Admin edits survive reloads and every viewer sees them, the seed never has to be copied in, and a view without the database still shows the seed. The database's rules let only the artifact's owner write (published with `db: { rules: [{ path: "", read: "view", write: "owner" }] }`), so the protection doesn't depend on hiding buttons.

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

### Admin access

```
Browser ──► Vite dev server (one process; json-server runs inside it)
             ├─ /api/auth/login|logout|session   password → signed session cookie
             ├─ /api/data/*   reads: anyone · writes: admin only (else 401)
             └─ /api/ai       admin only
```

- **The server enforces access.** The UI hides admin controls as a convenience, but every write goes through the `/api/data` gateway, which checks the session first.
- **json-server has no port of its own.** It runs inside the dev server behind the gateway (`server/data/jsonServerApp.ts`). Its own CLI listens on every network interface with open CORS, which would let anyone on the network skip the gateway.
- **Session:** an HMAC-signed token with a 7-day expiry, in an `HttpOnly; SameSite=Strict` cookie that page JavaScript can't read.
- **Login:** scrypt hash compared in constant time, limited to 5 attempts per minute per IP.
- **Public vs admin:** the public site has no create, edit, delete or rating controls at all; they live in `/admin`, whose pages load lazily so visitors never download them.
- **Phone preview:** there's no server, so the admin area is shown only to the artifact's owner (claude.ai's `isOwner()`). That's a display choice, not a security boundary: the preview's data lives in each viewer's tab and resets on reload, so nobody can change anything but their own temporary copy.

See [docs/plans/admin-auth.md](docs/plans/admin-auth.md) for the design.

### Environment variables

| Variable | Values | Default |
|---|---|---|
| `VITE_API_URL` | Data API base URL | `/api/data` (gateway to json-server) |
| `VITE_DATA_SOURCE` | `http`, `mock` or `artifact` | `http` |
| `VITE_ROUTER_MODE` | `browser` or `memory` | `browser` |
| `VITE_AI_SOURCE` | `server` or `artifact` | `server` |
| `ANTHROPIC_API_KEY` | Claude API key, **server only** | none |
| `ADMIN_PASSWORD_HASH` | From `npm run auth:hash`, **server only** | none (login disabled) |
| `SESSION_SECRET` | From `npm run auth:hash`, **server only** | none (login disabled) |
| `VITE_AUTH_SOURCE` | `server` or `artifact` | `server` |

`.env.demo` sets the artifact data source (which falls back to memory outside claude.ai) and the memory router for `npm run dev:mock` and `npm run build:demo`.

## Project structure

```
src/
  app/          App providers and router
  components/   Shared layout and UI components
  features/     Code grouped by feature: recipes, cuisines, dishes, ratings, ai, admin
  lib/          Config and the query client
  pages/        Route-level pages (pages/admin/ for the admin area)
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
- [x] **Admin login:** server-enforced, password hash + signed session cookie. See [docs/plans/admin-auth.md](docs/plans/admin-auth.md)
- [x] **Admin area + editorial redesign:** read-only public site, `/admin` dashboard, recipe table and review management
- [x] **Phase 6:** dishes with their versions and regional styles (e.g. Sinigang na Baboy, na Hipon, Lucban's Pancit Habhab). See [docs/plans/dish-variants.md](docs/plans/dish-variants.md)
- [x] **Phase 7:** photos, tests and polish
  - [x] Credited, bundled photos for all 27 recipes ([docs/photo-credits.md](docs/photo-credits.md))
  - [x] Filters for time, difficulty and main ingredient, kept in shareable URLs
  - [x] Cook mode: one step at a time, timers, wake lock; amounts follow the servings scaler
  - [x] "How the versions differ" on dish pages
  - [x] Scaled amounts written the way a cook would (kitchen fractions, unit changes, plurals)
  - [x] Atlas map on the home page
  - [x] Phone preview keeps admin edits in the artifact's database (seed + saved changes)
  - [x] CI on every push; retries only for errors that can recover; accessibility fixes from `ui-reviewer` audits
- [ ] **Next**
  - [ ] Search from every page
  - [x] Saved recipes, kept in the visitor's browser (no account, nothing shared)
  - [ ] A shopping list from saved recipes
  - [ ] "Needs attention" list on the admin dashboard
  - [ ] Bundle: a named vendor chunk, lazy-load the map
