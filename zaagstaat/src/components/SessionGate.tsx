import { useState } from 'react'
import { loadProject } from '../lib/session'
import { useProjectStore } from '../store/useProjectStore'
import type { Project } from '../lib/types'

interface Props {
  onDone: () => void
  initialError?: string
}

export function SessionGate({ onDone, initialError = '' }: Props) {
  const startNew = useProjectStore(s => s.startNew)
  const loadFromRemote = useProjectStore(s => s.loadFromRemote)
  const [code, setCode] = useState('')
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)

  function handleNew() {
    startNew()
    onDone()
  }

  async function handleLoad() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 5) { setError('Voer een geldige 5-letterige code in.'); return }
    setLoading(true)
    setError('')
    try {
      const data = await loadProject(trimmed)
      loadFromRemote(data as Project)
      // Push the code into the URL so it's bookmarkable
      window.history.pushState(null, '', `/${trimmed}`)
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Zaagstaat</h1>
        <p className="text-slate-500 mb-8 text-sm">Optimaliseer het gebruik van jouw plaatmateriaal</p>

        <button
          onClick={handleNew}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl mb-6 transition-colors"
        >
          Nieuw project
        </button>

        <div className="relative flex items-center mb-4">
          <div className="flex-grow border-t border-slate-200" />
          <span className="mx-3 text-slate-400 text-sm">of laad bestaand project</span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-center tracking-widest uppercase font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ATEFJ"
            maxLength={5}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleLoad()}
          />
          <button
            onClick={handleLoad}
            disabled={loading}
            className="bg-slate-700 hover:bg-slate-800 text-white font-semibold px-5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? '…' : 'Laden'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    </div>
  )
}
