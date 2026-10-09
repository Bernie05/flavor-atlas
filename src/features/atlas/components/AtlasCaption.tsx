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
            {/* The ringed dot of a kitchen you can tap, as drawn on the map. */}
            <span aria-hidden className="grid size-3 place-items-center rounded-full border border-ink-muted">
              <span className="size-1.5 rounded-full bg-ink-muted" />
            </span>
            {regionalKitchens ?? 10} regional kitchens · tap to open
          </span>
        )}
      </span>
      <span className="flex flex-wrap gap-x-3 text-xs text-ink-subtle">
        <span>Pinch or + − to zoom</span>
        <span className="whitespace-nowrap">Map: Natural Earth</span>
      </span>
    </figcaption>
  )
}
