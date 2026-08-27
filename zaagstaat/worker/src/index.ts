import { validateProject, sanitizeProject } from '../../shared/projectValidation'
import { securityHeaders } from '../../shared/securityHeaders'

/**
 * Zaagstaat — Cloudflare Worker
 *
 * API Routes:
 *   PUT  /project/:code   Save or overwrite a project (resets 90-day TTL)
 *   GET  /project/:code   Load a project (404 if expired / not found)
 *
 * OG Proxy (when domain routes through Cloudflare):
 *   GET  /:code           Bot crawlers → OG HTML; browsers → proxy to Hetzner
 *   GET  /*               All other requests → proxy to Hetzner
 *
 * KV namespace binding: PROJECTS
 * TTL: 90 days = 7_776_000 seconds
 */

export interface Env {
  PROJECTS: KVNamespace
  ALLOWED_ORIGIN: string   // set in wrangler.toml vars
  HETZNER_ORIGIN: string   // e.g. https://46.225.223.181 — the actual server
  ORIGIN_SECRET?: string   // set with `wrangler secret put ORIGIN_SECRET`
}

const TTL_SECONDS = 90 * 24 * 60 * 60
const MAX_BODY_BYTES = 256_000

// Generous on purpose: a school's shared NAT can put a whole classroom of
// students behind one public IP, all autosaving independently. These limits
// exist to blunt a single abusive script, not to throttle normal classroom use.
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX = { GET: 300, PUT: 120 } as const

const CODE_RE = /^[ACDEFGHJKLMNPQRTUVWXY3467]{5}$/

function escapeHtml(value: unknown): string {
  const str = typeof value === 'string' ? value : String(value ?? '')
  return str.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

/**
 * Reads a request body without ever holding more than maxBytes in memory,
 * regardless of what (or whether) Content-Length claims. Returns null if the
 * body exceeds the limit.
 */
async function readLimitedText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = request.headers.get('Content-Length')
  if (declared && Number(declared) > maxBytes) return null
  if (!request.body) return ''

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

/**
 * Coarse per-IP throttle backed by KV — not atomic, so a best-effort limit
 * rather than a hard guarantee, but enough to stop naive brute-force or
 * enumeration scripts without requiring accounts or a paid rate-limiting product.
 */
async function checkRateLimit(env: Env, ip: string, method: 'GET' | 'PUT'): Promise<boolean> {
  const bucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000))
  const key = `ratelimit:${method}:${ip}:${bucket}`
  const current = await env.PROJECTS.get(key)
  const count = current ? Number(current) : 0
  if (count >= RATE_LIMIT_MAX[method]) return false
  await env.PROJECTS.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS * 2 })
  return true
}

