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
}

const TTL_SECONDS = 90 * 24 * 60 * 60

const CODE_RE = /^[ACDEFGHJKLMNPQRTUVWXY3467]{5}$/

function cors(origin: string) {
  return {
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
  const title = projectName
    ? `Zaagstaat — ${projectName}`
    : `Zaagstaat — Project ${code}`
  const description = 'Bekijk dit zaagproject op Zaagstaat, de gratis zaaglijst-optimalisator.'
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${siteUrl}/${code}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Zaagstaat">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta http-equiv="refresh" content="0;url=${siteUrl}/${code}">
</head>
<body>
  <p><a href="${siteUrl}/${code}">Open ${title}</a></p>
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

      if (!CODE_RE.test(code)) {
        return new Response('Ongeldige code', { status: 400, headers })
      }

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

      if (request.method === 'PUT') {
        const body = await request.text()
        if (body.length > 256_000) return new Response('Project te groot', { status: 413, headers })
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
    }

    // ── OG proxy / SPA proxy ─────────────────────────────────────────────────
    // Only active when HETZNER_ORIGIN is configured (domain routes through CF)
    if (!env.HETZNER_ORIGIN) {
      return new Response('Not found', { status: 404 })
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
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      })
    }

    // Regular browser request → proxy to Hetzner
    const proxyUrl = env.HETZNER_ORIGIN + url.pathname + url.search
    try {
      const proxyRes = await fetch(proxyUrl, {
        method: request.method,
        headers: { 'Host': url.hostname },
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      })
      return new Response(proxyRes.body, {
        status: proxyRes.status,
        headers: proxyRes.headers,
      })
    } catch {
      return new Response('Proxy error', { status: 502 })
    }
  },
}
