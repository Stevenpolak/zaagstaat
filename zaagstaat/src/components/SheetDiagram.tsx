import type { Part, PlacedPart, Settings, SheetUsed, StockPanel } from '../lib/types'

const COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
]

interface Props {
  sheetIdx: number
  sheet: SheetUsed
  stock: StockPanel
  placements: PlacedPart[]
  parts: Part[]
  settings: Settings
  partColorMap: Record<string, string>
}

const DISPLAY_SCALE = 0.18  // mm → px

export function SheetDiagram({ sheetIdx, sheet, stock, placements, parts, settings, partColorMap }: Props) {
  const border = settings.schoonzagen ? settings.schoonzagenMaat : 0
  const svgW = stock.width * DISPLAY_SCALE
  const svgH = stock.height * DISPLAY_SCALE

  const myPlacements = placements.filter(p => p.sheetIndex === sheetIdx)

  return (
    <div className="mb-6 break-inside-avoid">
      <p className="text-xs font-semibold text-slate-600 mb-1">
        {stock.label} — plaat {sheet.sheetNumber}
      </p>
      <svg
        width={svgW} height={svgH}
        viewBox={`0 0 ${stock.width} ${stock.height}`}
        className="border border-slate-300 bg-slate-100 rounded"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Sheet background */}
        <rect x={0} y={0} width={stock.width} height={stock.height} fill="#f1f5f9" />

        {/* Schoonzagen area */}
        {border > 0 && (
          <rect
            x={border} y={border}
            width={stock.width - border * 2}
            height={stock.height - border * 2}
            fill="white" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3"
          />
        )}

        {/* Waste hatching pattern */}
        <defs>
          <pattern id={`hatch-${sheetIdx}`} patternUnits="userSpaceOnUse" width={10} height={10}>
            <line x1={0} y1={10} x2={10} y2={0} stroke="#e2e8f0" strokeWidth={1} />
          </pattern>
        </defs>
        <rect
          x={border} y={border}
          width={stock.width - border * 2}
          height={stock.height - border * 2}
          fill={`url(#hatch-${sheetIdx})`}
        />

        {/* Placed parts */}
        {myPlacements.map((pl, i) => {
          const part = parts.find(p => p.id === pl.partId)
          const color = partColorMap[pl.partId] ?? COLORS[i % COLORS.length]
          const netW = part ? (pl.rotated ? part.height : part.width) : pl.width
          const netH = part ? (pl.rotated ? part.width : part.height) : pl.height
          const fontSize = Math.max(6, Math.min(14, pl.width / 10))
          return (
            <g key={i}>
              <rect
                x={pl.x} y={pl.y}
                width={pl.width} height={pl.height}
                fill={color} fillOpacity={0.75}
                stroke={color} strokeWidth={1.5}
                rx={2}
              />
              <text
                x={pl.x + pl.width / 2}
                y={pl.y + pl.height / 2 - fontSize * 0.6}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fontSize} fontWeight="600" fill="white"
                style={{ pointerEvents: 'none' }}
              >
                {part?.label ?? '?'}
              </text>
              <text
                x={pl.x + pl.width / 2}
                y={pl.y + pl.height / 2 + fontSize * 0.8}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fontSize * 0.8} fill="white" fillOpacity={0.85}
                style={{ pointerEvents: 'none' }}
              >
                {netW}×{netH}
              </text>
            </g>
          )
        })}

        {/* Dimension labels */}
        <text x={stock.width / 2} y={stock.height - 3} textAnchor="middle" fontSize={10} fill="#94a3b8">{stock.width} mm</text>
        <text x={4} y={stock.height / 2} textAnchor="middle" fontSize={10} fill="#94a3b8"
          transform={`rotate(-90, 4, ${stock.height / 2})`}>{stock.height} mm</text>
      </svg>
    </div>
  )
}

export { COLORS }
