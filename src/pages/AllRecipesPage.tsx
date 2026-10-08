import { useQuery } from '@tanstack/react-query'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { cuisineQueries } from '@/features/cuisines/queries'
import { RecipeBrowser } from '@/features/recipes/components/RecipeBrowser'
import { recipeQueries } from '@/features/recipes/queries'

export function AllRecipesPage() {
  const recipes = useQuery(recipeQueries.list())
  const cuisines = useQuery(cuisineQueries.list())

  return (
    <div className="space-y-8">
      <title>All recipes · Flavor Atlas</title>
      <header className="space-y-2">
        <p className="label-mono text-accent-ink">The whole atlas</p>
        <h1 className="text-6xl">
          All <em>recipes</em>
        </h1>
      </header>
      {recipes.isPending || cuisines.isPending ? (
        <CardGridSkeleton />
      ) : recipes.isError || cuisines.isError ? (
        <ErrorState error={recipes.error ?? cuisines.error} onRetry={() => {
            if (recipes.isError) void recipes.refetch()
            if (cuisines.isError) void cuisines.refetch()
          }} />
      ) : (
        <RecipeBrowser recipes={recipes.data} cuisines={cuisines.data} />
      )}
    </div>
  )
}
