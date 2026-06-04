import { optimize } from '../lib/guillotine'
import type { Part, Settings, StockPanel } from '../lib/types'

self.onmessage = (e: MessageEvent<{ parts: Part[]; stockPanels: StockPanel[]; settings: Settings }>) => {
  const result = optimize(e.data.parts, e.data.stockPanels, e.data.settings)
  self.postMessage(result)
}
