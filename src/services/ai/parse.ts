import { aiSuggestionSchemas, type AiSuggestion, type AiTask } from '@/features/ai/schema'
import { AiError } from './errors'

/** Validate model output against recipe rules before it can touch the form. */
export function parseSuggestion<T extends AiTask>(task: T, data: unknown): AiSuggestion<T> {
  const result = aiSuggestionSchemas[task].safeParse(data)
  if (!result.success) {
    throw new AiError('invalid_output', "The suggestion didn't fit a recipe. Try again.")
  }
  return result.data as AiSuggestion<T>
}
