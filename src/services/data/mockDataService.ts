import seed from '../../../db.seed.json'
import type { DataService } from './DataService'
import { applyPut, createSnapshotDataService, dbSchema, type Db, type SnapshotStore } from './snapshotDataService'

export { dbSchema }

/** The seed, validated. Parsed lazily on first use, so builds that use the http service don't pay for it. */
let parsedSeed: Db | undefined
export const getSeed = (): Db => structuredClone((parsedSeed ??= dbSchema.parse(seed)))

/** Simulate network latency so loading states behave like the real thing. */
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

/** A store that lives in this page's memory: changes last until the page reloads. */
export function createMemoryStore(initial: () => Db = getSeed): SnapshotStore {
  let db: Db | undefined
  return {
    async read() {
      await delay()
      return (db ??= initial())
    },
    async put(collection, id, record) {
      await delay()
      db = applyPut((db ??= initial()), collection, id, record)
    },
  }
}

/** In-memory implementation of DataService backed by db.seed.json. */
export const mockDataService: DataService = createSnapshotDataService(createMemoryStore())
