import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FoodEmoji } from '@/components/ui/FoodEmoji'
import { StarRating } from '@/components/ui/StarRating'
import { cuisineQueries } from '@/features/cuisines/queries'
import { cuisineTint } from '@/features/cuisines/utils'
import { RegionTag } from '@/features/dishes/components/RegionTag'
import { dishQueries, regionQueries } from '@/features/dishes/queries'
import { otherVersions } from '@/features/dishes/utils'
import { RatingsSection } from '@/features/ratings/components/RatingsSection'
import { summarizeRatings } from '@/features/ratings/summary'
import { IngredientChecklist } from '@/features/recipes/components/IngredientChecklist'
import { PhotoCredit } from '@/features/recipes/components/PhotoCredit'
import { RecipeRow } from '@/features/recipes/components/RecipeRow'
import { recipeQueries } from '@/features/recipes/queries'
import type { RecipeWithRatings } from '@/features/recipes/schema'
import { usePhoto } from '@/features/recipes/usePhoto'
import { DIFFICULTY_LABELS, formatDuration, highlightIngredients, totalMinutes } from '@/features/recipes/utils'
import { NotFoundError } from '@/services/data'
import { NotFoundPage } from './NotFoundPage'

export function RecipeDetailPage() {
  const { recipeId = '' } = useParams()
  const recipeQuery = useQuery(recipeQueries.detail(recipeId))

  if (recipeQuery.error instanceof NotFoundError) {
    return <NotFoundPage message="This recipe may have been removed." />
  }
  if (recipeQuery.isError) {
    return <ErrorState error={recipeQuery.error} onRetry={() => recipeQuery.refetch()} />
  }
  if (recipeQuery.isPending) return <RecipeDetailSkeleton />

  // Keyed so the checklist, scaler and tab reset when you open another recipe.
  return <RecipeView key={recipeQuery.data.id} recipe={recipeQuery.data} />
}

type Panel = 'ingredients' | 'steps'

