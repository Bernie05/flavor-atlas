import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'

const MAX_BODY_BYTES = 64 * 1024

// The handler module's shape. Declared here instead of imported so this file
// (loaded by vite.config.ts) stays free of app code.
interface HandlerModule {
  handleAiRequest(body: unknown, generate: unknown): Promise<{ status: number; body: unknown }>
  createDefaultGenerate(apiKey?: string): unknown
}

/**
 * Serves POST /api/ai from the Vite dev server, so `npm run dev` is all you
 * need locally. The API key comes from the server's environment (.env,
 * without a VITE_ prefix), so Vite never puts it in the browser bundle.
 */
export function aiApiPlugin(apiKey: string | undefined): Plugin {
  return {
    name: 'flavor-atlas-ai-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }

        if (req.method !== 'POST') return send(405, { error: 'method_not_allowed', message: 'Use POST.' })

        let body: unknown
        try {
          body = JSON.parse(await readBody(req))
        } catch (error) {
          return error instanceof BodyTooLargeError
            ? send(413, { error: 'invalid_request', message: 'The recipe is too long to send to the AI.' })
            : send(400, { error: 'invalid_request', message: 'Send a JSON body.' })
        }

        try {
          // Loaded through Vite so edits to the handler apply without a restart.
          const handler = (await server.ssrLoadModule('/server/ai/handler.ts')) as HandlerModule
          const { status, body: responseBody } = await handler.handleAiRequest(
            body,
            handler.createDefaultGenerate(apiKey),
          )
          send(status, responseBody)
        } catch (error) {
          server.config.logger.error(`[ai] ${String(error)}`)
          send(500, { error: 'upstream_error', message: 'Something went wrong on the server.' })
        }
      })
    },
  }
}

class BodyTooLargeError extends Error {}

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
