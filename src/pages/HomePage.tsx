import { useQuery } from '@tanstack/react-query'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CuisineCard } from '@/features/cuisines/components/CuisineCard'
import { cuisineQueries } from '@/features/cuisines/queries'
import { FeaturedRecipeCard } from '@/features/recipes/components/FeaturedRecipeCard'
import { RecipeCard } from '@/features/recipes/components/RecipeCard'
import { recipeQueries } from '@/features/recipes/queries'
import { sortRecipes } from '@/features/recipes/utils'

const RECENT_COUNT = 3

export function HomePage() {
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list())

  const cuisinesById = new Map(cuisines.data?.map((cuisine) => [cuisine.id, cuisine]))
  const featured = sortRecipes(recipes.data ?? [], 'top-rated')[0]
  const recentRecipes = sortRecipes(recipes.data ?? [], 'newest')
    .filter((recipe) => recipe.id !== featured?.id)
    .slice(0, RECENT_COUNT)
  const countFor = (cuisineId: string) =>
    recipes.data?.filter((recipe) => recipe.cuisineId === cuisineId).length ?? 0

  return (
    <div className="space-y-12">
      <title>Flavor Atlas</title>

      <section className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-center md:gap-10">
        <div className="space-y-3">
          <p className="label-mono text-accent-ink">
            {recipes.data && cuisines.data
              ? `${recipes.data.length} recipes · ${cuisines.data.length} cuisines`
              : 'Recipes by cuisine'}
          </p>
          <h1 className="text-4xl sm:text-5xl">Cook your way around the world</h1>
          <p className="max-w-prose text-lg text-ink-muted">
            Home-kitchen recipes grouped by where they come from, with every ingredient, every step
            and ratings from people who cooked them.
          </p>
        </div>
        {featured ? (
          <FeaturedRecipeCard recipe={featured} cuisine={cuisinesById.get(featured.cuisineId)} />
        ) : (
          recipes.isPending && <div className="h-44 animate-pulse rounded-3xl bg-surface-sunken motion-reduce:animate-none" />
        )}
      </section>

      <section aria-labelledby="cuisines-heading" className="space-y-4">
        <h2 id="cuisines-heading" className="text-2xl">
          Pick a cuisine
        </h2>
        {cuisines.isPending ? (
          <CardGridSkeleton count={4} />
        ) : cuisines.isError ? (
          <ErrorState error={cuisines.error} onRetry={() => cuisines.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cuisines.data.map((cuisine) => (
              <CuisineCard key={cuisine.id} cuisine={cuisine} recipeCount={countFor(cuisine.id)} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <h2 id="recent-heading" className="text-2xl">
          Recently added
        </h2>
        {recipes.isPending ? (
          <CardGridSkeleton count={RECENT_COUNT} />
        ) : recipes.isError ? (
          <ErrorState error={recipes.error} onRetry={() => recipes.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} cuisine={cuisinesById.get(recipe.cuisineId)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
