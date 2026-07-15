import { afterEach, describe, expect, it, vi } from 'vitest'
import { useProjectStore } from './useProjectStore'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  useProjectStore.getState().startNew()
})

describe('autosave', () => {
  it('shows success and adopts the expiration date returned by the server', async () => {
    vi.useFakeTimers()
    const expiresAt = '2027-01-01T00:00:00.000Z'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true, expiresAt }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))

    useProjectStore.getState().updateProjectName('Klasproject')
    expect(useProjectStore.getState().saveStatus).toBe('pending')

    await vi.advanceTimersByTimeAsync(2_000)

    expect(useProjectStore.getState().saveStatus).toBe('saved')
    expect(useProjectStore.getState().expiresAt).toBe(expiresAt)
  })

  it('exposes failed saves and allows a retry', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ ok: true, expiresAt: '2027-01-01T00:00:00.000Z' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ))
    vi.stubGlobal('fetch', fetchMock)

    useProjectStore.getState().updateProjectName('Klasproject')
    await vi.advanceTimersByTimeAsync(2_000)
    expect(useProjectStore.getState().saveStatus).toBe('error')

    useProjectStore.getState().scheduleSave()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(useProjectStore.getState().saveStatus).toBe('saved')
  })
})
