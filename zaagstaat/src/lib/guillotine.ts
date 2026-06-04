import type { Part, PlacedPart, Settings, SheetUsed, StockPanel, OptimizationResult } from './types'

/** Round to 1 decimal place to eliminate floating-point noise */
const round = (n: number) => Math.round(n * 10) / 10

interface Rect { x: number; y: number; w: number; h: number }

/**
 * Guillotine bin-packing.
 * canRotate per item: if false the packer only tries the given orientation.
 */
function guillotinePack(
  items: { w: number; h: number; canRotate: boolean }[],
  binW: number,
  binH: number,
): { x: number; y: number; w: number; h: number; rotated: boolean }[] {
  const placed: { x: number; y: number; w: number; h: number; rotated: boolean }[] = []
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
      placed.push({ x: -1, y: -1, w: item.w, h: item.h, rotated: false }) // unplaced sentinel
      continue
    }

    const sp = spaces[best.spaceIdx]
    const pw = best.rotated ? item.h : item.w
    const ph = best.rotated ? item.w : item.h
    placed.push({ x: sp.x, y: sp.y, w: pw, h: ph, rotated: best.rotated })

    // Guillotine split
    const rightW = sp.w - pw
    const bottomH = sp.h - ph
    spaces.splice(best.spaceIdx, 1)
    if (rightW > 0) spaces.push({ x: sp.x + pw, y: sp.y, w: rightW, h: ph })
    if (bottomH > 0) spaces.push({ x: sp.x, y: sp.y + ph, w: sp.w, h: bottomH })
    spaces.sort((a, b) => a.w * a.h - b.w * b.h)
  }

  return placed
}

/**
 * Determine if a part must be pre-rotated to align its grain with the sheet's grain.
 *
 * A sheet has a grain direction (e.g. verticaal = grain runs along the height axis).
 * A part has a required grain direction.
 * When they differ (and neither is 'geen'), the part must be rotated 90° before placing.
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

      /**
       * Build pack items with grain-aware orientation:
       * - If part grain ≠ sheet grain → swap w/h (pre-rotate), canRotate = false
       * - If part grain = sheet grain  → as-is,              canRotate = false
       * - If part grain = 'geen'       → as-is,              canRotate = true
       */
      const packItems = remaining.map(e => {
        const preRotate = needsGrainRotation(e.part, stock)
        const canRotate = e.part.grainDirection === 'geen'
        const w = preRotate ? e.bh + kerf : e.bw + kerf
        const h = preRotate ? e.bw + kerf : e.bh + kerf
        return { w, h, canRotate, preRotate }
      })

      const results = guillotinePack(packItems, usableW, usableH)

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

        // `rotated` in PlacedPart = true if part is physically rotated vs its original dimensions
        // This happens when pre-rotated for grain OR when packer chose to rotate a 'geen' part
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
  }
}
