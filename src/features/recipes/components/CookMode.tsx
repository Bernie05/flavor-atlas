import { useEffect, useRef, useState } from 'react'
import type { Recipe } from '../schema'
import { findStepTimers, formatCountdown, formatIngredient, highlightIngredients, ingredientsInStep, type StepTimer } from '../utils'

interface CookModeProps {
  recipe: Pick<Recipe, 'title' | 'steps' | 'ingredients' | 'servings'>
  /** Servings chosen on the recipe page; amounts scale to it. */
  people: number
  open: boolean
  onClose: () => void
}

interface RunningTimer extends StepTimer {
  endsAt: number
}

/**
 * The recipe one step at a time, full screen, for cooking with messy hands:
 * big text, big buttons, the ingredients each step uses (scaled to the
 * servings chosen on the page), timers you start
 * with one tap, and a screen that stays on.
 *
 * It stays mounted while closed, so the step you were on and a running timer
 * survive closing and reopening it.
 */
export function CookMode({ recipe, people, open, onClose }: CookModeProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [timer, setTimer] = useState<RunningTimer | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const awake = useWakeLock(open)
  const audioRef = useRef<AudioContext | null>(null)
  const chimedRef = useRef(false)

  // Sync with the dialog's imperative API, as in ConfirmDialog.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // A clock that only ticks while a timer runs.
  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [timer])

  const remaining = timer ? (timer.endsAt - now) / 1000 : 0
  const timeUp = timer !== null && remaining <= 0

  // Chime once when the timer runs out. The AudioContext was created by the
  // tap that started the timer, which is what lets it make sound.
  useEffect(() => {
    if (!timeUp || chimedRef.current) return
    chimedRef.current = true
    chime(audioRef.current)
    navigator.vibrate?.([200, 100, 200])
  }, [timeUp])

  const startTimer = (stepTimer: StepTimer) => {
    audioRef.current ??= typeof AudioContext === 'undefined' ? null : new AudioContext()
    chimedRef.current = false
    const running = startedNow(stepTimer)
    setNow(running.endsAt - stepTimer.seconds * 1000)
    setTimer(running)
  }

  const step = recipe.steps[stepIndex] ?? ''
  const isLast = stepIndex === recipe.steps.length - 1
  const goTo = (index: number) => setStepIndex(Math.min(Math.max(index, 0), recipe.steps.length - 1))
  const timers = findStepTimers(step)
  const needed = ingredientsInStep(step, recipe.ingredients)

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="cook-mode-title"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') goTo(stepIndex + 1)
        if (event.key === 'ArrowLeft') goTo(stepIndex - 1)
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-canvas p-0 text-ink backdrop:bg-canvas"
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label-mono text-tint-ink tabular-nums">
                Step {stepIndex + 1} of {recipe.steps.length}
              </p>
              <h2 id="cook-mode-title" className="truncate text-2xl">
                {recipe.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="min-h-10 shrink-0 rounded-full px-4 font-semibold text-ink-muted ring-1 ring-line hover:bg-surface-sunken"
            >
              Close
            </button>
          </div>
          <div
            role="progressbar"
            aria-label="Progress"
            aria-valuemin={1}
            aria-valuemax={recipe.steps.length}
            aria-valuenow={stepIndex + 1}
            className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
          >
            <div
              className="h-full rounded-full bg-tint transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${((stepIndex + 1) / recipe.steps.length) * 100}%` }}
            />
          </div>
          {timer && (
            <div
              role="timer"
              className={`flex min-h-11 items-center justify-between gap-3 rounded-full px-4 ${
                timeUp ? 'bg-ink text-canvas' : 'bg-tint-soft text-tint-ink'
              }`}
            >
              <span className="min-w-0 truncate text-sm font-medium">
                {timeUp ? `Time's up: ${timer.label}` : `Timer · ${timer.label}`}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {!timeUp && <span className="font-mono text-lg font-semibold tabular-nums">{formatCountdown(remaining)}</span>}
                <button type="button" onClick={() => setTimer(null)} className="min-h-10 min-w-10 px-2 text-sm font-semibold underline-offset-4 hover:underline">
                  {timeUp ? 'Dismiss' : 'Stop'}
                </button>
              </span>
            </div>
          )}
          {/* Always in the page and only its text changes: screen readers skip live regions that appear with their content. */}
          <p className="sr-only" aria-live="assertive">
            {timeUp && timer ? `Time's up: ${timer.label}` : ''}
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-8" aria-live="polite">
          <p className="text-2xl leading-snug sm:text-3xl">
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

          {timers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {timers.map((stepTimer, i) => {
                // A second tap would silently restart the countdown.
                const running = timer?.label === stepTimer.label && !timeUp
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => startTimer(stepTimer)}
                    disabled={running}
                    className="inline-flex min-h-11 items-center rounded-full bg-tint-soft px-4 font-semibold text-tint-ink ring-1 ring-tint/30 hover:ring-tint disabled:opacity-60 disabled:hover:ring-tint/30"
                  >
                    {running ? 'Timer running' : `Start ${formatCountdown(stepTimer.seconds)} timer`}
                  </button>
                )
              })}
            </div>
          )}

          {needed.length > 0 && (
            <div className="space-y-2">
              <p className="label-mono text-ink-subtle tabular-nums">In this step · serves {people}</p>
              <ul className="flex flex-wrap gap-2">
                {needed.map((ingredient) => {
                  const { amount, name } = formatIngredient(ingredient, recipe.servings, people)
                  return (
                    <li key={ingredient.name} className="rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-line">
                      {amount && <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{amount} </span>}
                      {name}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <footer className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0}
              className="min-h-14 rounded-full font-semibold ring-1 ring-line-strong hover:bg-surface-sunken disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onClose() : goTo(stepIndex + 1))}
              className="min-h-14 rounded-full bg-ink font-semibold text-canvas hover:bg-accent"
            >
              {isLast ? 'Done' : 'Next step'}
            </button>
          </div>
          {awake && <p className="label-mono text-center text-ink-subtle">Screen stays on while you cook</p>}
        </footer>
      </div>
    </dialog>
  )
}

/** A timer that starts now. Only called from a tap, never during render. */
const startedNow = (stepTimer: StepTimer): RunningTimer => ({ ...stepTimer, endsAt: Date.now() + stepTimer.seconds * 1000 })

/**
 * Keeps the screen on while `active`. The browser drops the lock whenever the
 * page is hidden, so it's requested again when the page comes back. Returns
 * whether the lock is held; browsers without the API simply return false.
 */
function useWakeLock(active: boolean): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) return void next.release()
        sentinel = next
        setHeld(true)
        next.addEventListener('release', () => setHeld(false))
      } catch {
        // Refused (low battery, an embedded frame): cooking still works.
        setHeld(false)
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && void request()

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [active])

  return active && held
}

/** Two short tones. Silent if the browser has no audio. */
function chime(audio: AudioContext | null) {
  if (!audio) return
  for (const [offset, frequency] of [
    [0, 880],
    [0.3, 1175],
  ] as const) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const start = audio.currentTime + offset
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.25, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.25)
  }
}
