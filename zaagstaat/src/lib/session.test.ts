import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadProject, saveProject } from './session'

const validProject = {
  sessionCode: 'ACDEF',
  expiresAt: '2026-10-13T12:00:00.000Z',
  projectName: 'Lesproject',
  stockPanels: [],
  parts: [],
  settings: {
    kerf: 4,
    schoonzagen: true,
    schoonzagenMaat: 5,
    brutomaten: true,
    overmaat: 5,
    optimizationGoal: 'minimize-waste',
  },
  lastResult: null,
}

afterEach(() => vi.unstubAllGlobals())

describe('project API client', () => {
  it('uses the server-provided expiration date after saving', async () => {
    const expiresAt = '2026-12-01T10:00:00.000Z'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true, expiresAt }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(saveProject('ACDEF', validProject)).resolves.toBe(expiresAt)
  })

  it('rejects malformed projects returned by the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ...validProject, parts: 'corrupt' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(loadProject('ACDEF')).rejects.toThrow('Projectgegevens zijn ongeldig')
  })
})
