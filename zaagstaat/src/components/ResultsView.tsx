import { useProjectStore } from '../store/useProjectStore'
import { SheetDiagram, COLORS } from './SheetDiagram'
import { formatExpiry } from '../lib/session'

export function ResultsView() {
  const { lastResult, stockPanels, parts, settings, sessionCode, expiresAt } = useProjectStore()

  if (!lastResult) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm p-8 text-center">
        Voer platen en onderdelen in, pas de instellingen aan, en klik <strong className="ml-1">Berekenen</strong>.
      </div>
    )
  }

  const { placements, sheetsUsed, sheetsUsedPerStock, wastePercent, wasteArea, usedArea, unplacedPartIds } = lastResult

  // Build stable color map per part id
  const partColorMap: Record<string, string> = {}
  parts.forEach((p, i) => { partColorMap[p.id] = COLORS[i % COLORS.length] })

  return (
    <div className="p-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Platen gebruikt" value={sheetsUsed.length.toString()} />
        <Stat label="Benutting" value={`${100 - wastePercent}%`} />
        <Stat label="Uitval" value={`${(wasteArea / 1e6).toFixed(2)} m²`} color={wastePercent > 30 ? 'text-orange-600' : undefined} />
        <Stat label="Gebruikt" value={`${(usedArea / 1e6).toFixed(2)} m²`} />
      </div>

      {/* Sheets per stock */}
      <div className="mb-4 text-sm text-slate-600">
        {Object.entries(sheetsUsedPerStock).map(([label, count]) => (
          <span key={label} className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 mr-2 mb-1">
            {label}: {count} {count === 1 ? 'plaat' : 'platen'}
          </span>
        ))}
      </div>

      {/* Unplaced warnings */}
      {unplacedPartIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm font-semibold mb-1">Onderdelen die niet passen:</p>
          <ul className="text-red-600 text-sm list-disc list-inside">
            {unplacedPartIds.map(id => {
              const p = parts.find(p => p.id === id)
              return <li key={id}>{p?.label ?? id}</li>
            })}
          </ul>
        </div>
      )}

      {/* Sheet diagrams */}
      <div className="columns-1 sm:columns-2 gap-4">
        {sheetsUsed.map((sheet, idx) => {
          const stock = stockPanels.find(s => s.id === sheet.stockPanelId)
          if (!stock) return null
          return (
            <SheetDiagram
              key={idx}
              sheetIdx={idx}
              sheet={sheet}
              stock={stock}
              placements={placements}
              parts={parts}
              settings={settings}
              partColorMap={partColorMap}
            />
          )
        })}
      </div>

      {/* Cut list table */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Zaaglijst</h3>
        <table className="w-full text-sm border border-slate-200 rounded overflow-hidden">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Onderdeel</th>
              <th className="px-3 py-2 font-medium">Plaat</th>
              <th className="px-3 py-2 font-medium">Netto</th>
              {settings.brutomaten && <th className="px-3 py-2 font-medium">Bruto (zagen op)</th>}
            </tr>
          </thead>
          <tbody>
            {placements.map((pl, i) => {
              const part = parts.find(p => p.id === pl.partId)
              const sheet = sheetsUsed[pl.sheetIndex]
              const stock = stockPanels.find(s => s.id === pl.stockPanelId)
              const netW = part ? (pl.rotated ? part.height : part.width) : pl.width
              const netH = part ? (pl.rotated ? part.width : part.height) : pl.height
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium">{part?.label ?? '?'}</td>
                  <td className="px-3 py-1.5 text-slate-500">{stock?.label} #{sheet?.sheetNumber}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{netW}×{netH}</td>
                  {settings.brutomaten && (
                    <td className="px-3 py-1.5 font-mono text-xs font-semibold">{pl.width}×{pl.height}</td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* PDF footer (only visible in print) */}
      <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400">
        Code: <strong>{sessionCode}</strong> — geldig tot {formatExpiry(expiresAt)}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${color ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}
