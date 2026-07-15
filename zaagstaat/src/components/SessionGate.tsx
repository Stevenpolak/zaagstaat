import { useState } from 'react'
import { loadProject } from '../lib/session'
import { useProjectStore } from '../store/useProjectStore'

interface Props {
  onDone: (isNew?: boolean) => void
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
    onDone(true)
  }

  async function handleLoad() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 5) { setError('Voer een geldige 5-letterige code in.'); return }
    setLoading(true)
    setError('')
    try {
      const data = await loadProject(trimmed)
      loadFromRemote(data)
      window.history.pushState(null, '', `/${trimmed}`)
      onDone(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--paper-warm)' }}>
      <div className="w-full max-w-md rounded-[20px] border p-10"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-popup)' }}>

        <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
          een gereedschap van Studio Kroos
        </p>
        <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1 }}>
          Zaagstaat
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          Optimaliseer het gebruik van jouw plaatmateriaal.
        </p>

        <button
          onClick={handleNew}
          className="w-full font-bold py-3.5 rounded-xl mb-6 transition-colors text-white text-sm"
          style={{ background: 'var(--ink)' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2E2A26')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}
        >
          Nieuw project
        </button>

        <div className="relative flex items-center mb-5">
          <div className="flex-grow border-t" style={{ borderColor: 'var(--line)' }} />
          <span className="mx-3 text-xs" style={{ color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>of laad bestaand project</span>
          <div className="flex-grow border-t" style={{ borderColor: 'var(--line)' }} />
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-xl px-4 py-2.5 text-center uppercase text-lg focus:outline-none focus:ring-2"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.32em',
              background: 'var(--field)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
            placeholder="ATEFJ"
            maxLength={5}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleLoad()}
          />
          <button
            onClick={handleLoad}
            disabled={loading}
            className="font-semibold px-5 rounded-xl transition-colors border disabled:opacity-50 text-sm"
            style={{ borderColor: 'var(--line-strong)', color: 'var(--ink)', background: 'transparent' }}
          >
            {loading ? '…' : 'Laden'}
          </button>
        </div>
        {error && <p className="text-sm mt-2" style={{ color: 'var(--error)' }}>{error}</p>}
      </div>
    </div>
  )
}