function cors(origin: string) {
  return {
    ...securityHeaders(),
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

/** Known social/link-preview crawlers that need OG tags */
function isCrawler(ua: string): boolean {
  const bots = [
    'whatsapp', 'facebookexternalhit', 'twitterbot', 'slackbot',
    'telegrambot', 'linkedinbot', 'discordbot', 'applebot',
    'googlebot', 'bingbot', 'embedly', 'outbrain', 'pinterest',
  ]
  const lower = ua.toLowerCase()
  return bots.some(b => lower.includes(b))
}

function ogHtml(code: string, projectName: string, siteUrl: string): string {
  const safeCode = escapeHtml(code)
  const safeSiteUrl = escapeHtml(siteUrl)
  const safeProjectName = escapeHtml(projectName)
  const title = safeProjectName
    ? `Zaagstaat — ${safeProjectName}`
    : `Zaagstaat — Project ${safeCode}`
  const description = 'Bekijk dit zaagproject op Zaagstaat, de gratis zaaglijst-optimalisator.'
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${safeSiteUrl}/${safeCode}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Zaagstaat">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta http-equiv="refresh" content="0;url=${safeSiteUrl}/${safeCode}">
</head>
<body>
  <p><a href="${safeSiteUrl}/${safeCode}">Open ${title}</a></p>
</body>
</html>`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? '*'
    const headers = cors(origin)
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    // ── API routes (/project/:code) ──────────────────────────────────────────
    const apiMatch = url.pathname.match(/^\/project\/([A-Z0-9]{5})$/i)
    if (apiMatch) {
      const code = apiMatch[1].toUpperCase()

      // Reject cross-origin browser calls outright. Doesn't stop non-browser
      // clients (curl etc. don't send Origin), but it closes the "any website's
      // JS can call this API from a visitor's browser" drive-by vector.
      const requestOrigin = request.headers.get('Origin')
      if (requestOrigin && env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== '*' && requestOrigin !== env.ALLOWED_ORIGIN) {
        return new Response('Verboden', { status: 403, headers })
      }

      if (!CODE_RE.test(code)) {
        return new Response('Ongeldige code', { status: 400, headers })
      }

      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'

      if (request.method === 'GET') {
        if (!(await checkRateLimit(env, ip, 'GET'))) {
          return new Response(
            JSON.stringify({ error: 'Te veel verzoeken, probeer later opnieuw.' }),
            { status: 429, headers: { ...headers, 'Content-Type': 'application/json' } },
          )
        }
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

      if (request.method === 'PUT') {
        if (!(await checkRateLimit(env, ip, 'PUT'))) {
          return new Response(
            JSON.stringify({ error: 'Te veel verzoeken, probeer later opnieuw.' }),
            { status: 429, headers: { ...headers, 'Content-Type': 'application/json' } },
          )
        }
        const body = await readLimitedText(request, MAX_BODY_BYTES)
        if (body === null) return new Response('Project te groot', { status: 413, headers })
        let data: unknown
        try { data = JSON.parse(body) } catch {
          return new Response('Ongeldige JSON', { status: 400, headers })
        }
        const validation = validateProject(data)
        if (!validation.valid || (data as { sessionCode?: unknown }).sessionCode !== code) {
          return new Response(
            JSON.stringify({ error: validation.error ?? 'Projectcode komt niet overeen.' }),
            { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } },
          )
        }
        const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString()
        const storedProject = { ...sanitizeProject(data as Record<string, unknown>), expiresAt }
        await env.PROJECTS.put(code, JSON.stringify(storedProject), { expirationTtl: TTL_SECONDS })
        return new Response(JSON.stringify({ ok: true, expiresAt }), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }

      return new Response('Method not allowed', { status: 405, headers })
    }

    // ── OG proxy / SPA proxy ─────────────────────────────────────────────────
    // Only active when HETZNER_ORIGIN is configured (domain routes through CF)
    if (!env.HETZNER_ORIGIN) {
      return new Response('Not found', { status: 404, headers: securityHeaders() })
    }

    const ua = request.headers.get('User-Agent') ?? ''
    const siteUrl = `https://${url.hostname}`

    // Check if this looks like a session code path (e.g. /ATEFJ)
    const codePathMatch = url.pathname.match(/^\/([ACDEFGHJKLMNPQRTUVWXY3467]{5})$/i)

    if (codePathMatch && isCrawler(ua)) {
      // Bot requesting a code URL → serve OG HTML with project name
      const code = codePathMatch[1].toUpperCase()
      let projectName = ''
      try {
        const raw = await env.PROJECTS.get(code)
        if (raw) {
          const data = JSON.parse(raw) as { projectName?: string }
          projectName = data.projectName ?? ''
        }
      } catch { /* ignore */ }

      return new Response(ogHtml(code, projectName, siteUrl), {
        status: 200,
        headers: { ...securityHeaders(), 'Content-Type': 'text/html; charset=UTF-8' },
      })
    }

    // Regular browser request → proxy to Hetzner
    const proxyUrl = env.HETZNER_ORIGIN + url.pathname + url.search
    try {
      const proxyHeaders = new Headers(request.headers)
      proxyHeaders.delete('Host')
      // Always strip first — otherwise a client-supplied header would pass
      // through untouched whenever ORIGIN_SECRET isn't configured.
      proxyHeaders.delete('X-Origin-Verify')
      if (env.ORIGIN_SECRET) proxyHeaders.set('X-Origin-Verify', env.ORIGIN_SECRET)
      const proxyRes = await fetch(proxyUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      })
      const responseHeaders = new Headers(proxyRes.headers)
      for (const [name, value] of Object.entries(securityHeaders())) responseHeaders.set(name, value)
      responseHeaders.delete('Server')
      return new Response(proxyRes.body, {
        status: proxyRes.status,
        headers: responseHeaders,
      })
    } catch {
      return new Response('Proxy error', { status: 502, headers: securityHeaders() })
    }
  },
}
