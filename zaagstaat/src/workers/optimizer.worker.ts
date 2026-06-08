import { optimizeStripsH, optimizeStripsV } from '../lib/guillotine'
import type { Part, Settings, StockPanel } from '../lib/types'

self.onmessage = (e: MessageEvent<{ parts: Part[]; stockPanels: StockPanel[]; settings: Settings }>) => {
  const { parts, stockPanels, settings } = e.data
  const results = [
    optimizeStripsH(parts, stockPanels, settings),
    optimizeStripsV(parts, stockPanels, settings),
  ]
  self.postMessage({ results })
}
