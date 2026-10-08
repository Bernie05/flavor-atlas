import { dishSchema } from '@/features/dishes/schema'
import { ratingSchema } from '@/features/ratings/schema'
import { recipeSchema } from '@/features/recipes/schema'
import { applyPut, type Db, type WritableCollection, type WritableRecords } from './snapshotDataService'

/**
 * The artifact's shared database stores only changes on top of the bundled
 * seed: one document per changed record, `{ record }` for a created or
 * edited one and `{ deleted: true }` for a removed one. The seed never has
 * to be copied in, and a view without the database still has the seed.
 */
export type ChangeBody = { record: WritableRecords[WritableCollection] } | { deleted: true }

/** One stored change as read back: its document id and raw, untrusted body. */
export interface ChangeDoc {
  id: string
  body: unknown
}

export const WRITABLE_COLLECTIONS: readonly WritableCollection[] = ['dishes', 'recipes', 'ratings']

const schemas = { dishes: dishSchema, recipes: recipeSchema, ratings: ratingSchema }

/**
 * Validate a record before it's stored: what fails here would be skipped on
 * every read, and the schema also drops fields that aren't part of the record
 * (like a recipe's embedded `ratings`).
 */
export function parseRecord<C extends WritableCollection>(collection: C, record: unknown): WritableRecords[C] {
  return schemas[collection].parse(record) as WritableRecords[C]
}

/**
 * The stored body for a change. Bodies must be plain JSON, so it round-trips
 * through JSON: an ingredient's `quantity: undefined` ("salt, to taste") is
 * dropped instead of reaching the database.
 */
export const toChangeBody = <C extends WritableCollection>(record: WritableRecords[C] | null): ChangeBody =>
  record ? { record: JSON.parse(JSON.stringify(record)) as WritableRecords[C] } : { deleted: true }

/**
 * The seed with every stored change applied. Shared data is untrusted input:
 * a body that isn't a deletion or a record passing its schema (with an id
 * matching its document) is skipped, so one bad write can't break the page.
 */
export function applyChanges(seed: Db, changes: Partial<Record<WritableCollection, ChangeDoc[]>>): Db {
  let db = seed
  for (const collection of WRITABLE_COLLECTIONS) {
    for (const { id, body } of changes[collection] ?? []) {
      if (typeof body !== 'object' || body === null) continue
      if ('deleted' in body && body.deleted === true) {
        db = applyPut(db, collection, id, null)
        continue
      }
      const parsed = schemas[collection].safeParse('record' in body ? body.record : undefined)
      if (parsed.success && parsed.data.id === id) db = applyPut(db, collection, id, parsed.data)
    }
  }
  return db
}
