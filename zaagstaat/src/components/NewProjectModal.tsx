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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(28,25,22,0.45)' }}>
      <div className="w-full max-w-md rounded-[20px] border p-8 space-y-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-popup)' }}>

        {/* Eyebrow */}
        <p className="text-xs uppercase tracking-[0.18em] text-center" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
          een gereedschap van Studio Kroos — bèta
        </p>

        {/* Code display */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
            Jouw projectcode
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-bold tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {sessionCode}
            </span>
            <button
              onClick={copyCode}
              title="Kopieer code"
              className="transition-colors text-lg"
              style={{ color: 'var(--ink-ghost)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-ghost)')}
            >
              {copied ? '✓' : '⧉'}
            </button>
          </div>
          <div className="mt-3 rounded-xl px-4 py-3 text-sm border"
            style={{ background: 'var(--paper-warm)', borderColor: 'var(--line)', color: 'var(--ink-soft)' }}>
            Schrijf deze code op of bewaar hem.<br />
            Hiermee laad je dit project terug op elk apparaat.<br />
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              Dit is een testversie — functies kunnen nog veranderen.
            </span>
          </div>
        </div>

        {/* Project name input */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            Geef je project een naam
          </label>
          <input
            autoFocus
            className="w-full border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--field)',
              borderColor: 'var(--line)',
              borderRadius: 'var(--r-field)',
              color: 'var(--ink)',
            }}
            placeholder="bijv. Kast woonkamer"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && handleStart()}
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--accent-ink)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          Project starten
        </button>
      </div>
    </div>
  )
}
