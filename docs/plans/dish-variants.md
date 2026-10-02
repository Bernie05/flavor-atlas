# Dish variants and regional versions

Status: **planned for Phase 6** (after AI features). Proposed by the project owner.

## Problem

A dish like sinigang is a family of recipes, not one recipe: the main ingredient changes (baboy, hipon, bangus) and regions have their own versions. Today every recipe stands alone, so these versions can't be grouped, compared or filtered.

## Decision

Add a **Dish** level between cuisine and recipe. Each variant stays a full recipe with its own ingredients, steps and ratings.

```
Cuisine (filipino) → Dish (sinigang) → Recipe (Sinigang na Hipon)
```

```jsonc
"dishes":  [{ "id": "sinigang", "cuisineId": "filipino", "name": "Sinigang", "description": "…" }],
"regions": [{ "id": "batangas", "cuisineId": "filipino", "name": "Batangas", "latitude": 13.76, "longitude": 121.06 }],
"recipes": [{ "id": "2", "dishId": "sinigang", "variant": "na Baboy", "mainIngredient": "pork", "regionId": null }]
```

- `mainIngredient` and `regionId` are separate fields, so versions can be filtered by either ("all Batangas versions", "all shrimp dishes").
- Regions are data with coordinates, shown like cuisines: `BATANGAS · 13.76°N 121.06°E`.
- `regionId: null` means the classic or widespread version.

### Rejected alternatives

- **Tags** (`tags: ["sinigang", "batangas"]`): nothing ties versions together and typos create new groups.
- **Parent recipe** (`variantOf: "2"`): makes one version "the original", which doesn't match how dish families work, and nests badly.

## Scope

- Schemas: `dishSchema`, `regionSchema`; recipe gains `dishId`, `variant`, `mainIngredient`, `regionId`.
- `DataService`: list/get dishes and regions, in both implementations.
- Pages: dish page `/dishes/:dishId` (versions grouped by main ingredient or region); "Other ways to cook …" on recipe pages; dish cards with version counts on cuisine pages.
- Form: "Is this a version of an existing dish?" with dish, variant, main ingredient and region fields.
- AI (Phase 5 hook): "Suggest a regional version" can reuse this model.
- Migration: each existing recipe becomes a dish with one version. Requires `npm run db:reset`.

## Seed data

Regional versions come from the project owner, not invented: only add regional variants they confirm. Ingredient variants (e.g. Sinigang na Hipon) are well known and safe to add.
