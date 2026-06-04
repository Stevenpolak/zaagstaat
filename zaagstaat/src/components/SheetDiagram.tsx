import type { Part, PlacedPart, Settings, SheetUsed, StockPanel } from '../lib/types'

export const COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
]

interface Props {
  sheetIdx: number
  sheet?: SheetUsed
  stock: StockPanel
  placements: PlacedPart[]
  parts: Part[]
  settings: Settings
  partColorMap: Record<string, string>
}

export function SheetDiagram({ sheetIdx, stock, placements, parts, settings, partColorMap }: Props) {
  const border = settings.schoonzagen ? settings.schoonzagenMaat : 0
  const myPlacements = placements.filter(p => p.sheetIndex === sheetIdx)

  // Render the sheet with lengte (width) on the horizontal axis — natural landscape.
  // viewBox uses stock.width × stock.height directly.
  const vbW = stock.width
  const vbH = stock.height

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-auto border border-slate-300 rounded bg-slate-100"
      style={{ display: 'block' }}
    >
      {/* Sheet background */}
      <rect x={0} y={0} width={vbW} height={vbH} fill="#f1f5f9" />

      {/* Schoonzagen usable area */}
      {border > 0 && (
        <rect
          x={border} y={border}
          width={vbW - border * 2} height={vbH - border * 2}
          fill="white" stroke="#cbd5e1" strokeWidth={4} strokeDasharray="16 10"
        />
      )}

      {/* Waste hatching */}
      <defs>
        <pattern id={`hatch-${sheetIdx}`} patternUnits="userSpaceOnUse" width={30} height={30}>
          <line x1={0} y1={30} x2={30} y2={0} stroke="#e2e8f0" strokeWidth={3} />
        </pattern>
      </defs>
      <rect
        x={border} y={border}
        width={vbW - border * 2} height={vbH - border * 2}
        fill={`url(#hatch-${sheetIdx})`}
      />

      {/* Placed parts */}
      {myPlacements.map((pl, i) => {
        const part = parts.find(p => p.id === pl.partId)
        const color = partColorMap[pl.partId] ?? COLORS[i % COLORS.length]
        const netW = part ? (pl.rotated ? part.height : part.width) : pl.width
        const netH = part ? (pl.rotated ? part.width  : part.height) : pl.height
        // Font size scales with the smaller dimension of the placed rect
        const fontSize = Math.max(18, Math.min(60, Math.min(pl.width, pl.height) / 4))
        const cx = pl.x + pl.width / 2
        const cy = pl.y + pl.height / 2

        return (
          <g key={i}>
            <rect
              x={pl.x} y={pl.y}
              width={pl.width} height={pl.height}
              fill={color} fillOpacity={0.75}
              stroke={color} strokeWidth={4}
              rx={6}
            />
            <text
              x={cx} y={cy - fontSize * 0.55}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fontSize} fontWeight="700" fill="white"
              style={{ pointerEvents: 'none' }}
            >
              {part?.label ?? '?'}
            </text>
            <text
              x={cx} y={cy + fontSize * 0.75}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fontSize * 0.75} fill="white" fillOpacity={0.9}
              style={{ pointerEvents: 'none' }}
            >
              {netW}×{netH}
            </text>
          </g>
        )
      })}

      {/* Dimension labels */}
      <text x={vbW / 2} y={vbH - 8} textAnchor="middle" fontSize={28} fill="#94a3b8">{vbW} mm</text>
      <text
        x={14} y={vbH / 2}
        textAnchor="middle" fontSize={28} fill="#94a3b8"
        transform={`rotate(-90, 14, ${vbH / 2})`}
      >{vbH} mm</text>
    </svg>
  )
}
