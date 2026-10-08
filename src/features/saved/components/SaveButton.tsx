import { savedStore, useSavedRecipeIds } from '../useSavedRecipes'

interface SaveButtonProps {
  recipeId: string
  recipeTitle: string
  /** `icon`: a round heart over a card's photo. `labelled`: heart + "Save", for the recipe hero. */
  variant: 'icon' | 'labelled'
  className?: string
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
      <path strokeLinejoin="round" d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 3.1c0 5.5-7.5 10.1-7.5 10.1Z" />
    </svg>
  )
}

/**
 * Save a recipe to this device. A toggle: it keeps one label and reports its
 * state with aria-pressed, so a screen reader says "Save Chicken Adobo, pressed".
 * It writes only to the visitor's own browser, never to shared data, so it
 * belongs on the read-only public site.
 */
export function SaveButton({ recipeId, recipeTitle, variant, className = '' }: SaveButtonProps) {
  const saved = useSavedRecipeIds().includes(recipeId)
  const toggle = () => savedStore.toggle(recipeId)

  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-pressed={saved}
        aria-label={`Save ${recipeTitle}`}
        onClick={toggle}
        className={`grid size-10 place-items-center rounded-full bg-surface/90 backdrop-blur transition-colors hover:bg-surface ${
          saved ? 'text-tint-ink' : 'text-ink-muted hover:text-ink'
        } ${className}`}
      >
        <Heart filled={saved} />
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={toggle}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors ${
        // Outlines in the cuisine's ink (white over a photo) keep the 3:1 a control border needs.
        saved ? 'bg-tint-soft text-tint-ink ring-tint-ink' : 'text-ink ring-tint-ink/70 hover:bg-surface-sunken'
      } ${className}`}
    >
      <Heart filled={saved} />
      Save
    </button>
  )
}
