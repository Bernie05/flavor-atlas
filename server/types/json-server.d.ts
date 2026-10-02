// json-server ships no types for its internal modules; these cover what we use.
declare module 'json-server/lib/app.js' {
  import type { IncomingMessage, ServerResponse } from 'node:http'
  export function createApp(
    db: unknown,
    options?: { logger?: boolean; static?: string[] },
  ): { handler(req: IncomingMessage, res: ServerResponse, next?: () => void): void }
}
declare module 'json-server/lib/adapters/normalized-adapter.js' {
  import type { Adapter } from 'lowdb'
  export class NormalizedAdapter<T = unknown> implements Adapter<T> {
    constructor(adapter: Adapter<T>)
    read(): Promise<T | null>
    write(data: T): Promise<void>
  }
}
declare module 'json-server/lib/adapters/observer.js' {
  import type { Adapter } from 'lowdb'
  export class Observer<T = unknown> implements Adapter<T> {
    constructor(adapter: Adapter<T>)
    read(): Promise<T | null>
    write(data: T): Promise<void>
  }
}
