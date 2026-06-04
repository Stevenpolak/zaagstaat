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
        className={`fixed top-0 left-0 h-full w-full max-w-[90vw] bg-white shadow-2xl z-30 flex flex-col
          transform transition-transform duration-300 ease-in-out no-print ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <h2 className="font-semibold text-slate-800">Invoer bewerken</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none px-1"
            title="Sluiten"
          >✕</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          <StockTable />
          <PartsTable />
          <SettingsPanel />
        </div>

        {/* Sticky footer with actions */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4 space-y-2 bg-white">
          <button
            onClick={() => { onCalculate(); onClose() }}
            disabled={!canCalculate}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {calculating ? 'Berekenen...' : 'Berekenen'}
          </button>
          {validationMessage && (
            <p className="text-xs text-orange-600 text-center">{validationMessage}</p>
          )}
        </div>
      </div>
    </>
  )
}
