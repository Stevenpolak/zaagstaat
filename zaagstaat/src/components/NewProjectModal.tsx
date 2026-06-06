import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'

interface Props {
  onDone: () => void
}

export function NewProjectModal({ onDone }: Props) {
  const { sessionCode, updateProjectName } = useProjectStore()
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)

  function handleStart() {
    if (!name.trim()) return
    updateProjectName(name.trim())
    onDone()
  }

  function copyCode() {
    navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">

        {/* Code display — prominent */}
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Jouw projectcode</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-4xl font-bold tracking-[0.2em] text-blue-700">
              {sessionCode}
            </span>
            <button
              onClick={copyCode}
              title="Kopieer code"
              className="text-blue-300 hover:text-blue-600 transition-colors text-lg"
            >
              {copied ? '✓' : '⧉'}
            </button>
          </div>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            ⚠ Schrijf deze code op of bewaar hem.<br />
            Hiermee laad je dit project terug op elk apparaat.
          </div>
        </div>

        {/* Project name input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Geef je project een naam
          </label>
          <input
            autoFocus
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="bijv. Kast woonkamer"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && handleStart()}
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Project starten
        </button>
      </div>
    </div>
  )
}
