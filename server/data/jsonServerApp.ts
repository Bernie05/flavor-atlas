import type { IncomingMessage, ServerResponse } from 'node:http'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
// json-server has no public API for embedding, so we assemble it from the
// same pieces its own CLI uses (node_modules/json-server/lib/bin.js).
import { NormalizedAdapter } from 'json-server/lib/adapters/normalized-adapter.js'
import { Observer } from 'json-server/lib/adapters/observer.js'
import { createApp } from 'json-server/lib/app.js'

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
  const app = createApp(db, { logger: false })
  return (req, res, next) => app.handler(req, res, next)
}
