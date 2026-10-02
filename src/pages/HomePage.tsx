import { useQuery } from '@tanstack/react-query'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CuisineCard } from '@/features/cuisines/components/CuisineCard'
import { cuisineQueries } from '@/features/cuisines/queries'
import { RecipeCard } from '@/features/recipes/components/RecipeCard'
import { recipeQueries } from '@/features/recipes/queries'
import { sortRecipes } from '@/features/recipes/utils'

const RECENT_COUNT = 3

export function HomePage() {
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list())

  const cuisinesById = new Map(cuisines.data?.map((cuisine) => [cuisine.id, cuisine]))
  const recentRecipes = sortRecipes(recipes.data ?? [], 'newest').slice(0, RECENT_COUNT)
  const countFor = (cuisineId: string) =>
    recipes.data?.filter((recipe) => recipe.cuisineId === cuisineId).length ?? 0

  return (
    <div className="space-y-10">
      <title>Flavor Atlas</title>

      <section>
        <h1 className="text-3xl font-bold sm:text-4xl">Cook your way around the world</h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          {recipes.data && cuisines.data
            ? `${recipes.data.length} recipes across ${cuisines.data.length} cuisines, rated by home cooks.`
            : 'Recipes grouped by cuisine, rated by home cooks.'}
        </p>
      </section>

      <section aria-labelledby="cuisines-heading" className="space-y-4">
        <h2 id="cuisines-heading" className="text-xl font-semibold">
          Cuisines
        </h2>
        {cuisines.isPending ? (
          <CardGridSkeleton count={4} />
        ) : cuisines.isError ? (
          <ErrorState error={cuisines.error} onRetry={() => cuisines.refetch()} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cuisines.data.map((cuisine) => (
              <CuisineCard key={cuisine.id} cuisine={cuisine} recipeCount={countFor(cuisine.id)} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <h2 id="recent-heading" className="text-xl font-semibold">
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
