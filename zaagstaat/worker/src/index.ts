/**
 * Zaagstaat — Cloudflare Worker
 *
 * Routes:
 *   PUT  /project/:code   Save or overwrite a project (resets 90-day TTL)
 *   GET  /project/:code   Load a project (404 if expired / not found)
 *
 * KV namespace binding: PROJECTS
 * TTL: 90 days = 7_776_000 seconds
 */

export interface Env {
  PROJECTS: KVNamespace
  ALLOWED_ORIGIN: string  // set in wrangler.toml vars
}

const TTL_SECONDS = 90 * 24 * 60 * 60  // 90 days

// Unambiguous code alphabet — same as client
const CODE_RE = /^[ACDEFGHJKLMNPQRTUVWXY3467]{5}$/

function cors(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? '*'
    const headers = cors(origin)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    const url = new URL(request.url)
    const match = url.pathname.match(/^\/project\/([A-Z0-9]{5})$/i)

    if (!match) {
      return new Response('Not found', { status: 404, headers })
    }

    const code = match[1].toUpperCase()

    if (!CODE_RE.test(code)) {
      return new Response('Ongeldige code', { status: 400, headers })
    }

    // ── GET: load project ────────────────────────────────────────────────
    if (request.method === 'GET') {
      const value = await env.PROJECTS.get(code)
      if (value === null) {
        return new Response(
          JSON.stringify({ error: 'Code niet gevonden of verlopen.' }),
          { status: 404, headers: { ...headers, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(value, {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // ── PUT: save project ────────────────────────────────────────────────
    if (request.method === 'PUT') {
      // Size guard: max 256 KB per project (plenty for any realistic cutlist)
      const body = await request.text()
      if (body.length > 256_000) {
        return new Response('Project te groot', { status: 413, headers })
      }

      // Basic JSON validation
      try { JSON.parse(body) } catch {
        return new Response('Ongeldige JSON', { status: 400, headers })
      }

      await env.PROJECTS.put(code, body, { expirationTtl: TTL_SECONDS })

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405, headers })
  },
}
