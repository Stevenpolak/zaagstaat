import type { CutLine, Part, PlacedPart, Settings, SheetUsed, StockPanel } from '../lib/types'

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
  cutLines?: CutLine[]
  kerf?: number
}

/**
 * Rotate a rect 90° clockwise into portrait space.
 * Original landscape space: x → [0..W], y → [0..H]
 * Portrait viewBox: width=H, height=W
 * Mapping: new_x = H - y - h,  new_y = x,  new_w = h,  new_h = w
 */
function rot(H: number, x: number, y: number, w: number, h: number) {
  return { x: H - y - h, y: x, w: h, h: w }
}

export function SheetDiagram({ sheetIdx, stock, placements, parts, settings, partColorMap, startSeq = 1, cutLines = [], kerf = 4 }: Props) {
  // Original landscape dimensions (must be declared before anything that uses them)
  const W = stock.width
  const H = stock.height

  const border = settings.schoonzagen ? settings.schoonzagenMaat : 0
  const myPlacements = placements.filter(p => p.sheetIndex === sheetIdx)

  // Compute waste rectangles (in original landscape coords) for dimension labels.
  // Detect strip direction from full-span cut lines.
  const usableRight = W - border
  const usableBottom = H - border
  const wasteRects: Array<{ x: number; y: number; w: number; h: number }> = []

  if (myPlacements.length > 0) {
    const sheetCuts = cutLines.filter(c => c.sheetIndex === sheetIdx)
    // Full-width horizontal cuts → schulp stroken (h-strips)
    // Full-height vertical cuts → afkort stroken (v-strips)
    const hasFullH = sheetCuts.some(
      c => c.orientation === 'horizontal' && c.from <= border + 1 && c.to >= usableRight - 1
    )
    const hasFullV = sheetCuts.some(
      c => c.orientation === 'vertical' && c.from <= border + 1 && c.to >= usableBottom - 1
    )
    const isSchulp = hasFullH || (!hasFullV && true) // default to schulp if ambiguous

    if (isSchulp && !hasFullV) {
      // ── Schulp stroken (H-strips) ──────────────────────────────────────────
      // Waste A: to the right of each strip row
      const rowMap = new Map<number, { maxX: number; h: number }>()
      for (const pl of myPlacements) {
        const cur = rowMap.get(pl.y)
        if (!cur) rowMap.set(pl.y, { maxX: pl.x + pl.width, h: pl.height })
        else { cur.maxX = Math.max(cur.maxX, pl.x + pl.width); cur.h = Math.max(cur.h, pl.height) }
      }
      for (const [y, { maxX, h }] of rowMap) {
        if (maxX < usableRight - 1) wasteRects.push({ x: maxX, y, w: usableRight - maxX, h })
      }
      // Waste B: below all strips (the large rest area)
      const maxBottom = Math.max(...myPlacements.map(p => p.y + p.height))
      if (maxBottom < usableBottom - 1) {
        wasteRects.push({ x: border, y: maxBottom, w: usableRight - border, h: usableBottom - maxBottom })
      }
    } else {
      // ── Afkort stroken (V-strips) ──────────────────────────────────────────
      // Waste A: below each column
      const colMap = new Map<number, { maxY: number; w: number }>()
      for (const pl of myPlacements) {
        const cur = colMap.get(pl.x)
        if (!cur) colMap.set(pl.x, { maxY: pl.y + pl.height, w: pl.width })
        else { cur.maxY = Math.max(cur.maxY, pl.y + pl.height); cur.w = Math.max(cur.w, pl.width) }
      }
      for (const [x, { maxY, w }] of colMap) {
        if (maxY < usableBottom - 1) wasteRects.push({ x, y: maxY, w, h: usableBottom - maxY })
      }
      // Waste B: to the right of all columns (the large rest area)
      const maxRight = Math.max(...myPlacements.map(p => p.x + p.width))
      if (maxRight < usableRight - 1) {
        wasteRects.push({ x: maxRight, y: border, w: usableRight - maxRight, h: usableBottom - border })
      }
    }
  }

  // Portrait viewBox: width=H, height=W
  const vbW = H
  const vbH = W

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-auto border border-slate-300 rounded"
      style={{ display: 'block', background: '#f8fafc' }}
    >
      <defs>
        <pattern id={`hatch-${sheetIdx}`} patternUnits="userSpaceOnUse" width={30} height={30}>
          <line x1={0} y1={30} x2={30} y2={0} stroke="#dde3eb" strokeWidth={2.5} />
        </pattern>
      </defs>

      {/* Sheet background */}
      <rect x={0} y={0} width={vbW} height={vbH} fill="#f1f5f9" />

      {/* Schoonzagen border zone */}
      {border > 0 && <rect x={0} y={0} width={vbW} height={vbH} fill="#e2e8f0" />}

      {/* Usable area */}
      <rect x={border} y={border} width={vbW - border * 2} height={vbH - border * 2} fill="white" />

      {/* Waste hatching */}
      <rect x={border} y={border} width={vbW - border * 2} height={vbH - border * 2} fill={`url(#hatch-${sheetIdx})`} />

      {/* Schoonzagen dashed border */}
      {border > 0 && (
        <rect x={border} y={border} width={vbW - border * 2} height={vbH - border * 2}
          fill="none" stroke="#94a3b8" strokeWidth={4} strokeDasharray="18 10" />
      )}

      {/* Cut lines — transformed to portrait coordinates */}
      {cutLines
        .filter(c => c.sheetIndex === sheetIdx)
        .map((c, i) => {
          const r = c.orientation === 'vertical'
            ? rot(H, c.position - kerf / 2, c.from, kerf, c.to - c.from)
            : rot(H, c.from, c.position - kerf / 2, c.to - c.from, kerf)
          return <rect key={`cut-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="#ef4444" fillOpacity={0.7} />
        })
      }

      {/* Placed parts */}
      {myPlacements.map((pl, i) => {
        const part = parts.find(p => p.id === pl.partId)
        const color = partColorMap[pl.partId] ?? COLORS[i % COLORS.length]

        // Net dimensions (labels show what the part actually is, accounting for optimizer rotation)
        const netW = part ? (pl.rotated ? part.height : part.width) : pl.width
        const netH = part ? (pl.rotated ? part.width  : part.height) : pl.height

        // Transform placement to portrait coordinates
        const r = rot(H, pl.x, pl.y, pl.width, pl.height)
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const seq = startSeq + i

        // Font sizing based on smaller visual dimension in portrait view
        const minDim = Math.min(r.w, r.h)
        const fontSize = Math.max(16, Math.min(52, minDim / 4.5))
        const badgeSize = Math.max(28, fontSize * 1.1)

        // Show dimensions text only if there's enough room below the label
        const showDims = r.h > fontSize * 2.8

        // Grain direction: only the optimizer's physical rotation of the piece matters.
        // Our view rotation doesn't change the grain semantics — the arrow stays
        // relative to the piece itself, not the sheet orientation.
        const grainForDisplay: 'verticaal' | 'horizontaal' | 'geen' =
          part?.grainDirection === 'geen' || !part ? 'geen' :
          pl.rotated
            ? (part.grainDirection === 'verticaal' ? 'horizontaal' : 'verticaal')  // optimizer rotated piece
            : part.grainDirection                                                    // as specified

        const overmaat = settings.brutomaten ? settings.overmaat : 0

        return (
          <g key={i}>
            {/* Part fill */}
            <rect x={r.x} y={r.y} width={r.w} height={r.h}
              fill={color} fillOpacity={0.72} stroke={color} strokeWidth={3} />

            {/* Netto inner dashed rect when brutomaten is on */}
            {overmaat > 0 && (
              <rect
                x={r.x + overmaat} y={r.y + overmaat}
                width={r.w - overmaat * 2} height={r.h - overmaat * 2}
                fill="none" stroke="white" strokeWidth={2.5} strokeDasharray="10 6" strokeOpacity={0.7}
              />
            )}

            {/* Grain arrow — bottom-right corner of the part in portrait space */}
            {part && grainForDisplay !== 'geen' && (
              <GrainArrow
                x={r.x + r.w - fontSize * 0.9}
                y={r.y + r.h - fontSize * 0.9}
                size={fontSize * 0.7}
                direction={grainForDisplay}
              />
            )}

            {/* Label */}
            <text
              x={cx} y={showDims ? cy - fontSize * 0.45 : cy}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fontSize} fontWeight="700" fill="white"
              style={{ pointerEvents: 'none' }}
            >
              {part?.label ?? '?'}
            </text>

            {/* Dimensions — only when there's room */}
            {showDims && (
              <text
                x={cx} y={cy + fontSize * 0.7}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fontSize * 0.72} fill="white" fillOpacity={0.85}
                style={{ pointerEvents: 'none' }}
              >
                {netW}×{netH}
              </text>
            )}

            {/* Sequence badge — top-left corner */}
            <circle cx={r.x + badgeSize * 0.55} cy={r.y + badgeSize * 0.55} r={badgeSize * 0.52}
              fill="white" fillOpacity={0.9} />
            <text
              x={r.x + badgeSize * 0.55} y={r.y + badgeSize * 0.55}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={badgeSize * 0.68} fontWeight="800" fill={color}
              style={{ pointerEvents: 'none' }}
            >
              {seq}
            </text>
          </g>
        )
      })}

      {/* Waste piece dimensions */}
      {wasteRects.map((wr, i) => {
        const r = rot(H, wr.x, wr.y, wr.w, wr.h)
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const minDim = Math.min(r.w, r.h)
        const fs = Math.max(14, Math.min(36, minDim / 5))
        if (r.w < fs * 2 || r.h < fs * 1.5) return null
        return (
          <g key={`waste-${i}`}>
            <text
              x={cx} y={cy}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fs} fill="#94a3b8"
              style={{ pointerEvents: 'none' }}
            >
              {wr.w}×{wr.h}
            </text>
          </g>
        )
      })}
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
