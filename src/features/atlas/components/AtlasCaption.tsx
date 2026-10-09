interface AtlasCaptionProps {
  /** Regional kitchens on the map; undefined while they load. */
  regionalKitchens?: number
}

/**
 * The map's legend. Shared by the map and its loading placeholder, which is
 * what keeps the page from jumping when the map arrives: same text, same height.
 */
export function AtlasCaption({ regionalKitchens }: AtlasCaptionProps) {
  return (
    <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-sm text-ink-muted">
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full border-[1.5px] border-ink-muted bg-surface" />
          Capital: opens its recipes
        </span>
        {/* While regions load, an invisible stand-in holds the line's place. */}
        {regionalKitchens !== 0 && (
          <span className={`inline-flex items-center gap-1.5 ${regionalKitchens === undefined ? 'invisible' : ''}`}>
            <span aria-hidden className="size-1.5 rounded-full bg-ink-muted" />
            {regionalKitchens ?? 10} regional kitchens
          </span>
        )}
      </span>
      <span className="text-xs text-ink-subtle">Drag to explore · pinch or + − to zoom · Map: Natural Earth</span>
    </figcaption>
  )
}
