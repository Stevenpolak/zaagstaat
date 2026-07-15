import { useState, useRef, useEffect } from 'react'
import { SessionGate } from './components/SessionGate'
import { Header } from './components/Header'
import { StockTable } from './components/StockTable'
import { PartsTable } from './components/PartsTable'
import { SettingsPanel } from './components/SettingsPanel'
import { ResultsView } from './components/ResultsView'
import { ConfiguratorPanel } from './components/ConfiguratorPanel'
import { NewProjectModal } from './components/NewProjectModal'
import { AppFooter } from './components/AppFooter'
import { useProjectStore } from './store/useProjectStore'
import { loadProject } from './lib/session'
import type { OptimizationResult } from './lib/types'

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

// Valid session code: 5 chars from our unambiguous alphabet
const CODE_RE = /^[ACDEFGHJKLMNPQRTUVWXY3467]{5}$/i

function updateOgUrl(url: string) {
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', url)
}

function updateTitle(projectName: string | null, sessionCode: string | null) {
  const suffix = projectName || (sessionCode ? `Project ${sessionCode}` : 'Nieuw project')
  document.title = `Zaagstaat | ${suffix}`
}

function codeFromUrl(): string | null {
  const seg = window.location.pathname.replace(/^\//, '').toUpperCase()
  return CODE_RE.test(seg) ? seg : null
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [slideOpen, setSlideOpen] = useState(false)
  const [autoLoading, setAutoLoading] = useState(() => codeFromUrl() !== null)
  const [autoLoadError, setAutoLoadError] = useState('')
  const { parts, stockPanels, settings, lastResult, setResults, startNew, loadFromRemote, sessionCode, projectName } = useProjectStore()
  const workerRef = useRef<Worker | null>(null)

  // ── Auto-load from URL on first mount ─────────────────────────────────────
  useEffect(() => {
    const code = codeFromUrl()
    if (!code) return
    loadProject(code)
      .then(data => {
        loadFromRemote(data)
        setReady(true)  // loaded project — no name modal
      })
      .catch(err => {
        setAutoLoadError(err instanceof Error ? err.message : 'Laden mislukt.')
        // Clear the bad code from URL so the gate shows cleanly
        window.history.replaceState(null, '', '/')
        updateOgUrl(window.location.href)
      })
      .finally(() => setAutoLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep tab title in sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) {
      document.title = 'Zaagstaat'
      return
    }
    updateTitle(projectName ?? null, sessionCode ?? null)
  }, [ready, projectName, sessionCode])

  // ── Keep URL in sync with active session code ──────────────────────────────
  useEffect(() => {
    if (!ready) return
    const current = window.location.pathname.replace(/^\//, '').toUpperCase()
    if (current !== sessionCode) {
      window.history.replaceState(null, '', `/${sessionCode}`)
      updateOgUrl(window.location.href)
    }
  }, [ready, sessionCode])

  // Draft = brand new row, nothing entered yet (both dimensions still zero)
  // Active = user has started filling in → must be fully valid to calculate
  const activeStock = stockPanels.filter(s => s.width > 0 || s.height > 0)
  const activeParts = parts.filter(p => p.width > 0 || p.height > 0)

  // All active rows must be complete
  const stockValid = activeStock.length > 0 &&
    activeStock.every(s => s.width > 0 && s.height > 0)
  const partsValid = activeParts.length > 0 &&
    activeParts.every(p => p.width > 0 && p.height > 0 && p.qty > 0)

  // Only send complete rows to the worker, with auto-labels
  const labeledStock = activeStock
    .filter(s => s.width > 0 && s.height > 0)
    .map((s, i) => ({ ...s, label: s.label.trim() || `Plaat ${i + 1}` }))
  const labeledParts = activeParts
    .filter(p => p.width > 0 && p.height > 0 && p.qty > 0)
    .map((p, i) => ({ ...p, label: p.label.trim() || `Onderdeel ${i + 1}` }))

  const canCalculate = !calculating && stockValid && partsValid
  const validationMessage = !stockValid
    ? activeStock.length === 0
      ? 'Voeg minstens één plaat toe met afmetingen.'
      : 'Vul de afmetingen in van alle platen.'
    : !partsValid
    ? activeParts.length === 0
      ? 'Voeg minstens één onderdeel toe met afmetingen en aantal.'
      : 'Vul alle velden in van elk onderdeel (lengte, breedte, aantal).'
    : null

  function handleNewProject() {
    startNew()
    setReady(false)
    setSlideOpen(false)
    setShowNameModal(false)
    window.history.replaceState(null, '', '/')
    updateOgUrl(window.location.href)
  }

  function handleSessionDone(isNew = false) {
    if (isNew) {
      setShowNameModal(true)
    }
    setReady(true)
  }

  function calculate() {
    if (workerRef.current) workerRef.current.terminate()
    setCalculating(true)
    const worker = new Worker(
      new URL('./workers/optimizer.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<{ results: OptimizationResult[] }>) => {
      setResults(e.data.results)
      setCalculating(false)
      worker.terminate()
    }
    worker.onerror = () => {
      setCalculating(false)
      worker.terminate()
    }
    worker.postMessage({ parts: labeledParts, stockPanels: labeledStock, settings })
  }

  // ── Name modal (overlays everything after new project) ────────────────────
  if (showNameModal) {
    return <NewProjectModal onDone={() => setShowNameModal(false)} />
  }

  // ── Auto-loading splash ────────────────────────────────────────────────────
  if (autoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper-deep)' }}>
        <div className="text-center space-y-3">
          <div className="text-3xl font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {codeFromUrl()}
          </div>
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Project laden…</p>
        </div>
      </div>
    )
  }

  // ── Session gate ───────────────────────────────────────────────────────────
  if (!ready) {
    return <SessionGate onDone={handleSessionDone} initialError={autoLoadError} />
  }

  // ── Full-screen input (no results yet) ────────────────────────────────────
  if (!lastResult) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper-deep)' }}>
        <Header onNewProject={handleNewProject} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="rounded-[20px] border p-6 md:p-8 space-y-10"
              style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-card)' }}>
              <StockTable />
              <PartsTable />
              <SettingsPanel />
              <div className="space-y-2 pb-2">
                <button
                  onClick={calculate}
                  disabled={!canCalculate}
                  className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-colors"
                  style={{ background: 'var(--accent)' }}
                  onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--accent-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                >
                  {calculating ? 'Berekenen...' : 'Berekenen'}
                </button>
                {validationMessage && (
                  <p className="text-xs text-center" style={{ color: 'var(--warn)' }}>{validationMessage}</p>
                )}
              </div>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  // ── Full-screen results ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper-deep)' }}>
      <Header onNewProject={handleNewProject} />

      <div className="no-print border-b px-4 py-2 flex items-center gap-3" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <button
          onClick={() => setSlideOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: 'var(--ink)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Invoer bewerken
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="hidden sm:flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--ink-faint)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="6" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 6V3h6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="5" y="9" width="6" height="2" rx="0.5" fill="currentColor" opacity="0.4"/>
          </svg>
          Afdrukken
        </button>
        {canShare && (
          <button
            onClick={() => navigator.share({ title: `Zaagstaat — ${projectName || sessionCode}`, text: 'Bekijk mijn zaagproject', url: window.location.href })}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--ink-faint)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 9v4h8V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Delen
          </button>
        )}
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <ResultsView />
        </div>
      </main>

      <AppFooter />

      <ConfiguratorPanel
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        canCalculate={canCalculate}
        calculating={calculating}
        validationMessage={validationMessage}
        onCalculate={calculate}
      />
    </div>
  )
}
