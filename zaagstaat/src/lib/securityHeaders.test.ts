import { describe, expect, it } from 'vitest'
import { CONTENT_SECURITY_POLICY, securityHeaders } from '../../shared/securityHeaders'

describe('security headers', () => {
  it('blocks framing and MIME sniffing', () => {
    const headers = securityHeaders()
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'")
  })

  it('allows only the external services used by the app', () => {
    expect(CONTENT_SECURITY_POLICY).toContain('https://fonts.googleapis.com')
    expect(CONTENT_SECURITY_POLICY).toContain('https://*.workers.dev')
    expect(CONTENT_SECURITY_POLICY).not.toContain("script-src 'self' 'unsafe-inline'")
  })
})
