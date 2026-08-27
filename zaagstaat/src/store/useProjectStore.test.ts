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

  it('persists both nesting directions', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true, expiresAt: '2027-01-01T00:00:00.000Z' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const emptyResult = {
      placements: [], sheetsUsed: [], sheetsUsedPerStock: {}, totalArea: 0,
      usedArea: 0, wasteArea: 0, wastePercent: 0, unplacedPartIds: [], cutLines: [],
    }

    useProjectStore.getState().setResults([emptyResult, { ...emptyResult }])
    await vi.advanceTimersByTimeAsync(2_000)

    const request = fetchMock.mock.calls[0][1] as RequestInit
    const saved = JSON.parse(request.body as string) as { allResults: unknown[]; activeResultIndex: number }
    expect(saved.allResults).toHaveLength(2)
    expect(saved.activeResultIndex).toBe(0)
  })
})

describe('loading saved results', () => {
  it('keeps both nesting directions after a reload', () => {
    const current = useProjectStore.getState()
    const emptyResult = {
      placements: [], sheetsUsed: [], sheetsUsedPerStock: {}, totalArea: 0,
      usedArea: 0, wasteArea: 0, wastePercent: 0, unplacedPartIds: [], cutLines: [],
    }

    current.loadFromRemote({
      sessionCode: current.sessionCode,
      expiresAt: current.expiresAt,
      projectName: 'Test',
      stockPanels: [],
      parts: [],
      settings: current.settings,
      lastResult: emptyResult,
      allResults: [emptyResult, { ...emptyResult }],
      activeResultIndex: 1,
    })

    expect(useProjectStore.getState().allResults).toHaveLength(2)
    expect(useProjectStore.getState().activeResultIndex).toBe(1)
  })
})
