import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { cuisineQueries } from '@/features/cuisines/queries'
import { RecipeCard } from '@/features/recipes/components/RecipeCard'
import { recipeQueries } from '@/features/recipes/queries'
import { useSavedRecipeIds } from '@/features/saved/useSavedRecipes'
import { pickSaved } from '@/features/saved/utils'

/** The recipes saved on this device, newest first. */
export function SavedPage() {
  const savedIds = useSavedRecipeIds()
  const recipes = useQuery(recipeQueries.list())
  const cuisines = useQuery(cuisineQueries.list())
  const cuisinesById = new Map(cuisines.data?.map((cuisine) => [cuisine.id, cuisine]))
  const saved = pickSaved(savedIds, recipes.data ?? [])

  return (
    <div className="space-y-8">
      <title>Saved recipes · Flavor Atlas</title>
      <header className="space-y-2">
        <p className="label-mono text-accent-ink">On this device</p>
        <h1 className="text-6xl">
          Saved <em>recipes</em>
        </h1>
        <p className="max-w-prose text-ink-muted">
          Tap the heart on any recipe to keep it here. Your list stays in this browser; nobody else sees it.
        </p>
      </header>

      {recipes.isPending ? (
        <CardGridSkeleton />
      ) : recipes.isError ? (
        <ErrorState error={recipes.error} onRetry={() => void recipes.refetch()} />
      ) : saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="Recipes you save show up here, ready for the next time you cook."
          action={
            <Link to="/recipes" className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 font-semibold text-canvas hover:bg-accent">
              Browse recipes
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label-mono text-ink-subtle tabular-nums" aria-live="polite">
              {saved.length} {saved.length === 1 ? 'recipe' : 'recipes'}
            </p>
            <Link to="/shopping" className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-canvas hover:bg-accent">
              Make a shopping list
            </Link>
          </div>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} cuisine={cuisinesById.get(recipe.cuisineId)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
