import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { formatExpiry } from '../lib/session'

export function Header({ onNewProject }: { onNewProject: () => void }) {
  const { sessionCode, expiresAt, projectName, saveStatus, saveError, scheduleSave } = useProjectStore()
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="no-print px-4 py-3 flex items-center justify-between gap-4 border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-extrabold tracking-tight flex-shrink-0" style={{ color: 'var(--ink)', letterSpacing: '-0.015em' }}>
          Zaagstaat
        </h1>
        {projectName && (
          <>
            <span className="hidden sm:block w-px h-4" style={{ background: 'var(--line-strong)' }} />
            <span className="text-sm truncate hidden sm:block" style={{ color: 'var(--ink-soft)' }}>{projectName}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {saveStatus !== 'idle' && (
          <button
            type="button"
            onClick={() => saveStatus === 'error' && scheduleSave()}
            title={saveStatus === 'error' ? `${saveError ?? 'Opslaan mislukt.'} Klik om opnieuw te proberen.` : undefined}
            className="text-xs hidden sm:block"
            style={{ color: saveStatus === 'error' ? 'var(--error)' : 'var(--ink-faint)' }}
          >
            {saveStatus === 'pending' && 'Wijzigingen…'}
            {saveStatus === 'saving' && 'Opslaan…'}
            {saveStatus === 'saved' && 'Opgeslagen ✓'}
            {saveStatus === 'error' && 'Opslaan mislukt — opnieuw proberen'}
          </button>
        )}
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5"
          style={{ background: 'var(--paper-warm)', borderColor: 'var(--line)' }}>
          <span className="text-xs hidden sm:block" style={{ color: 'var(--ink-faint)' }}>Code</span>
          <span className="font-bold tracking-widest text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', letterSpacing: '0.16em' }}>
            {sessionCode}
          </span>
          <button
            onClick={copyCode}
            title="Kopieer code"
            className="ml-1 transition-colors text-xs"
            style={{ color: 'var(--ink-faint)' }}
          >
            {copied ? '✓' : '⧉'}
          </button>
        </div>
        <span className="text-xs hidden md:block" style={{ color: 'var(--ink-faint)' }}>
          Geldig tot {formatExpiry(expiresAt)}
        </span>
        <button
          onClick={onNewProject}
          className="text-xs underline underline-offset-2 transition-colors"
          style={{ color: 'var(--accent)', borderBottom: '1px solid var(--accent)', textDecoration: 'none', paddingBottom: '1px' }}
        >
          Nieuw
        </button>
      </div>
    </header>
  )
}