function RecipeView({ recipe }: { recipe: RecipeWithRatings }) {
  // Usually already cached from the previous page, so this costs no extra request.
  const cuisines = useQuery(cuisineQueries.list()).data
  const cuisine = cuisines?.find((c) => c.id === recipe.cuisineId)
  const dish = useQuery(dishQueries.detail(recipe.dishId)).data
  const region = useQuery(regionQueries.list()).data?.find((r) => r.id === recipe.regionId)
  // The dish's other versions; usually cached from the list pages.
  const siblings = otherVersions(recipe, useQuery(recipeQueries.list({ dishId: recipe.dishId })).data ?? [])
  const rating = summarizeRatings(recipe.ratings)
  const photo = usePhoto(recipe.imageUrl)
  // Phones show one panel at a time (like NYT Cooking); wider screens show both.
  const [panel, setPanel] = useState<Panel>('ingredients')
  const toggleRef = useRef<HTMLDivElement>(null)

  // Switching panels while scrolled down would leave you mid-list: bring the
  // new panel's top just under the sticky toggle.
  const showPanel = (next: Panel) => {
    setPanel(next)
    requestAnimationFrame(() => {
      const target = document.getElementById(`${next}-panel`)
      const toggleBottom = toggleRef.current?.getBoundingClientRect().bottom ?? 0
      if (target && target.getBoundingClientRect().top < toggleBottom) target.scrollIntoView({ block: 'start' })
    })
  }

  const facts = [
    { label: 'Prep', value: formatDuration(recipe.prepMinutes) },
    { label: 'Cook', value: formatDuration(recipe.cookMinutes) },
    { label: 'Total', value: formatDuration(totalMinutes(recipe)) },
    { label: 'Serves', value: String(recipe.servings) },
    { label: 'Level', value: DIFFICULTY_LABELS[recipe.difficulty] },
  ]

  const tabClass = (active: boolean) =>
    `min-h-10 flex-1 rounded-full text-sm font-semibold transition-colors ${
      active ? 'bg-ink text-canvas' : 'text-ink-muted'
    }`

  return (
    <article className="space-y-12" style={cuisineTint(recipe.cuisineId)}>
      <title>{`${recipe.title} · Flavor Atlas`}</title>

      {/* With a photo, the photo is the hero's background; without one, the emoji sits on the cuisine's dots. */}
      <header
        className={`-mx-4 -mt-6 sm:mx-0 sm:mt-0 sm:rounded-3xl ${
          photo.visible
            ? 'on-photo relative isolate overflow-hidden px-4 pt-60 pb-8 sm:px-10 sm:pt-72 sm:pb-12 lg:pt-56'
            : 'atlas-dots grid items-center gap-8 px-4 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto]'
        }`}
      >
        {photo.visible && (
          <>
            {/* The h1 names the dish, so the photo itself is decorative here. */}
            <img
              src={photo.src}
              alt=""
              onError={photo.onError}
              className="absolute inset-0 -z-10 size-full bg-surface-sunken object-cover"
            />
            <div aria-hidden className="photo-scrim absolute inset-0 -z-10" />
            <PhotoCredit recipe={recipe} />
          </>
        )}
        <div className="min-w-0 max-w-3xl space-y-5">
          <nav aria-label="Breadcrumb" className="label-mono text-tint-ink">
            <Link to="/recipes" className="inline-flex min-h-10 items-center hover:underline">
              Recipes
            </Link>
            {cuisine && (
              <>
                <span aria-hidden> / </span>
                <Link to={`/cuisines/${cuisine.id}`} className="inline-flex min-h-10 items-center hover:underline">
                  {cuisine.name}
                </Link>
              </>
            )}
            {dish && (
              <>
                <span aria-hidden> / </span>
                <Link to={`/dishes/${dish.id}`} className="inline-flex min-h-10 items-center hover:underline">
                  {dish.name}
                </Link>
              </>
            )}
          </nav>
          <h1 className="text-6xl sm:text-7xl">{recipe.title}</h1>
          {(region || recipe.variantNote) && (
            <p className="space-y-1">
              {region && <RegionTag region={region} className="block text-tint-ink" />}
              {recipe.variantNote && <span className="block font-display text-2xl italic">{recipe.variantNote}</span>}
            </p>
          )}
          {recipe.description && <p className="max-w-prose text-lg text-ink-muted">{recipe.description}</p>}
          <StarRating value={rating.average} count={rating.count} size="lg" />
          <dl className="grid grid-cols-2 gap-x-6 min-[360px]:grid-cols-3 gap-y-3 border-t border-tint/25 pt-5 sm:flex sm:flex-wrap sm:gap-x-8">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="label-mono text-tint-ink">{fact.label}</dt>
                <dd className="mt-0.5 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {!photo.visible && (
          <FoodEmoji emoji={recipe.emoji || cuisine?.emoji || '🍽️'} size="lg" className="order-first justify-self-center lg:order-none" />
        )}
      </header>

      {/* Phone-only toggle. Sticks under the site header while you cook. */}
      <div
        ref={toggleRef}
        className="sticky top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-10 -mx-4 bg-canvas/90 px-4 py-2 backdrop-blur-md md:hidden"
      >
        <div className="flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line">
          <button
            type="button"
            aria-pressed={panel === 'ingredients'}
            aria-controls="ingredients-panel"
            onClick={() => showPanel('ingredients')}
            className={tabClass(panel === 'ingredients')}
          >
            Ingredients
          </button>
          <button
            type="button"
            aria-pressed={panel === 'steps'}
            aria-controls="steps-panel"
            onClick={() => showPanel('steps')}
            className={tabClass(panel === 'steps')}
          >
            Steps
          </button>
        </div>
      </div>

      <div className="grid gap-12 md:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
        <div
          id="ingredients-panel"
          className={`max-md:scroll-mt-32 md:sticky md:top-24 md:self-start ${panel === 'ingredients' ? '' : 'max-md:hidden'}`}
        >
          <IngredientChecklist ingredients={recipe.ingredients} servings={recipe.servings} />
        </div>

        <section
          id="steps-panel"
          aria-labelledby="steps-heading"
          className={`min-w-0 space-y-6 max-md:scroll-mt-32 ${panel === 'steps' ? '' : 'max-md:hidden'}`}
        >
          <h2 id="steps-heading" className="text-4xl">
            Steps
          </h2>
          <ol className="space-y-8">
            {recipe.steps.map((step, index) => (
              <li key={index} className="grid grid-cols-[3rem_1fr] gap-4 max-md:scroll-mt-32">
                <span aria-hidden className="font-display text-5xl leading-none text-tint italic">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-1 pt-1">
                  <p className="label-mono text-ink-subtle">
                    Step {index + 1} of {recipe.steps.length}
                  </p>
                  {/* Ingredient names stand out, so you can cook from the steps alone. */}
                  <p className="text-lg leading-relaxed">
                    {highlightIngredients(step, recipe.ingredients).map((segment, i) =>
                      segment.ingredient ? (
                        <strong key={i} className="font-semibold text-tint-ink">
                          {segment.text}
                        </strong>
                      ) : (
                        segment.text
                      ),
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {dish && siblings.length > 0 && (
        <RecipeRow
          id="versions-heading"
          title={`Other ways to cook ${dish.name}`}
          description="Same dish, another kitchen."
          recipes={siblings}
          cuisinesById={new Map(cuisines?.map((c) => [c.id, c]))}
          moreHref={`/dishes/${dish.id}`}
        />
      )}

      <hr className="border-line" />
      <RatingsSection ratings={recipe.ratings} />
    </article>
  )
}

function RecipeDetailSkeleton() {
  const bar = 'animate-pulse rounded-3xl bg-surface-sunken motion-reduce:animate-none'
  return (
    <div aria-busy="true" aria-label="Loading recipe" className="space-y-6">
      <div className={`h-80 w-full ${bar}`} />
      <div className={`h-40 w-full ${bar}`} />
    </div>
  )
}
