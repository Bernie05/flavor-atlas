import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent } from 'react'
import { panView, pinScale, revealPoint, viewCenter, viewLimits, zoomView, type MapPoint, type MapView } from './utils'

/** Pixels a pointer must move before a press becomes a drag (so a tap on a pin still opens it). */
const DRAG_THRESHOLD = 4
const BUTTON_ZOOM = 1.6

const sameView = (a: MapView, b: MapView) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/**
 * Zoom and pan for the atlas map, starting from (and resetting to) `home`.
 * Mouse: drag to move, double-click to zoom in. Trackpad pinch or Ctrl/⌘ +
 * scroll zooms; plain scrolling still scrolls the page. Touch: pinch zooms, and
 * one finger drags the map once zoomed in (before that it scrolls the page).
 * The math lives in utils.ts; this hook only turns events into it.
 */
export function useMapViewport(home: MapView) {
  const [state, setState] = useState({ home, view: home })
  // New data (an added cuisine) moves the home view: start again from it.
  // Adjusting state during render avoids drawing one frame of the old view.
  if (!sameView(state.home, home)) setState({ home, view: home })
  const view = sameView(state.home, home) ? state.view : home
  const limits = viewLimits(home)

  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const travelled = useRef(0)
  const swallowClick = useRef(false)

  const update = (next: (view: MapView) => MapView) => setState((s) => ({ home: s.home, view: next(s.view) }))

  /** A point on screen in map units, through the SVG's own transform (right at any size or zoom). */
  const toMap = (clientX: number, clientY: number): MapPoint | undefined => {
    const matrix = svgRef.current?.getScreenCTM()
    return matrix ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()) : undefined
  }
  const unitsPerPixel = (v: MapView) => v.width / (svgRef.current?.getBoundingClientRect().width || 1)

  const zoomedIn = view.width < home.width - 0.5

  // Ctrl/⌘ + wheel (and trackpad pinch, which browsers report the same way) zooms.
  // React's wheel listener is passive, so it couldn't stop the page zooming; this one can.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return // plain scrolling scrolls the page
      event.preventDefault()
      const focus = toMap(event.clientX, event.clientY)
      if (!focus) return
      const factor = Math.exp(-Math.max(-50, Math.min(50, event.deltaY)) * 0.01)
      update((v) => zoomView(v, factor, focus, viewLimits(home)))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
    // toMap and update only read refs and setState; home is what can change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home.x, home.y, home.width, home.height])

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // The first finger (or any mouse press) starts a new gesture. Clearing here rather
    // than counting releases means a release the browser never delivered can't leave a
    // stale finger behind that turns the next tap into a pinch or swallows its click.
    if (event.isPrimary) {
      pointers.current.clear()
      travelled.current = 0
      swallowClick.current = false
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const current = { x: event.clientX, y: event.clientY }

    if (pointers.current.size === 2) {
      // Pinch: zoom by how much the two fingers spread, about the point between them.
      const [other] = [...pointers.current].filter(([id]) => id !== event.pointerId).map(([, p]) => p)
      if (!other) return
      const before = Math.hypot(previous.x - other.x, previous.y - other.y)
      const after = Math.hypot(current.x - other.x, current.y - other.y)
      const focus = toMap((current.x + other.x) / 2, (current.y + other.y) / 2)
      pointers.current.set(event.pointerId, current)
      if (!focus || before === 0) return
      travelled.current += DRAG_THRESHOLD
      update((v) => zoomView(v, after / before, focus, limits))
      return
    }

    // One finger on a map that isn't zoomed in belongs to the page (it scrolls).
    if (event.pointerType === 'touch' && !zoomedIn) return
    const dx = current.x - previous.x
    const dy = current.y - previous.y
    pointers.current.set(event.pointerId, current)
    travelled.current += Math.hypot(dx, dy)
    if (travelled.current < DRAG_THRESHOLD) return
    // Capture only once it's a drag: capturing on press would steal the click from a pin.
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
    update((v) => panView(v, -dx * unitsPerPixel(v), -dy * unitsPerPixel(v)))
  }

  const onPointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0 && travelled.current >= DRAG_THRESHOLD) swallowClick.current = true
  }

  /** A drag that ends on a pin must not also open it. */
  const onClickCapture = (event: MouseEvent<SVGSVGElement>) => {
    if (!swallowClick.current) return
    swallowClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const onDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest('a')) return
    const focus = toMap(event.clientX, event.clientY)
    if (focus) update((v) => zoomView(v, 2, focus, limits))
  }

  /** A pin reached with Tab while zoomed in is brought into view. */
  const onFocusCapture = (event: FocusEvent<SVGSVGElement>) => {
    const pin = (event.target as Element).closest<SVGElement>('[data-pin-x]')
    if (!pin) return
    const point = { x: Number(pin.dataset.pinX), y: Number(pin.dataset.pinY) }
    update((v) => revealPoint(v, point, 30 * pinScale(v)))
  }

  return {
    view,
    svgRef,
    zoomedIn,
    isHome: sameView(view, home),
    canZoomIn: view.width > limits.minWidth + 0.5,
    canZoomOut: view.width < limits.maxWidth - 0.5,
    zoomIn: () => update((v) => zoomView(v, BUTTON_ZOOM, viewCenter(v), limits)),
    zoomOut: () => update((v) => zoomView(v, 1 / BUTTON_ZOOM, viewCenter(v), limits)),
    reset: () => update(() => home),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onClickCapture,
      onDoubleClick,
      onFocusCapture,
    },
  }
}
