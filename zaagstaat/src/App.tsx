import { useState, useRef, useEffect } from 'react'
import { SessionGate } from './components/SessionGate'
import { Header } from './components/Header'
import { StockTable } from './components/StockTable'
import { PartsTable } from './components/PartsTable'
import { SettingsPanel } from './components/SettingsPanel'
import { ResultsView } from './components/ResultsView'
import { ConfiguratorPanel } from './components/ConfiguratorPanel'
import { useProjectStore } from './store/useProjectStore'
import { loadProject } from './lib/session'
import type { OptimizationResult, Project } from './lib/types'

// Valid session code: 5 chars from our unambiguous alphabet
const CODE_RE = /^[ACDEFGHJKLMNPQRTUVWXY3467]{5}$/i

function codeFromUrl(): string | null {
  const seg = window.location.pathname.replace(/^\//, '').toUpperCase()
  return CODE_RE.test(seg) ? seg : null
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [slideOpen, setSlideOpen] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoLoadError, setAutoLoadError] = useState('')
  const { parts, stockPanels, settings, lastResult, setResult, startNew, loadFromRemote, sessionCode } = useProjectStore()
  const workerRef = useRef<Worker | null>(null)

  // ── Auto-load from URL on first mount ─────────────────────────────────────
  useEffect(() => {
    const code = codeFromUrl()
    if (!code) return
    setAutoLoading(true)
    loadProject(code)
      .then(data => {
        loadFromRemote(data as Project)
        setReady(true)
      })
      .catch(err => {
        setAutoLoadError(err instanceof Error ? err.message : 'Laden mislukt.')
        // Clear the bad code from URL so the gate shows cleanly
        window.history.replaceState(null, '', '/')
      })
      .finally(() => setAutoLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep URL in sync with active session code ──────────────────────────────
  useEffect(() => {
    if (!ready) return
    const current = window.location.pathname.replace(/^\//, '').toUpperCase()
    if (current !== sessionCode) {
      window.history.replaceState(null, '', `/${sessionCode}`)
    }
  }, [ready, sessionCode])

  // Validation
  const stockValid = stockPanels.length > 0 &&
    stockPanels.every(s => s.label.trim() && s.width > 0 && s.height > 0)
  const partsValid = parts.length > 0 &&
    parts.every(p => p.label.trim() && p.width > 0 && p.height > 0 && p.qty > 0)
  const canCalculate = !calculating && stockValid && partsValid
  const validationMessage = !stockValid
    ? 'Voeg minstens één geldige plaat toe (label + afmetingen).'
    : !partsValid
    ? 'Vul alle onderdelen volledig in (label, lengte, breedte, aantal).'
    : null

  function handleNewProject() {
    startNew()
    setReady(false)
    setSlideOpen(false)
    window.history.replaceState(null, '', '/')
  }

  function handleSessionDone() {
    setReady(true)
    // URL will sync via the useEffect above
  }

  function calculate() {
    if (workerRef.current) workerRef.current.terminate()
    setCalculating(true)
    const worker = new Worker(
      new URL('./workers/optimizer.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<OptimizationResult>) => {
      setResult(e.data)
      setCalculating(false)
      worker.terminate()
    }
    worker.onerror = () => {
      setCalculating(false)
      worker.terminate()
    }
    worker.postMessage({ parts, stockPanels, settings })
  }

  // ── Auto-loading splash ────────────────────────────────────────────────────
  if (autoLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-3xl font-mono font-bold text-blue-700 tracking-widest">
            {codeFromUrl()}
          </div>
          <p className="text-slate-500 text-sm">Project laden…</p>
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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header onNewProject={handleNewProject} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-10">
            <StockTable />
            <PartsTable />
            <SettingsPanel />
            <div className="space-y-2 pb-8">
              <button
                onClick={calculate}
                disabled={!canCalculate}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-lg transition-colors"
              >
                {calculating ? 'Berekenen...' : 'Berekenen'}
              </button>
              {validationMessage && (
                <p className="text-xs text-orange-600 text-center">{validationMessage}</p>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Full-screen results ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onNewProject={handleNewProject} />

      <div className="no-print bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3">
        <button
          onClick={() => setSlideOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-700 transition-colors"
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
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="6" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 6V3h6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="5" y="9" width="6" height="2" rx="0.5" fill="currentColor" opacity="0.4"/>
          </svg>
          Afdrukken
        </button>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <ResultsView />
        </div>
      </main>

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
