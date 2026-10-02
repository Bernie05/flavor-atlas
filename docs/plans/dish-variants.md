# Dish variants and regional versions

Status: **done (Phase 6)**. Proposed by the project owner; seed versions researched and approved.

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

The owner asked for the versions to be researched online and approved the list below. The dish facts (which version comes from where, and what sets it apart) come from these sources; the recipes themselves (quantities and steps) are written as sensible home versions and can be corrected in the admin. New versions have no reviews: none were invented.

| Dish | Versions (region) | Sources |
|---|---|---|
| Adobo | Adobong Dilaw (Batangas), Adobo sa Gata (Bicol), Adobong Puti (Pampanga, ⚠️ blog sources only) | [Wikipedia: Philippine adobo](https://en.wikipedia.org/wiki/Adobo_sa_gata), [Batangas History: Adobo sa Dilaw](https://www.batangashistory.date/2025/12/the-golden-batangueno-heritage-of-adobo.html), [Crown Asia: Different adobo recipes](https://www.crownasia.com.ph/lifestyle-blog/discover-the-different-adobo-recipes-of-the-philippines/) |
| Sinigang | na Hipon, na Bangus, sa Miso, sa Bayabas (no region: sources disagree on which province owns which) | [Wikipedia: Sinigang](https://en.wikipedia.org/wiki/Sinigang) |
| Pancit | Malabon, Habhab (Lucban, Quezon), Batil Patong (Tuguegarao, Cagayan) | [Wikipedia: Pancit Malabon](https://en.wikipedia.org/wiki/Pancit_Malabon), [Rappler: Different regions have different pancit](https://www.rappler.com/life-and-style/food-drinks/different-kinds-filipino-pancit/), [Knorr: 8 pancit varieties](https://www.knorr.com/ph/tips-and-tricks/8-pancit-varieties-philippines.html) |
| Ramen | Sapporo miso, Hakata tonkotsu, Tokyo shoyu, Kitakata | [The Real Japan: Regional ramen](https://www.therealjapan.com/types-of-japanese-ramen/), [Japanese Food Guide: Ramen by region](https://www.japanese-food-guide.com/articles/regional-ramen-guide) |
| Bibimbap | Jeonju, Jinju, Dolsot (a serving style, no region) | [Wikipedia: Bibimbap](https://en.wikipedia.org/wiki/Bibimbap) |
| Fried rice | Yangzhou, Hokkien / Fujian | [Wikipedia: Yangzhou fried rice](https://en.wikipedia.org/wiki/Yangzhou_fried_rice), [Wikipedia: Hokkien fried rice](https://en.wikipedia.org/wiki/Hokkien_fried_rice) |

Region coordinates are the main city of each place, to two decimals.
