import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Link } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { AtlasCaption } from '@/features/atlas/components/AtlasCaption'
import { isOnMap, placesView, projectPoint } from '@/features/atlas/utils'
import { CuisineCard } from '@/features/cuisines/components/CuisineCard'
import { cuisineQueries } from '@/features/cuisines/queries'
import { regionQueries } from '@/features/dishes/queries'
import { FeaturedRecipeCard } from '@/features/recipes/components/FeaturedRecipeCard'
import { RecipeRow } from '@/features/recipes/components/RecipeRow'
import { recipeQueries } from '@/features/recipes/queries'
import { coverRecipe, quickRecipes, sortRecipes } from '@/features/recipes/utils'

const ROW_SIZE = 3

// The map and its coastlines (about 40 KB) load in their own chunk, only on the home page.
const AtlasMap = lazy(() => import('@/features/atlas/components/AtlasMap').then((m) => ({ default: m.AtlasMap })))

/**
 * Stands in for the map while it loads, in the map's own shape (the seed's view
 * is about 12:11) so the page doesn't jump when the map arrives.
 */
function MapPlaceholder({ ratio = '12 / 11', regionalKitchens }: { ratio?: string; regionalKitchens?: number }) {
  return (
    <figure aria-hidden className="space-y-2">
      <div style={{ aspectRatio: ratio }} className="max-w-full animate-pulse rounded-3xl bg-surface-sunken motion-reduce:animate-none" />
      <AtlasCaption regionalKitchens={regionalKitchens} />
    </figure>
  )
}

export function HomePage() {
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list())
  // Only the map's regional dots use this; the map draws without them until it loads.
  const regions = useQuery(regionQueries.list())

  const all = recipes.data ?? []
  const cuisinesById = new Map(cuisines.data?.map((cuisine) => [cuisine.id, cuisine]))
  const [featured, ...lovedRest] = sortRecipes(all, 'top-rated')
  const countFor = (cuisineId: string) => all.filter((recipe) => recipe.cuisineId === cuisineId).length
  // The shape the map will have, from the same places it fits (the coastlines aren't needed for that).
  const view = placesView([...(cuisines.data ?? []), ...(regions.data ?? [])])
  const mapRatio = `${view.width} / ${view.height}`
  const regionalKitchens = regions.data?.filter((region) => isOnMap(projectPoint(region))).length
  const recipeCounts = new Map(cuisines.data?.map((cuisine) => [cuisine.id, countFor(cuisine.id)]))

  return (
    <div className="space-y-20">
      <title>Flavor Atlas</title>

      <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
        <div className="space-y-5">
          <p className="label-mono text-accent-ink">
            {recipes.data && cuisines.data
              ? `${all.length} recipes · ${cuisines.data.length} cuisines`
              : 'Recipes by cuisine'}
          </p>
          <h1 className="text-6xl sm:text-7xl">
            Cook your way <em>around the world</em>
          </h1>
          <p className="max-w-prose text-lg text-ink-muted">
            Home-kitchen recipes grouped by where they come from, with every ingredient, every step and
            ratings from the people who cooked them.
          </p>
          <Link
            to="/recipes"
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent"
          >
            Browse all recipes
          </Link>
        </div>
        {featured ? (
          <FeaturedRecipeCard recipe={featured} cuisine={cuisinesById.get(featured.cuisineId)} />
        ) : (
          recipes.isPending && (
            <div className="h-80 animate-pulse rounded-3xl bg-surface-sunken motion-reduce:animate-none" />
          )
        )}
      </section>

      <section aria-labelledby="cuisines-heading" className="space-y-5">
        <div>
          <h2 id="cuisines-heading" className="text-4xl">
            Pick a cuisine
          </h2>
          <p className="mt-1 text-ink-muted">Each one marked on the map by its capital.</p>
        </div>
        {cuisines.isPending ? (
          // The map's shape while loading, so the layout doesn't jump when it arrives.
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr] lg:gap-8">
            <MapPlaceholder />
            <CardGridSkeleton count={4} />
          </div>
        ) : cuisines.isError ? (
          <ErrorState error={cuisines.error} onRetry={() => cuisines.refetch()} />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr] lg:gap-8">
            {regions.isPending ? (
              // Regional dots can widen the view, so the map waits for them instead of drawing twice.
              <MapPlaceholder ratio={mapRatio} regionalKitchens={regionalKitchens} />
            ) : (
              <Suspense fallback={<MapPlaceholder ratio={mapRatio} regionalKitchens={regionalKitchens} />}>
                <AtlasMap cuisines={cuisines.data} regions={regions.data ?? []} recipeCounts={recipeCounts} />
              </Suspense>
            )}
            <div className="grid grid-cols-2 gap-3">
              {cuisines.data.map((cuisine) => (
                <CuisineCard
                  key={cuisine.id}
                  cuisine={cuisine}
                  recipeCount={countFor(cuisine.id)}
                  cover={coverRecipe(all, cuisine.id)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {recipes.isPending ? (
        <CardGridSkeleton count={ROW_SIZE} />
      ) : recipes.isError ? (
        <ErrorState error={recipes.error} onRetry={() => recipes.refetch()} />
      ) : (
        <>
          <RecipeRow
            id="quick-heading"
            title="Ready in 30 minutes"
            description="Weeknight dinners, start to table."
            recipes={quickRecipes(all).slice(0, ROW_SIZE)}
            cuisinesById={cuisinesById}
            moreHref="/recipes?time=30"
          />
          <RecipeRow
            id="loved-heading"
            title="Most loved"
            description="The highest-rated dishes in the atlas."
            recipes={lovedRest.slice(0, ROW_SIZE)}
            cuisinesById={cuisinesById}
            moreHref="/recipes?sort=top-rated"
          />
          <RecipeRow
            id="regional-heading"
            title="From across the map"
            description="Versions with a home town, from Batangas to Sapporo."
            recipes={sortRecipes(all.filter((recipe) => recipe.regionId), 'newest').slice(0, ROW_SIZE)}
            cuisinesById={cuisinesById}
          />
          <RecipeRow
            id="recent-heading"
            title="Recently added"
            description="New to the atlas."
            recipes={sortRecipes(all, 'newest').slice(0, ROW_SIZE)}
            cuisinesById={cuisinesById}
            moreHref="/recipes"
          />
        </>
      )}
    </div>
  )
}
