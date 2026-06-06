import type { CutLine, Part, PlacedPart, Settings, SheetUsed, StockPanel, OptimizationResult } from './types'

/** Round to 1 decimal place to eliminate floating-point noise */
const round = (n: number) => Math.round(n * 10) / 10

interface Rect { x: number; y: number; w: number; h: number }

interface PackResult {
  placements: { x: number; y: number; w: number; h: number; rotated: boolean }[]
  /** Raw cut lines in usable-area coordinates (before schoonzagen offset) */
  cuts: { orientation: 'horizontal' | 'vertical'; position: number; from: number; to: number }[]
}

/**
 * Guillotine bin-packing.
 * canRotate per item: if false the packer only tries the given orientation.
 * Records every guillotine split as a cut line.
 */
function guillotinePack(
  items: { w: number; h: number; canRotate: boolean }[],
  binW: number,
  binH: number,
): PackResult {
  const placed: PackResult['placements'] = []
  const cuts: PackResult['cuts'] = []
  let spaces: Rect[] = [{ x: 0, y: 0, w: binW, h: binH }]

  for (const item of items) {
    let best: { spaceIdx: number; rotated: boolean; score: number } | null = null
    const orientations = item.canRotate ? [false, true] : [false]

    for (let i = 0; i < spaces.length; i++) {
      const sp = spaces[i]
      for (const rotated of orientations) {
        const pw = rotated ? item.h : item.w
        const ph = rotated ? item.w : item.h
        if (pw > sp.w || ph > sp.h) continue
        const score = sp.w * sp.h - pw * ph // best-area heuristic
        if (best === null || score < best.score) {
          best = { spaceIdx: i, rotated, score }
        }
      }
    }

    if (best === null) {
      placed.push({ x: -1, y: -1, w: item.w, h: item.h, rotated: false })
      continue
    }

    const sp = spaces[best.spaceIdx]
    const pw = best.rotated ? item.h : item.w
    const ph = best.rotated ? item.w : item.h
    placed.push({ x: sp.x, y: sp.y, w: pw, h: ph, rotated: best.rotated })

    // Guillotine split — record the two resulting cut lines
    const rightW = sp.w - pw
    const bottomH = sp.h - ph
    spaces.splice(best.spaceIdx, 1)

    if (rightW > 0) {
      // Vertical cut at x = sp.x + pw, running from sp.y to sp.y + ph
      cuts.push({ orientation: 'vertical', position: sp.x + pw, from: sp.y, to: sp.y + ph })
      spaces.push({ x: sp.x + pw, y: sp.y, w: rightW, h: ph })
    }
    if (bottomH > 0) {
      // Horizontal cut at y = sp.y + ph, running full width of sp
      cuts.push({ orientation: 'horizontal', position: sp.y + ph, from: sp.x, to: sp.x + sp.w })
      spaces.push({ x: sp.x, y: sp.y + ph, w: sp.w, h: bottomH })
    }

    spaces.sort((a, b) => a.w * a.h - b.w * b.h)
  }

  return { placements: placed, cuts }
}

/**
 * Determine if a part must be pre-rotated to align its grain with the sheet's grain.
 */
function needsGrainRotation(part: Part, stock: StockPanel): boolean {
  if (part.grainDirection === 'geen' || stock.grainDirection === 'geen') return false
  return part.grainDirection !== stock.grainDirection
}

export function optimize(
  allParts: Part[],
  stockPanels: StockPanel[],
  settings: Settings,
): OptimizationResult {
  const { kerf, schoonzagen, schoonzagenMaat, brutomaten, overmaat } = settings

  const placements: PlacedPart[] = []
  const sheetsUsed: SheetUsed[] = []
  const cutLines: CutLine[] = []
  const sheetsPerStock: Record<string, number> = {}
  const unplacedPartIds: string[] = []
  let totalArea = 0
  let usedArea = 0

  // Group expanded parts by material
  const byMaterial: Record<string, { part: Part; bw: number; bh: number }[]> = {}
  for (const part of allParts) {
    const bw = round(brutomaten ? part.width  + overmaat * 2 : part.width)
    const bh = round(brutomaten ? part.height + overmaat * 2 : part.height)
    for (let i = 0; i < part.qty; i++) {
      const m = part.material
      if (!byMaterial[m]) byMaterial[m] = []
      byMaterial[m].push({ part, bw, bh })
    }
  }

  // Sort each group largest-first
  for (const items of Object.values(byMaterial)) {
    items.sort((a, b) => b.bw * b.bh - a.bw * a.bh)
  }

  for (const [material, items] of Object.entries(byMaterial)) {
    const stock = stockPanels.find(s => s.label === material)
    if (!stock) {
      for (const e of items) unplacedPartIds.push(e.part.id)
      continue
    }

    const border = schoonzagen ? schoonzagenMaat : 0
    const usableW = stock.width  - border * 2
    const usableH = stock.height - border * 2

    let remaining = [...items]
    let sheetNum = 0

    while (remaining.length > 0) {
      sheetNum++
      const sheetIdx = sheetsUsed.length
      sheetsUsed.push({ stockPanelId: stock.id, sheetNumber: sheetNum })
      totalArea += usableW * usableH

      const packItems = remaining.map(e => {
        const preRotate = needsGrainRotation(e.part, stock)
        const canRotate = e.part.grainDirection === 'geen'
        const w = preRotate ? e.bh + kerf : e.bw + kerf
        const h = preRotate ? e.bw + kerf : e.bh + kerf
        return { w, h, canRotate, preRotate }
      })

      const { placements: results, cuts } = guillotinePack(packItems, usableW, usableH)

      // Collect cut lines for this sheet (offset by schoonzagen border)
      for (const cut of cuts) {
        cutLines.push({
          sheetIndex: sheetIdx,
          orientation: cut.orientation,
          position: round(border + cut.position),
          from: round(border + cut.from),
          to: round(border + cut.to),
        })
      }

      const nextRemaining: typeof remaining = []
      for (let i = 0; i < remaining.length; i++) {
        const r = results[i]
        const e = remaining[i]
        const { preRotate } = packItems[i]

        if (r.x === -1) {
          nextRemaining.push(e)
          continue
        }

        const placedW = round(r.w - kerf)
        const placedH = round(r.h - kerf)
        const rotated = preRotate !== r.rotated ? true : (preRotate || r.rotated)

        placements.push({
          partId: e.part.id,
          sheetIndex: sheetIdx,
          stockPanelId: stock.id,
          x: border + r.x,
          y: border + r.y,
          width: placedW,
          height: placedH,
          rotated,
        })
        usedArea += placedW * placedH
      }

      if (nextRemaining.length === remaining.length) {
        for (const e of nextRemaining) unplacedPartIds.push(e.part.id)
        break
      }
      remaining = nextRemaining
    }

    sheetsPerStock[material] = sheetNum
  }

  const wasteArea  = totalArea - usedArea
  const wastePercent = totalArea > 0 ? Math.round((wasteArea / totalArea) * 100) : 0

  return {
    placements,
    sheetsUsed,
    sheetsUsedPerStock: sheetsPerStock,
    totalArea,
    usedArea,
    wasteArea,
    wastePercent,
    unplacedPartIds: [...new Set(unplacedPartIds)],
    cutLines,
  }
}
