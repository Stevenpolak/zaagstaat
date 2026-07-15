import { StockTable } from './StockTable'
import { PartsTable } from './PartsTable'
import { SettingsPanel } from './SettingsPanel'

interface Props {
  open: boolean
  onClose: () => void
  canCalculate: boolean
  calculating: boolean
  validationMessage: string | null
  onCalculate: () => void
}

export function ConfiguratorPanel({ open, onClose, canCalculate, calculating, validationMessage, onCalculate }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-20 transition-opacity duration-300 no-print ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:max-w-[90vw] z-30 flex flex-col
          transform transition-transform duration-300 ease-in-out no-print ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--surface)', boxShadow: '0 0 40px rgba(40,33,22,0.18)' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
          style={{ background: 'var(--paper-warm)', borderColor: 'var(--line)' }}>
          <h2 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Invoer bewerken</h2>
          <button
            onClick={onClose}
            className="transition-colors text-xl leading-none px-1"
            style={{ color: 'var(--ink-faint)' }}
            title="Sluiten"
          >✕</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          <StockTable />
          <PartsTable />
          <SettingsPanel />
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t p-4 space-y-2" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <button
            onClick={() => { onCalculate(); onClose() }}
            disabled={!canCalculate}
            className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
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
    </>
  )
}
