import type { IncomingMessage, ServerResponse } from 'node:http'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
// json-server has no public API for embedding, so we assemble it from the
// same pieces its own CLI uses (node_modules/json-server/lib/bin.js).
import { NormalizedAdapter } from 'json-server/lib/adapters/normalized-adapter.js'
import { Observer } from 'json-server/lib/adapters/observer.js'
import { createApp } from 'json-server/lib/app.js'
import { checkIntegrity } from './integrity'
import { createRateLimiter } from '../auth/rateLimit'
import { createWithSlug, SLUG_COLLECTIONS } from './slugCreate'
import { createSubmission } from './submissions'

/** db.json: collection name → records. */
type Data = Record<string, unknown>

export type DataHandler = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

/**
 * json-server running inside our own server, behind the auth gateway.
 *
 * Why not its CLI on a separate port: this version ignores --host and listens
 * on every network interface with `Access-Control-Allow-Origin: *`, so anyone
 * on the network, or a website you visit, could write to it directly and
 * skip the gateway. In-process, the gateway is the only way in.
 */
export async function createDataHandler(file: string): Promise<DataHandler> {
  const db = new Low<Data>(new Observer(new NormalizedAdapter(new JSONFile<Data>(file))), {})
  await db.read()
  // A db.json from before visitor reviews has no queue; json-server would 404 on it.
  db.data.submissions ??= []
  const app = createApp(db, { logger: false })
  // Visitor reviews are the one public write: a few per visitor, then wait.
  const allowSubmission = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })
  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  return (req, res, next) => {
    // The gateway already checked who may write; this checks the write keeps the data whole.
    const refusal = checkIntegrity(req.method, req.url, db.data)
    if (refusal) return send(res, refusal.status, refusal.body)

    const collection = req.url?.split('?')[0]?.split('/').filter(Boolean)

    // A visitor's review, checked here and queued for the admin (server/data/submissions.ts).
    if (req.method === 'POST' && collection?.length === 1 && collection[0] === 'submissions') {
      if (!allowSubmission(req.socket.remoteAddress ?? 'unknown')) {
        return send(res, 429, { error: 'rate_limited', message: "You've sent several reviews in a short time. Try again in a few minutes." })
      }
      void readJson(req).then(
        async (body) => {
          const result = createSubmission(db.data, body)
          if (result.status !== 201) return send(res, result.status, result.body)
          if (result.item) await db.write()
          // The same answer for a person and a caught bot: nothing to learn from it.
          send(res, 201, { status: 'pending' })
        },
        () => send(res, 400, { error: 'invalid_request', message: 'Send a JSON body.' }),
      )
      return
    }

    // Cuisines keep the id the app sends (json-server would replace it with a random one).
    if (req.method === 'POST' && collection?.length === 1 && SLUG_COLLECTIONS.has(collection[0]!)) {
      void readJson(req).then(
        async (body) => {
          const result = createWithSlug(db.data, collection[0]!, body)
          if (result.status !== 201) return send(res, result.status, result.body)
          await db.write()
          send(res, 201, result.item)
        },
        () => send(res, 400, { error: 'invalid_request', message: 'Send a JSON body.' }),
      )
      return
    }
    app.handler(req, res, next)
  }
}

/** The request body as JSON, at most 64 KB (the gateway's limit). */
function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 64 * 1024) {
        reject(new Error('too large'))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}
