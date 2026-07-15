import type { CutLine, Part, PlacedPart, Settings, SheetUsed, StockPanel } from '../lib/types'
import { PART_COLORS } from '../lib/colors'

interface Props {
  sheetIdx: number
  sheet?: SheetUsed
  stock: StockPanel
  placements: PlacedPart[]
  parts: Part[]
  settings: Settings
  partColorMap: Record<string, string>
  startSeq?: number
  cutLines?: CutLine[]
  kerf?: number
  portrait?: boolean
}

/** Rotate a rect 90° clockwise into portrait space. */
function rot(H: number, x: number, y: number, w: number, h: number) {
  return { x: H - y - h, y: x, w: h, h: w }
}

export function SheetDiagram({ sheetIdx, stock, placements, parts, settings, partColorMap, startSeq = 1, cutLines = [], kerf = 4, portrait = true }: Props) {
  const W = stock.width
  const H = stock.height

  const border = settings.schoonzagen ? settings.schoonzagenMaat : 0
  const myPlacements = placements.filter(p => p.sheetIndex === sheetIdx)

  const usableRight = W - border
  const usableBottom = H - border
  const wasteRects: Array<{ x: number; y: number; w: number; h: number }> = []

  if (myPlacements.length > 0) {
    const sheetCuts = cutLines.filter(c => c.sheetIndex === sheetIdx)
    const hasFullH = sheetCuts.some(
      c => c.orientation === 'horizontal' && c.from <= border + 1 && c.to >= usableRight - 1
    )
    const hasFullV = sheetCuts.some(
      c => c.orientation === 'vertical' && c.from <= border + 1 && c.to >= usableBottom - 1
    )
    const isSchulp = hasFullH || (!hasFullV && true)

    if (isSchulp && !hasFullV) {
      const rowMap = new Map<number, { maxX: number; h: number }>()
      for (const pl of myPlacements) {
        const cur = rowMap.get(pl.y)
        if (!cur) rowMap.set(pl.y, { maxX: pl.x + pl.width, h: pl.height })
        else { cur.maxX = Math.max(cur.maxX, pl.x + pl.width); cur.h = Math.max(cur.h, pl.height) }
      }
      for (const [y, { maxX, h }] of rowMap) {
        if (maxX < usableRight - 1) wasteRects.push({ x: maxX, y, w: usableRight - maxX, h })
      }
      const maxBottom = Math.max(...myPlacements.map(p => p.y + p.height))
      if (maxBottom < usableBottom - 1) {
        wasteRects.push({ x: border, y: maxBottom, w: usableRight - border, h: usableBottom - maxBottom })
      }
    } else {
      const colMap = new Map<number, { maxY: number; w: number }>()
      for (const pl of myPlacements) {
        const cur = colMap.get(pl.x)
        if (!cur) colMap.set(pl.x, { maxY: pl.y + pl.height, w: pl.width })
        else { cur.maxY = Math.max(cur.maxY, pl.y + pl.height); cur.w = Math.max(cur.w, pl.width) }
      }
      for (const [x, { maxY, w }] of colMap) {
        if (maxY < usableBottom - 1) wasteRects.push({ x, y: maxY, w, h: usableBottom - maxY })
      }
      const maxRight = Math.max(...myPlacements.map(p => p.x + p.width))
      if (maxRight < usableRight - 1) {
        wasteRects.push({ x: maxRight, y: border, w: usableRight - maxRight, h: usableBottom - border })
      }
    }
  }

  // Portrait: viewBox H×W (rotated 90° clockwise), landscape: viewBox W×H (natural)
  const vbW = portrait ? H : W
  const vbH = portrait ? W : H

  // Transform a rect depending on orientation
  function tr(x: number, y: number, w: number, h: number) {
    return portrait ? rot(H, x, y, w, h) : { x, y, w, h }
  }

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-auto rounded"
      style={{ display: 'block', border: '1px solid #CFC8B8' }}
    >
      <defs>
        <pattern id={`hatch-${sheetIdx}-${portrait ? 'p' : 'l'}`} patternUnits="userSpaceOnUse" width={34} height={34}>
          <line x1={0} y1={34} x2={34} y2={0} stroke="#D8CFBC" strokeWidth={3} />
        </pattern>
      </defs>

      {/* Sheet background */}
      <rect x={0} y={0} width={vbW} height={vbH} fill="#EDE6D8" />

      {/* Schoonzagen border zone */}
      {border > 0 && <rect x={0} y={0} width={vbW} height={vbH} fill="#E2D9C8" />}

      {/* Usable area */}
      <rect x={border} y={border} width={vbW - border * 2} height={vbH - border * 2} fill="#FCFBF7" />

      {/* Waste hatching */}
      <rect x={border} y={border} width={vbW - border * 2} height={vbH - border * 2}
        fill={`url(#hatch-${sheetIdx}-${portrait ? 'p' : 'l'})`} />

      {/* Schoonzagen dashed border */}
      {border > 0 && (
        <rect x={border} y={border} width={vbW - border * 2} height={vbH - border * 2}
          fill="none" stroke="#BCB29C" strokeWidth={4} strokeDasharray="18 10" />
      )}

      {/* Cut lines */}
      {cutLines
        .filter(c => c.sheetIndex === sheetIdx)
        .map((c, i) => {
          const r = c.orientation === 'vertical'
            ? tr(c.position - kerf / 2, c.from, kerf, c.to - c.from)
            : tr(c.from, c.position - kerf / 2, c.to - c.from, kerf)
          return <rect key={`cut-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="#CC2E22" />
        })
      }

      {/* Placed parts */}
      {myPlacements.map((pl, i) => {
        const part = parts.find(p => p.id === pl.partId)
        const color = partColorMap[pl.partId] ?? PART_COLORS[i % PART_COLORS.length]

        const netW = part ? (pl.rotated ? part.height : part.width) : pl.width
        const netH = part ? (pl.rotated ? part.width  : part.height) : pl.height

        const r = tr(pl.x, pl.y, pl.width, pl.height)
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const seq = startSeq + i

        const minDim = Math.min(r.w, r.h)
        const fontSize = Math.max(16, Math.min(52, minDim / 4.5))
        const badgeSize = Math.max(28, fontSize * 1.1)
        const showDims = r.h > fontSize * 2.8

        const overmaat = settings.brutomaten ? settings.overmaat : 0

        return (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h}
              fill={color} stroke="rgba(0,0,0,0.16)" strokeWidth={2} />

            {overmaat > 0 && (
              <rect
                x={r.x + overmaat} y={r.y + overmaat}
                width={r.w - overmaat * 2} height={r.h - overmaat * 2}
                fill="none" stroke="rgba(42,36,29,0.35)" strokeWidth={2.5} strokeDasharray="10 6"
              />
            )}

            <text
              x={cx} y={showDims ? cy - fontSize * 0.45 : cy}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fontSize} fontWeight="700" fill="#2A241D"
              style={{ pointerEvents: 'none' }}
            >
              {part?.label ?? '?'}
            </text>

            {showDims && (
              <text
                x={cx} y={cy + fontSize * 0.7}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fontSize * 0.72} fill="#5A5142"
                style={{ pointerEvents: 'none' }}
              >
                {netW}×{netH}
              </text>
            )}

            <circle cx={r.x + badgeSize * 0.55} cy={r.y + badgeSize * 0.55} r={badgeSize * 0.52}
              fill="#26221C" />
            <text
              x={r.x + badgeSize * 0.55} y={r.y + badgeSize * 0.55}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={badgeSize * 0.68} fontWeight="800" fill="white"
              style={{ pointerEvents: 'none' }}
            >
              {seq}
            </text>
          </g>
        )
      })}

      {/* Waste piece dimensions — darker + larger */}
      {wasteRects.map((wr, i) => {
        const r = tr(wr.x, wr.y, wr.w, wr.h)
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const minDim = Math.min(r.w, r.h)
        const fs = Math.max(16, Math.min(44, minDim / 4.5))
        if (r.w < fs * 2 || r.h < fs * 1.5) return null
        const label = `${wr.w}×${wr.h}`
        const bgW = label.length * fs * 0.58 + fs * 0.8
        const bgH = fs * 1.5
        return (
          <g key={`waste-${i}`}>
            <rect
              x={cx - bgW / 2} y={cy - bgH / 2}
              width={bgW} height={bgH}
              rx={fs * 0.2}
              fill="#FCFBF7"
            />
            <text
              x={cx} y={cy}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={fs} fill="#6E675B"
              style={{ pointerEvents: 'none' }}
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
