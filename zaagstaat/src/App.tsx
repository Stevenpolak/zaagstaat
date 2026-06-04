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
            disabled={calculating || parts.length === 0 || stockPanels.length === 0}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {calculating ? 'Berekenen...' : 'Berekenen'}
          </button>

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
