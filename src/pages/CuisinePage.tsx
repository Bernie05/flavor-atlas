import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FoodEmoji } from '@/components/ui/FoodEmoji'
import { CuisineCloth } from '@/features/cuisines/components/CuisineCloth'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint, formatCoordinates } from '@/features/cuisines/utils'
import { DishCard } from '@/features/dishes/components/DishCard'
import { dishQueries } from '@/features/dishes/queries'
import { countVersions } from '@/features/dishes/utils'
import { RecipeBrowser } from '@/features/recipes/components/RecipeBrowser'
import { recipeQueries } from '@/features/recipes/queries'
import type { Dish } from '@/features/dishes/schema'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { NotFoundError } from '@/services/data'
import { NotFoundPage } from './NotFoundPage'

export function CuisinePage() {
  const { cuisineId = '' } = useParams()
  // A key tied to the cuisine resets search and filters when you switch cuisines.
  return <CuisineView key={cuisineId} cuisineId={cuisineId} />
}

function CuisineView({ cuisineId }: { cuisineId: string }) {
  const cuisine = useQuery(cuisineQueries.detail(cuisineId))
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list({ cuisineId }))
  const dishes = useQuery(dishQueries.list())

  if (cuisine.error instanceof NotFoundError) {
    return <NotFoundPage message="We don't have that cuisine in the atlas yet." />
  }

  return (
    <div className="space-y-10" style={cuisineTint(cuisineId)}>
      {cuisine.data && <title>{`${cuisine.data.name} recipes · Flavor Atlas`}</title>}

      <header className="-mx-4 grid items-center gap-6 bg-tint-soft px-4 py-8 sm:mx-0 sm:grid-cols-[1fr_auto] sm:rounded-3xl sm:py-8 sm:pr-8 sm:pl-10">
        <div className="min-w-0 space-y-3">
          <nav aria-label="Breadcrumb">
            <Link to="/recipes" className="label-mono inline-flex min-h-10 items-center text-tint-ink hover:underline">
              All recipes
            </Link>
          </nav>
          <h1 className="text-6xl sm:text-7xl">
            <em>{cuisine.data?.name ?? 'Loading…'}</em>
          </h1>
          {cuisine.data && (
            <p className="label-mono text-tint-ink tabular-nums">
              {cuisine.data.origin} · {formatCoordinates(cuisine.data)}
            </p>
          )}
          <p className="max-w-prose text-lg text-ink-muted">{cuisine.data?.description}</p>
        </div>
        {/* The cuisine's own cloth: seigaiha, jogakbo, huiwen or banig. */}
        <CuisineCloth cuisineId={cuisineId} className="order-first aspect-[4/3] w-full rounded-2xl sm:order-none sm:aspect-square sm:w-56">
          <FoodEmoji emoji={cuisine.data?.emoji ?? '🍽️'} size="lg" />
        </CuisineCloth>
      </header>

      {recipes.data && dishes.data && (
        <DishIndex cuisineId={cuisineId} recipes={recipes.data} dishes={dishes.data} />
      )}

      {recipes.isPending || cuisines.isPending ? (
        <CardGridSkeleton />
      ) : recipes.isError || cuisines.isError ? (
        <ErrorState error={recipes.error ?? cuisines.error} onRetry={() => void recipes.refetch()} />
      ) : (
        <RecipeBrowser recipes={recipes.data} cuisines={cuisines.data} lockedCuisineId={cuisineId} />
      )}
    </div>
  )
}

/** The cuisine's dishes, each with its number of versions: a table of contents. */
function DishIndex({
  cuisineId,
  recipes,
  dishes,
}: {
  cuisineId: string
  recipes: RecipeWithRatings[]
  dishes: Dish[]
}) {
  const counts = countVersions(recipes)
  const ours = dishes
    .filter((dish) => dish.cuisineId === cuisineId && counts.has(dish.id))
    .toSorted((a, b) => a.name.localeCompare(b.name))
  if (ours.length === 0) return null

  return (
    <section aria-labelledby="dishes-heading" className="space-y-4">
      <h2 id="dishes-heading" className="text-4xl">
        Dishes
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ours.map((dish) => {
          const versions = recipes.filter((r) => r.dishId === dish.id)
          return (
            <li key={dish.id}>
              <DishCard
                dish={dish}
                emoji={versions[0]?.emoji || '🍽️'}
                versions={versions.length}
                regional={versions.filter((r) => r.regionId).length}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
