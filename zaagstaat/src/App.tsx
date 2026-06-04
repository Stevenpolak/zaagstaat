import { useState, useRef } from 'react'
import { SessionGate } from './components/SessionGate'
import { Header } from './components/Header'
import { StockTable } from './components/StockTable'
import { PartsTable } from './components/PartsTable'
import { SettingsPanel } from './components/SettingsPanel'
import { ResultsView } from './components/ResultsView'
import { useProjectStore } from './store/useProjectStore'
import type { OptimizationResult } from './lib/types'

export default function App() {
  const [ready, setReady] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const { parts, stockPanels, settings, setResult, startNew } = useProjectStore()

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
  const workerRef = useRef<Worker | null>(null)

  function handleNewProject() {
    startNew()
    setReady(false)
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

  if (!ready) {
    return <SessionGate onDone={() => setReady(true)} />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onNewProject={handleNewProject} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — inputs */}
        <aside className="no-print w-full max-w-xs lg:max-w-sm xl:max-w-md bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0 p-4 space-y-8">
          <StockTable />
          <PartsTable />
          <SettingsPanel />

          <button
            onClick={calculate}
            disabled={!canCalculate}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {calculating ? 'Berekenen...' : 'Berekenen'}
          </button>
          {validationMessage && (
            <p className="text-xs text-orange-600 text-center -mt-2">{validationMessage}</p>
          )}

          <button
            onClick={() => window.print()}
            className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium py-2 rounded-xl transition-colors text-sm"
          >
            Afdrukken / PDF opslaan
          </button>
        </aside>

        {/* Main — results */}
        <main className="flex-1 overflow-y-auto">
          <ResultsView />
        </main>
      </div>
    </div>
  )
}
