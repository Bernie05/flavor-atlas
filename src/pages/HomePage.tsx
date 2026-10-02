import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { CardGridSkeleton } from '@/components/feedback/CardGridSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { CuisineCard } from '@/features/cuisines/components/CuisineCard'
import { cuisineQueries } from '@/features/cuisines/queries'
import { FeaturedRecipeCard } from '@/features/recipes/components/FeaturedRecipeCard'
import { RecipeRow } from '@/features/recipes/components/RecipeRow'
import { recipeQueries } from '@/features/recipes/queries'
import { quickRecipes, sortRecipes } from '@/features/recipes/utils'

const ROW_SIZE = 3

export function HomePage() {
  const cuisines = useQuery(cuisineQueries.list())
  const recipes = useQuery(recipeQueries.list())

  const all = recipes.data ?? []
  const cuisinesById = new Map(cuisines.data?.map((cuisine) => [cuisine.id, cuisine]))
  const [featured, ...lovedRest] = sortRecipes(all, 'top-rated')
  const countFor = (cuisineId: string) => all.filter((recipe) => recipe.cuisineId === cuisineId).length

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
            moreHref="/recipes?quick=1"
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
