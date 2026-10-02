import { config } from '@/lib/config'
import type { AiService } from './AiService'
import { artifactAiService } from './artifactAiService'
import { httpAiService } from './httpAiService'

/** The one place that decides where AI requests go. */
export const aiService: AiService = config.aiSource === 'artifact' ? artifactAiService : httpAiService

export type { AiService } from './AiService'
export { AiError, type AiErrorCode } from './errors'
