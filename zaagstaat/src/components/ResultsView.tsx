import { useMemo } from 'react'
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

  const { placements, sheetsUsed, sheetsUsedPerStock, wastePercent, wasteArea, usedArea, unplacedPartIds, cutLines } = lastResult

  // Stable color map per part id
  const partColorMap: Record<string, string> = {}
  parts.forEach((p, i) => { partColorMap[p.id] = COLORS[i % COLORS.length] })

  // Timestamp captured once when results are shown
  const printTimestamp = useMemo(() => {
    const now = new Date()
    const datum = now.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const tijd = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    return `${datum} om ${tijd}`
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track global sequence counter (continues across sheets for easy reference)
  let globalSeq = 1

  return (
    <div className="p-4 md:p-6">

      {/* ── Summary bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 print-summary">
        <Stat label="Platen gebruikt"  value={sheetsUsed.length.toString()} />
        <Stat label="Benutting"        value={`${100 - wastePercent}%`} />
        <Stat label="Uitval"           value={`${(wasteArea / 1e6).toFixed(2)} m²`}
          color={wastePercent > 30 ? 'text-orange-600' : undefined} />
        <Stat label="Gebruikt"         value={`${(usedArea / 1e6).toFixed(2)} m²`} />
      </div>

      {/* Sheets per stock */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(sheetsUsedPerStock).map(([label, count]) => (
          <span key={label} className="bg-blue-50 text-blue-700 rounded-full px-3 py-0.5 text-xs font-medium">
            {label}: {count} {count === 1 ? 'plaat' : 'platen'}
          </span>
        ))}
      </div>

      {/* Unplaced warnings */}
      {unplacedPartIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm font-semibold mb-1">⚠ Onderdelen die niet passen:</p>
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
        const sheetStartSeq = globalSeq
        globalSeq += sheetPlacements.length

        return (
          <section
            key={idx}
            className={idx === 0 ? 'mb-10' : 'mb-10 print:break-before-page'}
          >
            {/* Sheet heading */}
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 pb-1 border-b border-slate-200">
              {stock.label} — plaat {sheet.sheetNumber}
              <span className="ml-2 text-slate-400 font-normal normal-case tracking-normal">
                {stock.width} × {stock.height} mm
              </span>
            </h2>

            {/* Diagram + table side by side */}
            <div className="flex flex-col lg:flex-row gap-5 items-start">

              {/* SVG diagram */}
              <div className="w-full lg:w-[58%] flex-shrink-0">
                <SheetDiagram
                  sheetIdx={idx}
                  sheet={sheet}
                  stock={stock}
                  placements={placements}
                  parts={parts}
                  settings={settings}
                  partColorMap={partColorMap}
                  startSeq={sheetStartSeq}
                  cutLines={cutLines}
                  kerf={settings.kerf}
                />
              </div>

              {/* Per-sheet cut table */}
              <div className="w-full lg:flex-1">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-left text-slate-500 text-xs uppercase tracking-wide">
                      <th className="px-3 py-2 font-semibold w-8">#</th>
                      <th className="px-3 py-2 font-semibold">Onderdeel</th>
                      <th className="px-3 py-2 font-semibold">Netto (mm)</th>
                      {settings.brutomaten &&
                        <th className="px-3 py-2 font-semibold">Bruto — zagen op</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPlacements.map((pl, i) => {
                      const part = parts.find(p => p.id === pl.partId)
                      const color = partColorMap[pl.partId] ?? COLORS[i % COLORS.length]
                      const netW = part ? (pl.rotated ? part.height : part.width)  : pl.width
                      const netH = part ? (pl.rotated ? part.width  : part.height) : pl.height
                      const seq = sheetStartSeq + i

                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          {/* Seq badge matching diagram */}
                          <td className="px-3 py-2.5">
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                              style={{ background: color }}
                            >
                              {seq}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{part?.label ?? '?'}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{netW}×{netH}</td>
                          {settings.brutomaten && (
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-sm font-bold text-slate-800">{pl.width}×{pl.height}</span>
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

      {/* PDF footer — only in print, repeated on every page via position */}
      <div className="hidden print:block fixed bottom-4 left-0 right-0 text-center text-xs text-slate-400 border-t border-slate-200 pt-2 bg-white">
        Gegenereerd op {printTimestamp} met behulp van Zaagstaat —
        code: <strong>{sessionCode}</strong>, geldig tot {formatExpiry(expiresAt)}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${color ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}
