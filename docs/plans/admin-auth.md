# Admin login

Status: **done**. Requested by the project owner.

## Goal

Only the owner can create, edit and delete recipes, rate recipes, and use the AI helpers. Everyone else can browse.

## Decisions

| Question | Decision |
|---|---|
| Who can rate? | Admin only, for now. |
| Phone preview (no server) | Editing is shown only to the artifact's owner, using the claude.ai viewer's `isOwner()`. No password there. |
| AI helpers | Admin only: they spend the owner's API credits. |

## Design

The server enforces access. Hiding buttons in the UI is a convenience, not security: anything in the browser bundle is public, and requests can be sent without the UI.

```
Browser ──► Vite dev server (json-server runs inside it, behind the gateway)
             ├─ POST /api/auth/login    verify password → set session cookie
             ├─ POST /api/auth/logout   clear cookie
             ├─ GET  /api/auth/session  { admin: boolean }
             ├─ /api/data/*             reads: anyone · writes: admin (else 401) → in-process json-server
             └─ POST /api/ai            admin (else 401)
```

- **Password:** stored only as a scrypt hash in `ADMIN_PASSWORD_HASH` (server env). Create it with `npm run auth:hash`. Compared with `timingSafeEqual`.
- **Session:** an HMAC-signed token with an expiry (7 days), signed with `SESSION_SECRET`, in an `HttpOnly; SameSite=Strict` cookie (plus `Secure` over HTTPS). JavaScript can't read it, other sites can't send it, and it can't be forged.
- **Brute force:** 5 login attempts per minute per IP.
- **Secure by default:** if `ADMIN_PASSWORD_HASH` or `SESSION_SECRET` is missing, login is unavailable and every write is refused.
- **Redirects:** `/login?next=…` only accepts local paths, to prevent open redirects.

## Security review

An independent review found two ways around the gateway, both fixed and re-tested:

- **Prefix mismatch:** the proxy matched any path starting with `/api/data` while the gateway only matched `/api/data/…`, so `/api/dataratings` reached json-server unchecked. Fixed by removing the proxy.
- **json-server on the network:** its CLI ignores `--host`, listens on every interface and allows any origin. Fixed by running json-server in-process behind the gateway, with no port of its own.

Also fixed: a malformed cookie caused a 500, the rate limiter never forgot old IPs, and short session secrets were accepted.

Accepted for now: logout clears the cookie but can't revoke a copied token before it expires (7 days). Rotating `SESSION_SECRET` signs everyone out.

## Not in scope

- User accounts or per-user ownership (next step: Supabase Auth, together with moving off json-server).
- Production deployment of the `/api/*` endpoints (Phase 7: serverless functions).
