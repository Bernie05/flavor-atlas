import type { DataService } from './DataService'
import { ApiError, UnauthorizedError } from './errors'
import { createMemoryStore, getSeed } from './mockDataService'
import { applyChanges, parseRecord, toChangeBody, WRITABLE_COLLECTIONS, type ChangeDoc } from './overlay'
import { createSnapshotDataService, type Db, type SnapshotStore, type WritableCollection } from './snapshotDataService'

// The small part of the claude.ai viewer's `db` capability we use.
interface DocSnapshot {
  id: string
  data(): Record<string, unknown> | undefined
}
interface ArtifactDb {
  collection(path: string): { get(): Promise<{ docs: DocSnapshot[] }> }
  doc(path: string): { set(data: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
}
interface DbError {
  code: string
  message: string
}
interface ClaudeRuntime {
  use(name: 'db'): Promise<ArtifactDb | null>
}

const runtime = () => (window as Window & { claude?: ClaudeRuntime }).claude

let dbPromise: Promise<ArtifactDb | null> | undefined
const getArtifactDb = () =>
  (dbPromise ??= (runtime()?.use('db') ?? Promise.resolve(null)).catch(() => null))

const isDbError = (error: unknown): error is DbError =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'

/** Codes that say "not in this view, for the rest of this visit": show the seed instead. */
const LOST_ACCESS = new Set(['revoked', 'not_granted', 'capability_disabled', 'capability_removed'])

/** A busy or unknown condition. The platform says to treat unknown codes as `unavailable`: try again. */
const busy = () => new ApiError(503, "The preview's database is busy. Try again in a moment.")

/** Turn a refused write into the app's own errors, so describeError and the retry policy just work. */
function toWriteError(error: unknown): unknown {
  if (!isDbError(error)) return error
  switch (error.code) {
    // Bodies are validated and plain JSON before they're sent, so a rejected
    // well-formed write means this viewer is below the rules' write level.
    case 'invalid_argument':
    case 'transform_error':
      return new UnauthorizedError('Only the owner of this preview can save changes.')
    case 'quota_exceeded':
      return new ApiError(507, "This preview's storage is full. Delete some recipes or reviews to make room.")
    default:
      return LOST_ACCESS.has(error.code) ? new UnauthorizedError('This view can no longer save changes.') : busy()
  }
}

/** Reads within this window share one fetch: a page renders several queries at once. */
const READ_REUSE_MS = 1000

/**
 * The phone preview's store: the bundled seed plus the changes saved in the
 * artifact's shared database, so admin edits survive reloads and every
 * viewer sees them. When this view has no database (signed out, or
 * `npm run dev:mock` outside claude.ai) or loses it, visitors still get the
 * seed. The database's rules, not the UI, decide who may write.
 */
export function createArtifactStore(
  getDb: () => Promise<ArtifactDb | null> = getArtifactDb,
  fallback: SnapshotStore = createMemoryStore(),
): SnapshotStore {
  // Bumped before and after every write: a read started before or during a
  // write is never reused afterwards, so a save can't be hidden by a stale read.
  let writes = 0
  let cached: { at: number; writes: number; promise: Promise<Db> } | undefined

  const fetchDb = async (artifactDb: ArtifactDb): Promise<Db> => {
    const snapshots = await Promise.all(
      WRITABLE_COLLECTIONS.map((c) => {
        const get = artifactDb.collection(c).get()
        // The review queue is readable only by those who may send reviews (Contributors
        // and up; the preview's rules can't make it write-only like the real server).
        // For view-only visitors the read is refused: "no queue here", not "no database".
        return c === 'submissions' ? get.catch(() => ({ docs: [] })) : get
      }),
    )
    const changes = Object.fromEntries(
      WRITABLE_COLLECTIONS.map((c, i) => [c, snapshots[i]!.docs.map((doc): ChangeDoc => ({ id: doc.id, body: doc.data() }))]),
    )
    return applyChanges(getSeed(), changes)
  }

  const read = (artifactDb: ArtifactDb): Promise<Db> =>
    fetchDb(artifactDb).catch((error: unknown) => {
      if (isDbError(error) && LOST_ACCESS.has(error.code)) return fallback.read()
      throw isDbError(error) ? busy() : error
    })

  const isSeedRecord = (collection: WritableCollection, id: string) => getSeed()[collection].some((r) => r.id === id)

  return {
    async read() {
      const artifactDb = await getDb()
      if (!artifactDb) return fallback.read()
      if (!cached || cached.writes !== writes || Date.now() - cached.at > READ_REUSE_MS) {
        const promise = read(artifactDb)
        const entry = { at: Date.now(), writes, promise }
        cached = entry
        // A failed read is never reused, but only clear our own entry, not a newer one.
        promise.catch(() => cached === entry && (cached = undefined))
      }
      return cached.promise
    },

    async put(collection, id, record) {
      const artifactDb = await getDb()
      if (!artifactDb) return fallback.put(collection, id, record)
      const ref = artifactDb.doc(`${collection}/${id}`)
      writes++
      try {
        if (record) await ref.set(toChangeBody(parseRecord(collection, record)))
        // A seed record needs a marker to hide it; a record you created can simply go.
        else if (isSeedRecord(collection, id)) await ref.set(toChangeBody(null))
        else await ref.delete()
      } catch (error) {
        throw toWriteError(error)
      } finally {
        writes++
      }
    },
  }
}

/** DataService for the phone preview: seed + saved changes, shared by every viewer. */
export const artifactDataService: DataService = createSnapshotDataService(createArtifactStore())
