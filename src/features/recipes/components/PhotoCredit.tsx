import type { Recipe } from '../schema'

/** The photo's credit as a small pill over the photo, linked to its source page. */
export function PhotoCredit({ recipe }: { recipe: Pick<Recipe, 'imageCredit' | 'imageSourceUrl'> }) {
  if (!recipe.imageCredit) return null
  const className = 'absolute top-3 right-3 max-w-[70%] truncate rounded-full bg-black/60 px-3 py-1 text-xs text-white'
  return recipe.imageSourceUrl ? (
    <a
      href={recipe.imageSourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} underline-offset-2 hover:underline`}
    >
      {recipe.imageCredit}
    </a>
  ) : (
    <p className={className}>{recipe.imageCredit}</p>
  )
}
