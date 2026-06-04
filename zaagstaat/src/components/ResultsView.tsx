import { useProjectStore } from '../store/useProjectStore'
import { SheetDiagram, COLORS } from './SheetDiagram'
import { formatExpiry } from '../lib/session'

export function ResultsView() {
  const { lastResult, stockPanels, parts, settings, sessionCode, expiresAt } = useProjectStore()

  if (!lastResult) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Voer platen en onderdelen in en klik <strong className="ml-1">Berekenen</strong>.
      </div>
    )
  }

  const { placements, sheetsUsed, sheetsUsedPerStock, wastePercent, wasteArea, usedArea, unplacedPartIds } = lastResult

  // Stable color map per part id
  const partColorMap: Record<string, string> = {}
  parts.forEach((p, i) => { partColorMap[p.id] = COLORS[i % COLORS.length] })

  return (
    <div className="p-4 md:p-6 space-y-8">

      {/* ── Summary bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Platen gebruikt"  value={sheetsUsed.length.toString()} />
        <Stat label="Benutting"        value={`${100 - wastePercent}%`} />
        <Stat label="Uitval"           value={`${(wasteArea / 1e6).toFixed(2)} m²`}
          color={wastePercent > 30 ? 'text-orange-600' : undefined} />
        <Stat label="Gebruikt"         value={`${(usedArea / 1e6).toFixed(2)} m²`} />
      </div>

      {/* Sheets per stock */}
      <div className="flex flex-wrap gap-2 -mt-4">
        {Object.entries(sheetsUsedPerStock).map(([label, count]) => (
          <span key={label} className="bg-blue-50 text-blue-700 rounded-full px-3 py-0.5 text-xs font-medium">
            {label}: {count} {count === 1 ? 'plaat' : 'platen'}
          </span>
        ))}
      </div>

      {/* Unplaced warnings */}
      {unplacedPartIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm font-semibold mb-1">Onderdelen die niet passen:</p>
          <ul className="text-red-600 text-sm list-disc list-inside">
            {unplacedPartIds.map(id => {
              const p = parts.find(p => p.id === id)
              return <li key={id}>{p?.label ?? id}</li>
            })}
          </ul>
        </div>
      )}

      {/* ── Per-sheet sections ───────────────────────────────────────────── */}
      {sheetsUsed.map((sheet, idx) => {
        const stock = stockPanels.find(s => s.id === sheet.stockPanelId)
        if (!stock) return null

        const sheetPlacements = placements.filter(p => p.sheetIndex === idx)

        return (
          <section key={idx} className="break-inside-avoid">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">
              {stock.label} — plaat {sheet.sheetNumber}
            </h2>

            {/* Diagram + table side by side */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">

              {/* SVG diagram — takes up ~55% on wide screens */}
              <div className="w-full lg:w-[55%] flex-shrink-0">
                <SheetDiagram
                  sheetIdx={idx}
                  sheet={sheet}
                  stock={stock}
                  placements={placements}
                  parts={parts}
                  settings={settings}
                  partColorMap={partColorMap}
                />
              </div>

              {/* Per-sheet cut table */}
              <div className="w-full lg:flex-1 overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Onderdeel</th>
                      <th className="px-3 py-2 font-medium">Netto</th>
                      {settings.brutomaten &&
                        <th className="px-3 py-2 font-medium">Bruto</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPlacements.map((pl, i) => {
                      const part = parts.find(p => p.id === pl.partId)
                      const color = partColorMap[pl.partId] ?? COLORS[i % COLORS.length]
                      const netW = part ? (pl.rotated ? part.height : part.width)  : pl.width
                      const netH = part ? (pl.rotated ? part.width  : part.height) : pl.height
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2">
                            {/* color swatch */}
                            <span
                              className="inline-block w-3 h-3 rounded-sm mr-1 align-middle"
                              style={{ background: color, opacity: 0.8 }}
                            />
                            <span className="text-slate-400 text-xs">{i + 1}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{part?.label ?? '?'}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{netW}×{netH}</td>
                          {settings.brutomaten && (
                            <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                              {pl.width}×{pl.height}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )
      })}

      {/* PDF footer — only in print */}
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
