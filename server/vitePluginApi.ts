import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const MAX_BODY_BYTES = 64 * 1024

export interface ApiEnv {
  ANTHROPIC_API_KEY?: string
  ADMIN_PASSWORD_HASH?: string
  SESSION_SECRET?: string
}

// Shapes of the server modules, declared here instead of imported so this
// file (loaded by vite.config.ts) stays free of app code.
interface AuthResponse {
  status: number
  body: unknown
  setCookie?: string
}
interface AuthModule {
  isAdmin(cookie: string | undefined, config: AuthConfig): boolean
  handleLogin(body: unknown, options: { ip: string; secure: boolean; config: AuthConfig }): AuthResponse
  handleLogout(): AuthResponse
  handleSession(cookie: string | undefined, config: AuthConfig): AuthResponse
}
interface AccessModule {
  requiresAdmin(method: string | undefined): boolean
}
interface AiModule {
  handleAiRequest(body: unknown, generate: unknown): Promise<{ status: number; body: unknown }>
  createDefaultGenerate(apiKey?: string): unknown
}
interface DataModule {
  createDataHandler(file: string): Promise<(req: IncomingMessage, res: ServerResponse, next: () => void) => void>
}
interface AuthConfig {
  passwordHash?: string
  sessionSecret?: string
}

/**
 * The app's server, running inside the Vite dev server:
 *
 *   /api/auth/login|logout|session   admin login with a session cookie
 *   /api/data/*                      json-server (in-process), writes need the admin
 *   /api/ai                          Claude, admin only
 *
 * Secrets come from the server environment (.env without a VITE_ prefix),
 * so Vite never puts them in the browser bundle.
 */
export function apiPlugin(env: ApiEnv): Plugin {
  const authConfig: AuthConfig = { passwordHash: env.ADMIN_PASSWORD_HASH, sessionSecret: env.SESSION_SECRET }

  return {
    name: 'flavor-atlas-api',
    configureServer(server) {
      // Loaded through Vite so edits apply without a restart.
      const load = <T>(path: string) => server.ssrLoadModule(path) as Promise<T>
      const auth = () => load<AuthModule>('/server/auth/handlers.ts')
      const isAdmin = async (req: IncomingMessage) => (await auth()).isAdmin(req.headers.cookie, authConfig)

      server.middlewares.use('/api/auth', (req, res) =>
        guarded(server, res, async () => {
          const handlers = await auth()
          const route = `${req.method} ${req.url?.split('?')[0]}`
          const response =
            route === 'POST /login'
              ? handlers.handleLogin(await readJson(req), {
                  ip: req.socket.remoteAddress ?? 'unknown',
                  secure: isHttps(req),
                  config: authConfig,
                })
              : route === 'POST /logout'
                ? handlers.handleLogout()
                : route === 'GET /session'
                  ? handlers.handleSession(req.headers.cookie, authConfig)
                  : { status: 404, body: { error: 'not_found', message: 'No such auth route.' } }
          if (response.setCookie) res.setHeader('Set-Cookie', response.setCookie)
          send(res, response.status, response.body)
        }),
      )

      // json-server runs in this process, created once. connect strips the
      // /api/data prefix before it sees the request, and only matches real
      // sub-paths: /api/dataratings is not /api/data/ratings.
      let dataHandler: ReturnType<DataModule['createDataHandler']> | undefined
      const getDataHandler = () =>
        (dataHandler ??= load<DataModule>('/server/data/jsonServerApp.ts').then((m) =>
          m.createDataHandler(resolve(server.config.root, 'db.json')),
        ))

      // The gateway, then the data: every request to json-server passes the check.
      server.middlewares.use('/api/data', (req, res, next) =>
        guarded(server, res, async () => {
          const { requiresAdmin } = await load<AccessModule>('/server/auth/access.ts')
          if (requiresAdmin(req.method) && !(await isAdmin(req))) {
            return send(res, 401, { error: 'unauthorized', message: 'Log in as the admin to make changes.' })
          }
          ;(await getDataHandler())(req, res, next)
        }),
      )

      server.middlewares.use('/api/ai', (req, res) =>
        guarded(server, res, async () => {
          if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed', message: 'Use POST.' })
          // AI spends the owner's API credits: admin only.
          if (!(await isAdmin(req))) {
            return send(res, 401, { error: 'unauthorized', message: 'Log in as the admin to use AI.' })
          }
          const ai = await load<AiModule>('/server/ai/handler.ts')
          const { status, body } = await ai.handleAiRequest(
            await readJson(req),
            ai.createDefaultGenerate(env.ANTHROPIC_API_KEY),
          )
          send(res, status, body)
        }),
      )
    },
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Run a route; turn bad input into 400/413 and anything unexpected into a logged 500. */
async function guarded(server: ViteDevServer, res: ServerResponse, run: () => Promise<void>) {
  try {
    await run()
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return send(res, 413, { error: 'invalid_request', message: 'The request is too large.' })
    }
    if (error instanceof SyntaxError) {
      return send(res, 400, { error: 'invalid_request', message: 'Send a JSON body.' })
    }
    server.config.logger.error(`[api] ${String(error)}`)
    send(res, 500, { error: 'server_error', message: 'Something went wrong on the server.' })
  }
}

// Behind a proxy that terminates HTTPS, the original protocol is in X-Forwarded-Proto.
const isHttps = (req: IncomingMessage) =>
  'encrypted' in req.socket || req.headers['x-forwarded-proto'] === 'https'

class BodyTooLargeError extends Error {}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return JSON.parse(await readBody(req))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    const onData = (chunk: Buffer) => {
      size += chunk.length
      // Refuse oversized bodies instead of buffering them. Keep draining the
      // stream (without storing it) so we can still send a 413 response.
      if (size > MAX_BODY_BYTES) {
        req.off('data', onData)
        req.resume()
        reject(new BodyTooLargeError())
        return
      }
      chunks.push(chunk)
    }
    req.on('data', onData)
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
