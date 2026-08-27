export type GrainDirection = 'verticaal' | 'horizontaal' | 'geen'

export interface StockPanel {
  id: string
  label: string
  width: number   // mm
  height: number  // mm
  grainDirection: GrainDirection
}

export interface Part {
  id: string
  label: string
  width: number   // mm netto
  height: number  // mm netto
  qty: number
  material: string // matches StockPanel.label
  grainDirection: GrainDirection
}

export interface Settings {
  kerf: number             // mm, default 3.2
  schoonzagen: boolean     // default true
  schoonzagenMaat: number  // mm per side, default 10
  brutomaten: boolean      // default true
  overmaat: number         // mm per side, default 5
  optimizationGoal: 'minimize-waste' | 'minimize-sheets'
}

export interface PlacedPart {
  partId: string
  sheetIndex: number       // index into sheetsUsed
  stockPanelId: string
  x: number  // mm from sheet origin (after schoonzagen offset)
  y: number
  width: number   // bruto width as placed
  height: number  // bruto height as placed
  rotated: boolean
}

export interface SheetUsed {
  stockPanelId: string
  sheetNumber: number  // 1-based, per stock type
}

export interface CutLine {
  sheetIndex: number
  orientation: 'horizontal' | 'vertical'
  position: number  // mm along the cutting axis (incl. schoonzagen offset)
  from: number      // start along the other axis
  to: number        // end along the other axis
}

export interface OptimizationResult {
  placements: PlacedPart[]
  sheetsUsed: SheetUsed[]
  sheetsUsedPerStock: Record<string, number>  // label → count
  totalArea: number    // mm²
  usedArea: number     // mm²
  wasteArea: number    // mm²
  wastePercent: number
  unplacedPartIds: string[]
  cutLines: CutLine[]
}

export interface Project {
  sessionCode: string
  expiresAt: string   // ISO date string
  projectName: string
  stockPanels: StockPanel[]
  parts: Part[]
  settings: Settings
  lastResult: OptimizationResult | null
  /** Both strip directions; optional so projects saved before v1.6.2 still load. */
  allResults?: OptimizationResult[] | null
  activeResultIndex?: number
}
