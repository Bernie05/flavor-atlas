import { formatQuantity } from '@/features/recipes/utils'
import type { AiDraft, AiTask } from './schema'

/**
 * Builds the prompt for a task. The server and the phone preview both use
 * this one function, so they always ask Claude the same thing.
 *
 * Structure: context, then the cook's draft inside tags (so it reads as
 * data, not instructions), then the task, its rules and the output shape.
 */
export function buildPrompt(task: AiTask, draft: AiDraft): string {
  return [
    'You are helping a home cook write a recipe for Flavor Atlas, a recipe book organized by cuisine.',
    'Here is their draft so far:',
    `<draft>\n${formatDraft(draft)}\n</draft>`,
    TASKS[task](draft),
  ].join('\n\n')
}

function formatDraft(draft: AiDraft): string {
  const ingredients = draft.ingredients.filter((i) => i.name.trim())
  const steps = draft.steps.filter((s) => s.trim())
  return [
    `Title: ${draft.title}`,
    `Cuisine: ${draft.cuisineName || 'not chosen yet'}`,
    `Serves: ${draft.servings}`,
    draft.description && `Description: ${draft.description}`,
    ingredients.length
      ? `Ingredients:\n${ingredients
          .map((i) => `- ${[i.quantity !== undefined && formatQuantity(i.quantity), i.unit, i.name].filter(Boolean).join(' ')}`)
          .join('\n')}`
      : 'Ingredients: none listed yet',
    steps.length ? `Steps:\n${steps.map((s, n) => `${n + 1}. ${s}`).join('\n')}` : 'Steps: none written yet',
  ]
    .filter(Boolean)
    .join('\n')
}

const STYLE =
  'Write plainly and specifically, the way an experienced home cook talks. No marketing words ("delicious", "mouthwatering"), no emoji, no exclamation marks.'

const TASKS: Record<AiTask, (draft: AiDraft) => string> = {
  description: () =>
    [
      'Task: write the description for this recipe.',
      'Rules:',
      '- One or two sentences, under 300 characters.',
      '- Say what the dish tastes like and when someone would make it.',
      '- Base it on the title, cuisine and ingredients. Do not mention ingredients the draft does not list, unless none are listed.',
      `- ${STYLE}`,
      'Reply with only JSON in this shape: {"description": "..."}',
    ].join('\n'),

  steps: (draft) =>
    [
      draft.steps.some((s) => s.trim())
        ? 'Task: rewrite the steps so a home cook can follow them without guessing. Keep the cook\'s method and ingredients; fix order, clarity and missing details such as heat level and time when the draft implies them.'
        : 'Task: write the cooking steps for this recipe using the listed ingredients.',
      'Rules:',
      '- 3 to 12 steps, one main action per step, in the order they happen.',
      '- Do not add ingredients that are not in the draft.',
      '- Each step is one or two sentences. Do not number them.',
      `- ${STYLE}`,
      'Reply with only JSON in this shape: {"steps": ["...", "..."]}',
    ].join('\n'),

  ingredients: (draft) =>
    [
      `Task: suggest a complete ingredient list for ${draft.servings} servings of a typical home version of this dish.`,
      'Rules:',
      '- If the draft already lists ingredients, keep them (you may fix quantities) and add what is missing.',
      '- quantity is a number (0.5, not "1/2"), or null for "to taste".',
      '- unit is a common kitchen unit: g, kg, ml, l, cup, tbsp, tsp, clove, piece, bunch, or "" for countable items like eggs.',
      '- name includes preparation where it matters, like "garlic, crushed".',
      'Reply with only JSON in this shape: {"ingredients": [{"name": "...", "quantity": 1, "unit": "cup"}]}',
    ].join('\n'),
}
