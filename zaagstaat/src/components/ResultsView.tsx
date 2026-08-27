import { useMemo } from 'react'
import { useProjectStore, RESULT_LABELS } from '../store/useProjectStore'
import { SheetDiagram } from './SheetDiagram'
import { PART_COLORS } from '../lib/colors'
import { formatExpiry } from '../lib/session'

export function ResultsView() {
  const { lastResult, allResults, activeResultIndex, cycleResult, stockPanels, parts, settings, sessionCode, expiresAt } = useProjectStore()

  const printTimestamp = useMemo(() => {
    const now = new Date()
    const datum = now.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const tijd = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    return `${datum} om ${tijd}`
  }, [])

  if (!lastResult) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--ink-faint)' }}>
        Voer platen en onderdelen in en klik <strong className="ml-1" style={{ color: 'var(--ink-soft)' }}>Berekenen</strong>.
      </div>
    )
  }

  const { placements, sheetsUsed, sheetsUsedPerStock, unplacedPartIds, cutLines } = lastResult

  const partColorMap: Record<string, string> = {}
  parts.forEach((p, i) => { partColorMap[p.id] = PART_COLORS[i % PART_COLORS.length] })

  return (
    <div className="p-4 md:p-6 print:p-0">

      {/* Alternatieve nesting — screen only */}
      {allResults && allResults.length > 1 && (
        <div className="no-print flex items-center gap-3 mb-4">
          <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', letterSpacing: '0.06em' }}>
            Nesting
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{RESULT_LABELS[activeResultIndex]}</span>
          <button
            onClick={cycleResult}
            className="text-xs font-medium border rounded-full px-3 py-1 transition-colors"
            style={{ color: 'var(--accent)', borderColor: 'var(--line-strong)' }}
          >
            Alternatieve nesting →
          </button>
        </div>
      )}

      {/* Sheets used summary — screen only */}
      {sheetsUsed.length > 1 && (
        <div className="no-print flex flex-wrap gap-2 mb-6">
          {Object.entries(sheetsUsedPerStock).map(([label, count]) => (
            <span key={label} className="rounded-full px-3 py-0.5 text-xs font-medium"
              style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}>
              {label}: {count} {count === 1 ? 'plaat' : 'platen'}
            </span>
          ))}
        </div>
      )}

      {/* Unplaced warnings */}
      {unplacedPartIds.length > 0 && (
        <div className="border rounded-xl p-4 mb-6" style={{ background: 'rgba(168,85,68,0.07)', borderColor: 'rgba(168,85,68,0.3)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--error)' }}>⚠ Onderdelen die niet passen:</p>
          <ul className="text-sm list-disc list-inside" style={{ color: 'var(--error)' }}>
            {unplacedPartIds.map(id => {
              const p = parts.find(p => p.id === id)
              return <li key={id}>{p?.label ?? id}</li>
            })}
          </ul>
        </div>
      )}

      {/* ── Per-sheet sections ───────────────────────────────── */}
      {sheetsUsed.map((sheet, idx) => {
        const stock = stockPanels.find(s => s.id === sheet.stockPanelId)
        if (!stock) return null

        const sheetPlacements = placements.filter(p => p.sheetIndex === idx)
        const sheetStartSeq = 1 + placements.filter(p => p.sheetIndex < idx).length

        const sheetArea = stock.width * stock.height
        const sheetUsedArea = sheetPlacements.reduce((sum, pl) => sum + pl.width * pl.height, 0)
        const sheetRendement = Math.round(sheetUsedArea / sheetArea * 100)
        const sheetAfval = ((sheetArea - sheetUsedArea) / 1e6).toFixed(2)

        return (
          <section
            key={idx}
            className={idx === 0 ? 'mb-6' : 'mb-6 print-break-before'}
          >
            {/* White sheet card */}
            <div className="rounded-[14px] border p-5 md:p-6 print-card"
              style={{ background: 'var(--sheet)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-popup)' }}>

              {/* Sheet heading — break-after:avoid keeps it with diagram */}
              <div className="sheet-heading flex items-baseline gap-2 border-b pb-2 mb-4" style={{ borderColor: 'var(--line)' }}>
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ink)' }}>
                  {stock.label} — plaat {sheet.sheetNumber}
                </h2>
                <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                  {stock.width} × {stock.height} mm
                </span>
              </div>

              {/* Diagram */}
              <div className="w-full mb-5">
                {/* Landscape — desktop screen only */}
                <div className="diagram-landscape hidden sm:block">
                  <SheetDiagram
                    sheetIdx={idx} sheet={sheet} stock={stock}
                    placements={placements} parts={parts} settings={settings}
                    partColorMap={partColorMap} startSeq={sheetStartSeq}
                    cutLines={cutLines} kerf={settings.kerf}
                    portrait={false}
                  />
                </div>
                {/* Portrait — mobile + print */}
                <div className="diagram-portrait sm:hidden">
                  <SheetDiagram
                    sheetIdx={idx} sheet={sheet} stock={stock}
                    placements={placements} parts={parts} settings={settings}
                    partColorMap={partColorMap} startSeq={sheetStartSeq}
                    cutLines={cutLines} kerf={settings.kerf}
                    portrait={true}
                  />
                </div>
              </div>

              {/* Stats + tabel */}
              <div className="w-full print-stats-break">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Stat label="Onderdelen" value={sheetPlacements.length.toString()} />
                  <Stat label="Gebruikt" value={`${(sheetUsedArea / 1e6).toFixed(2)} m²`} accent={`${sheetRendement}%`} />
                  <Stat label="Rest" value={`${sheetAfval} m²`} />
                </div>

                <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--line)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--paper-warm)' }}>
                        <th className="px-3 py-2 text-left w-10"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 500 }}>#</th>
                        <th className="px-3 py-2 text-left"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 500 }}>Onderdeel</th>
                        <th className="px-3 py-2 text-left"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 500 }}>Netto</th>
                        {settings.brutomaten &&
                          <th className="px-3 py-2 text-left"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 500 }}>Bruto</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetPlacements.map((pl, i) => {
                        const part = parts.find(p => p.id === pl.partId)
                        const color = partColorMap[pl.partId] ?? PART_COLORS[i % PART_COLORS.length]
                        const netW = part ? (pl.rotated ? part.height : part.width)  : pl.width
                        const netH = part ? (pl.rotated ? part.width  : part.height) : pl.height
                        const seq = sheetStartSeq + i

                        return (
                          <tr key={i} style={{ borderTop: '1px solid var(--line-faint)', background: i % 2 === 0 ? 'transparent' : 'var(--paper-warm)' }}>
                            <td className="px-3 py-2.5">
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                                style={{ background: 'var(--badge-bg)', color: 'var(--badge-ink)' }}
                              >
                                {seq}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                                {part?.label ?? '?'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-soft)' }}>
                              {netW}×{netH}
                            </td>
                            {settings.brutomaten && (
                              <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-soft)' }}>
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
            </div>
          </section>
        )
      })}

      {/* Contact link */}
      <div className="no-print text-center pt-6 pb-2">
        <a
          href="#"
          className="text-xs transition-colors"
          style={{ color: 'var(--ink-ghost)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink-soft)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-ghost)')}
          onClick={e => {
            e.preventDefault()
            const u = ['steven', 'studiokroos.nl'].join('@')
            const body = `Code%3A%20${sessionCode}%0A%0ABeschrijving%3A%20`
            window.location.href = `mailto:${u}?subject=Zaagstaat%20feedback&body=${body}`
          }}
        >
          Fout gevonden of vraag? Stuur een berichtje →
        </a>
      </div>

      {/* PDF footer */}
      <div className="hidden print:block fixed bottom-4 left-0 right-0 text-center text-xs pt-2 bg-white" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-faint)' }}>
        Gegenereerd op {printTimestamp} met behulp van Zaagstaat —
        code: <strong>{sessionCode}</strong>, geldig tot {formatExpiry(expiresAt)}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl p-3 text-center border"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <p className="text-xs mb-0.5" style={{ color: 'var(--ink-faint)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
        {value}
        {accent && <span className="text-sm ml-1" style={{ color: 'var(--accent)' }}>{accent}</span>}
      </p>
    </div>
  )
}
