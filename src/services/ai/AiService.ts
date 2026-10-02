import type { AiDraft, AiSuggestion, AiTask } from '@/features/ai/schema'

/**
 * The AI writing helpers, behind an interface like DataService. The form
 * doesn't know whether a suggestion comes from our server or from Claude
 * inside the phone preview.
 */
export interface AiService {
  /** False when AI can't work in this environment; the UI hides its buttons. */
  isAvailable(): Promise<boolean>
  /** Rejects with AiError. The result is already validated against recipe rules. */
  suggest<T extends AiTask>(task: T, draft: AiDraft, signal?: AbortSignal): Promise<AiSuggestion<T>>
}
