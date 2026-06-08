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

/**
 * Strip bin-packing (shelf algorithm).
 * direction 'h': horizontal strips across full width, stacked top-to-bottom.
 * direction 'v': vertical strips down full height, stacked left-to-right.
 * Items are returned in the SAME ORDER as the input array (x=-1 for unplaced).
 */
/**
 * Generic strip packer.
 * 'h' = horizontal strips (full width, stacked top-to-bottom).
 *   strip dimension = height; cross dimension = width.
 * 'v' = vertical strips (full height, stacked left-to-right).
 *   strip dimension = width; cross dimension = height.
 * Items are returned in the SAME ORDER as the input array (x=-1 for unplaced).
 * No transposition — v is implemented directly to avoid incorrectly flipping rotated flags.
 */
function stripPack(
  items: { w: number; h: number; canRotate: boolean }[],
  binW: number,
  binH: number,
  direction: 'h' | 'v',
  kerf = 0,
): PackResult {
  const isH = direction === 'h'

  // For each item, choose orientation.
  // H-strips: minimise height → use min dim as h if canRotate.
  // V-strips: minimise width  → use min dim as w if canRotate.
  const oriented = items.map(item => {
    if (item.canRotate) {
      if (isH && item.w < item.h) return { w: item.h, h: item.w, rotated: true }
      if (!isH && item.h < item.w) return { w: item.h, h: item.w, rotated: true }
    }
    return { w: item.w, h: item.h, rotated: false }
  })

  // Sort: strip dimension descending so the first item in each strip sets its size.
  const sortedIdx = items.map((_, i) => i)
    .sort((a, b) => (isH ? oriented[b].h - oriented[a].h : oriented[b].w - oriented[a].w))

  const out: PackResult['placements'] = items.map(it => ({ x: -1, y: -1, w: it.w, h: it.h, rotated: false }))
  const cuts: PackResult['cuts'] = []
  const placed = new Set<number>()

  let stripOffset = 0  // y for h-strips, x for v-strips
  const binStrip = isH ? binH : binW   // total size along the strip-stacking axis
  const binCross = isH ? binW : binH   // total size along the fill axis

  while (placed.size < items.length && stripOffset < binStrip) {
    const stripDim = (i: number) => isH ? oriented[i].h : oriented[i].w
    const crossDim = (i: number) => isH ? oriented[i].w : oriented[i].h

    // Candidates: unplaced, fit in remaining strip space, fit in cross direction
    const candidates = sortedIdx.filter(i =>
      !placed.has(i) &&
      stripDim(i) <= binStrip - stripOffset &&
      crossDim(i) <= binCross
    )
    if (candidates.length === 0) break

    const currentStripSize = stripDim(candidates[0])  // first (largest) item sets strip size
    let crossPos = 0

    for (const idx of candidates) {
      if (stripDim(idx) > currentStripSize) continue
      const cd = crossDim(idx)
      // Allow last piece's trailing kerf to share with the opposite schoonzagen margin
      // → effectively n pieces need only (n-1) kerfs between them
      if (crossPos + cd > binCross + kerf) continue

      const { w, h, rotated } = oriented[idx]
      const x = isH ? crossPos : stripOffset
      const y = isH ? stripOffset : crossPos
      out[idx] = { x, y, w, h, rotated }
      placed.add(idx)

      // Cut along the cross axis (between pieces in the strip)
      if (crossPos + cd < binCross) {
        cuts.push(isH
          ? { orientation: 'vertical',   position: crossPos + cd,      from: stripOffset, to: stripOffset + currentStripSize }
          : { orientation: 'horizontal', position: crossPos + cd,      from: stripOffset, to: stripOffset + currentStripSize }
        )
      }
      crossPos += cd
    }

    // Cut along the strip axis (between strips)
    if (stripOffset + currentStripSize < binStrip) {
      cuts.push(isH
        ? { orientation: 'horizontal', position: stripOffset + currentStripSize, from: 0, to: binCross }
        : { orientation: 'vertical',   position: stripOffset + currentStripSize, from: 0, to: binCross }
      )
    }

    stripOffset += currentStripSize
  }

  return { placements: out, cuts }
}

type PackFn = (items: { w: number; h: number; canRotate: boolean }[], binW: number, binH: number, kerf: number) => PackResult

function runOptimize(
  allParts: Part[],
  stockPanels: StockPanel[],
  settings: Settings,
  packFn: PackFn,
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

  // Sort each group: largest area first (min-waste) or longest dimension first (min-sheets)
  for (const items of Object.values(byMaterial)) {
    if (settings.optimizationGoal === 'minimize-sheets') {
      items.sort((a, b) => Math.max(b.bw, b.bh) - Math.max(a.bw, a.bh))
    } else {
      items.sort((a, b) => b.bw * b.bh - a.bw * a.bh)
    }
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

      const { placements: results, cuts } = packFn(packItems, usableW, usableH, kerf)

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

export function optimize(parts: Part[], stocks: StockPanel[], settings: Settings): OptimizationResult {
  return runOptimize(parts, stocks, settings, (items, bW, bH) => guillotinePack(items, bW, bH))
}

export function optimizeStripsH(parts: Part[], stocks: StockPanel[], settings: Settings): OptimizationResult {
  return runOptimize(parts, stocks, settings, (items, bW, bH, kerf) => stripPack(items, bW, bH, 'h', kerf))
}

export function optimizeStripsV(parts: Part[], stocks: StockPanel[], settings: Settings): OptimizationResult {
  return runOptimize(parts, stocks, settings, (items, bW, bH, kerf) => stripPack(items, bW, bH, 'v', kerf))
}
