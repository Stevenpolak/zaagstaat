import type { Part, PlacedPart, Settings, SheetUsed, StockPanel, OptimizationResult } from './types'

/** Round to 1 decimal place to eliminate floating-point noise */
const round = (n: number) => Math.round(n * 10) / 10

interface Rect { x: number; y: number; w: number; h: number }

function guillotinePack(items: { w: number; h: number }[], binW: number, binH: number): { x: number; y: number; w: number; h: number; rotated: boolean }[] {
  const placed: { x: number; y: number; w: number; h: number; rotated: boolean }[] = []
  let spaces: Rect[] = [{ x: 0, y: 0, w: binW, h: binH }]

  for (const item of items) {
    let best: { spaceIdx: number; rotated: boolean; score: number } | null = null

    for (let i = 0; i < spaces.length; i++) {
      const sp = spaces[i]
      for (const rotated of [false, true]) {
        const pw = rotated ? item.h : item.w
        const ph = rotated ? item.w : item.h
        if (pw > sp.w || ph > sp.h) continue
        // score: smaller leftover area (best-area heuristic)
        const score = sp.w * sp.h - pw * ph
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

    // Guillotine split: always split by longer axis
    const rightW = sp.w - pw
    const bottomH = sp.h - ph
    spaces.splice(best.spaceIdx, 1)
    if (rightW > 0) spaces.push({ x: sp.x + pw, y: sp.y, w: rightW, h: ph })
    if (bottomH > 0) spaces.push({ x: sp.x, y: sp.y + ph, w: sp.w, h: bottomH })
    // sort spaces: smallest first for best-fit behaviour
    spaces.sort((a, b) => a.w * a.h - b.w * b.h)
  }

  return placed
}

export function optimize(
  allParts: Part[],
  stockPanels: StockPanel[],
  settings: Settings,
): OptimizationResult {
  const { kerf, schoonzagen, schoonzagenMaat, brutomaten, overmaat } = settings

  // Expand parts by qty
  const expanded: { part: Part; bw: number; bh: number }[] = []
  for (const part of allParts) {
    const bw = round(brutomaten ? part.width + overmaat * 2 : part.width)
    const bh = round(brutomaten ? part.height + overmaat * 2 : part.height)
    for (let i = 0; i < part.qty; i++) expanded.push({ part, bw, bh })
  }

  // Sort largest-first for better packing
  expanded.sort((a, b) => b.bw * b.bh - a.bw * a.bh)

  const placements: PlacedPart[] = []
  const sheetsUsed: SheetUsed[] = []
  const sheetsPerStock: Record<string, number> = {}
  const unplacedPartIds: string[] = []
  let totalArea = 0
  let usedArea = 0

  // Group by material
  const byMaterial: Record<string, typeof expanded> = {}
  for (const e of expanded) {
    const m = e.part.material
    if (!byMaterial[m]) byMaterial[m] = []
    byMaterial[m].push(e)
  }

  for (const [material, items] of Object.entries(byMaterial)) {
    const stock = stockPanels.find(s => s.label === material)
    if (!stock) {
      for (const e of items) unplacedPartIds.push(e.part.id)
      continue
    }

    const border = schoonzagen ? schoonzagenMaat : 0
    const usableW = stock.width - border * 2
    const usableH = stock.height - border * 2

    let remaining = [...items]
    let sheetNum = 0

    while (remaining.length > 0) {
      sheetNum++
      const sheetIdx = sheetsUsed.length
      sheetsUsed.push({ stockPanelId: stock.id, sheetNumber: sheetNum })
      totalArea += usableW * usableH

      // Build items for packer, respecting grain/rotation constraints
      const packItems = remaining.map(e => {
        const canRotate = e.part.grainDirection === 'geen'
        return { w: e.bw + kerf, h: e.bh + kerf, canRotate }
      })

      const results = guillotinePack(
        packItems.map(pi => ({ w: pi.w, h: pi.h })),
        usableW,
        usableH,
      )

      const nextRemaining: typeof remaining = []
      for (let i = 0; i < remaining.length; i++) {
        const r = results[i]
        const e = remaining[i]
        const canRotate = e.part.grainDirection === 'geen'

        if (r.x === -1) {
          // Try rotation if allowed and not already tried naturally
          nextRemaining.push(e)
          continue
        }

        // If rotated but grain doesn't allow it, re-check
        if (r.rotated && !canRotate) {
          nextRemaining.push(e)
          continue
        }

        const placedW = round(r.w - kerf)
        const placedH = round(r.h - kerf)
        placements.push({
          partId: e.part.id,
          sheetIndex: sheetIdx,
          stockPanelId: stock.id,
          x: border + r.x,
          y: border + r.y,
          width: placedW,
          height: placedH,
          rotated: r.rotated,
        })
        usedArea += placedW * placedH
      }

      if (nextRemaining.length === remaining.length) {
        // Nothing placed this pass — items don't fit at all
        for (const e of nextRemaining) unplacedPartIds.push(e.part.id)
        break
      }
      remaining = nextRemaining
    }

    sheetsPerStock[material] = sheetNum
  }

  const wasteArea = totalArea - usedArea
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
