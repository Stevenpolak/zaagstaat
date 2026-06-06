import { useState } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import { formatExpiry } from '../lib/session'

export function Header({ onNewProject }: { onNewProject: () => void }) {
  const { sessionCode, expiresAt, projectName } = useProjectStore()
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="no-print bg-blue-800 text-white px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-xl font-bold tracking-tight flex-shrink-0">Zaagstaat</h1>
        {projectName && (
          <span className="text-blue-200 text-sm truncate hidden sm:block">— {projectName}</span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-blue-900/60 rounded-lg px-3 py-1.5">
          <span className="text-blue-200 text-xs hidden sm:block">Code:</span>
          <span className="font-mono font-bold tracking-widest text-white text-sm">{sessionCode}</span>
          <button
            onClick={copyCode}
            title="Kopieer code"
            className="text-blue-200 hover:text-white transition-colors text-xs ml-1"
          >
            {copied ? '✓' : '⧉'}
          </button>
        </div>
        <span className="text-blue-200 text-xs hidden md:block">
          Geldig tot {formatExpiry(expiresAt)}
        </span>
        <button
          onClick={onNewProject}
          className="text-blue-200 hover:text-white text-xs underline underline-offset-2 transition-colors"
        >
          Nieuw
        </button>
      </div>
    </header>
  )
}
