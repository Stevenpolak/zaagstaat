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
  /** Sequence number of the first placement on this sheet (for cross-referencing) */
  startSeq?: number
}

export function SheetDiagram({ sheetIdx, stock, placements, parts, settings, partColorMap, startSeq = 1 }: Props) {
  const border = settings.schoonzagen ? settings.schoonzagenMaat : 0
  const myPlacements = placements.filter(p => p.sheetIndex === sheetIdx)
  const vbW = stock.width
  const vbH = stock.height

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-auto border border-slate-300 rounded"
      style={{ display: 'block', background: '#f8fafc' }}
    >
      <defs>
        {/* Waste hatching */}
        <pattern id={`hatch-${sheetIdx}`} patternUnits="userSpaceOnUse" width={30} height={30}>
          <line x1={0} y1={30} x2={30} y2={0} stroke="#dde3eb" strokeWidth={2.5} />
        </pattern>
        {/* Clip to usable area */}
        <clipPath id={`clip-${sheetIdx}`}>
          <rect x={border} y={border} width={vbW - border * 2} height={vbH - border * 2} />
        </clipPath>
      </defs>

      {/* Sheet background */}
      <rect x={0} y={0} width={vbW} height={vbH} fill="#f1f5f9" />

      {/* Schoonzagen border zone — slightly darker */}
      {border > 0 && (
        <rect x={0} y={0} width={vbW} height={vbH} fill="#e2e8f0" />
      )}

      {/* Usable area background */}
      <rect
        x={border} y={border}
        width={vbW - border * 2} height={vbH - border * 2}
        fill="white"
      />

      {/* Waste hatching inside usable area */}
      <rect
        x={border} y={border}
        width={vbW - border * 2} height={vbH - border * 2}
        fill={`url(#hatch-${sheetIdx})`}
      />

      {/* Schoonzagen dashed border line */}
      {border > 0 && (
        <rect
          x={border} y={border}
          width={vbW - border * 2} height={vbH - border * 2}
          fill="none" stroke="#94a3b8" strokeWidth={4} strokeDasharray="18 10"
        />
      )}

      {/* Placed parts */}
      {myPlacements.map((pl, i) => {
        const part = parts.find(p => p.id === pl.partId)
        const color = partColorMap[pl.partId] ?? COLORS[i % COLORS.length]
        const netW = part ? (pl.rotated ? part.height : part.width) : pl.width
        const netH = part ? (pl.rotated ? part.width  : part.height) : pl.height
        const seq = startSeq + i

        const minDim = Math.min(pl.width, pl.height)
        const fontSize = Math.max(16, Math.min(52, minDim / 4.5))
        const badgeSize = Math.max(28, fontSize * 1.1)
        const cx = pl.x + pl.width / 2
        const cy = pl.y + pl.height / 2

        // Netto inner rect (dashed) when brutomaten is on
        const overmaat = settings.brutomaten ? settings.overmaat : 0

        return (
          <g key={i}>
            {/* Main filled rect */}
            <rect
              x={pl.x} y={pl.y}
              width={pl.width} height={pl.height}
              fill={color} fillOpacity={0.72}
              stroke={color} strokeWidth={3}
            />

            {/* Netto inner dashed rect */}
            {overmaat > 0 && (
              <rect
                x={pl.x + overmaat} y={pl.y + overmaat}
                width={pl.width - overmaat * 2} height={pl.height - overmaat * 2}
                fill="none"
                stroke="white" strokeWidth={2.5} strokeDasharray="10 6" strokeOpacity={0.7}
              />
            )}

            {/* Grain direction arrow — small, top-right corner */}
            {part && part.grainDirection !== 'geen' && (
              <GrainArrow
                x={pl.x + pl.width - fontSize * 0.9}
                y={pl.y + fontSize * 0.4}
                size={fontSize * 0.7}
                direction={pl.rotated
                  ? (part.grainDirection === 'verticaal' ? 'horizontaal' : 'verticaal')
                  : part.grainDirection
                }
              />
            )}

            {/* Label */}
            <text
              x={cx} y={cy - fontSize * 0.45}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fontSize} fontWeight="700" fill="white"
              style={{ pointerEvents: 'none' }}
            >
              {part?.label ?? '?'}
            </text>

            {/* Dimensions */}
            <text
              x={cx} y={cy + fontSize * 0.7}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fontSize * 0.72} fill="white" fillOpacity={0.85}
              style={{ pointerEvents: 'none' }}
            >
              {netW}×{netH}
            </text>

            {/* Sequence number badge — top-left corner */}
            <circle
              cx={pl.x + badgeSize * 0.55} cy={pl.y + badgeSize * 0.55}
              r={badgeSize * 0.52}
              fill="white" fillOpacity={0.9}
            />
            <text
              x={pl.x + badgeSize * 0.55} y={pl.y + badgeSize * 0.55}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={badgeSize * 0.68} fontWeight="800" fill={color}
              style={{ pointerEvents: 'none' }}
            >
              {seq}
            </text>
          </g>
        )
      })}

      {/* Sheet dimension labels */}
      <text x={vbW / 2} y={vbH - 10} textAnchor="middle" fontSize={26} fill="#94a3b8" fontWeight="500">
        {vbW} mm
      </text>
      <text
        x={18} y={vbH / 2}
        textAnchor="middle" fontSize={26} fill="#94a3b8" fontWeight="500"
        transform={`rotate(-90, 18, ${vbH / 2})`}
      >
        {vbH} mm
      </text>
    </svg>
  )
}

/** Small grain direction arrow rendered inside a placed part */
function GrainArrow({ x, y, size, direction }: {
  x: number; y: number; size: number
  direction: 'verticaal' | 'horizontaal'
}) {
  const h = size
  const w = size * 0.55
  if (direction === 'verticaal') {
    return (
      <g opacity={0.75}>
        <line x1={x} y1={y - h * 0.45} x2={x} y2={y + h * 0.45} stroke="white" strokeWidth={size * 0.18} strokeLinecap="round" />
        <polyline points={`${x - w * 0.5},${y - h * 0.15} ${x},${y - h * 0.45} ${x + w * 0.5},${y - h * 0.15}`}
          stroke="white" strokeWidth={size * 0.18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <polyline points={`${x - w * 0.5},${y + h * 0.15} ${x},${y + h * 0.45} ${x + w * 0.5},${y + h * 0.15}`}
          stroke="white" strokeWidth={size * 0.18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    )
  }
  return (
    <g opacity={0.75}>
      <line x1={x - h * 0.45} y1={y} x2={x + h * 0.45} y2={y} stroke="white" strokeWidth={size * 0.18} strokeLinecap="round" />
      <polyline points={`${x - h * 0.15},${y - w * 0.5} ${x - h * 0.45},${y} ${x - h * 0.15},${y + w * 0.5}`}
        stroke="white" strokeWidth={size * 0.18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points={`${x + h * 0.15},${y - w * 0.5} ${x + h * 0.45},${y} ${x + h * 0.15},${y + w * 0.5}`}
        stroke="white" strokeWidth={size * 0.18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  )
}
