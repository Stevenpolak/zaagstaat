import { create } from 'zustand'
import type { Part, Project, Settings, StockPanel, OptimizationResult } from '../lib/types'
import { generateCode, expiryDate, saveProject } from '../lib/session'

const DEFAULT_SETTINGS: Settings = {
  kerf: 3.2,
  schoonzagen: true,
  schoonzagenMaat: 10,
  brutomaten: true,
  overmaat: 5,
  optimizationGoal: 'minimize-waste',
}

function newProject(): Project {
  return {
    sessionCode: generateCode(),
    expiresAt: expiryDate(),
    stockPanels: [],
    parts: [],
    settings: { ...DEFAULT_SETTINGS },
    lastResult: null,
  }
}

interface ProjectStore extends Project {
  // session
  startNew: () => void
  loadFromRemote: (data: Project) => void

  // stock
  addStock: (panel: StockPanel) => void
  updateStock: (id: string, patch: Partial<StockPanel>) => void
  removeStock: (id: string) => void

  // parts
  addPart: (part: Part) => void
  updatePart: (id: string, patch: Partial<Part>) => void
  removePart: (id: string) => void

  // settings
  updateSettings: (patch: Partial<Settings>) => void

  // results
  setResult: (result: OptimizationResult) => void

  // persistence
  _saveTimer: ReturnType<typeof setTimeout> | null
  scheduleSave: () => void
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...newProject(),
  _saveTimer: null,

  startNew() {
    set(newProject())
  },

  loadFromRemote(data) {
    set({ ...data })
  },

  addStock(panel) {
    set(s => ({ stockPanels: [...s.stockPanels, panel] }))
    get().scheduleSave()
  },
  updateStock(id, patch) {
    set(s => ({
      stockPanels: s.stockPanels.map(p => p.id === id ? { ...p, ...patch } : p),
    }))
    get().scheduleSave()
  },
  removeStock(id) {
    set(s => ({ stockPanels: s.stockPanels.filter(p => p.id !== id) }))
    get().scheduleSave()
  },

  addPart(part) {
    set(s => ({ parts: [...s.parts, part] }))
    get().scheduleSave()
  },
  updatePart(id, patch) {
    set(s => ({
      parts: s.parts.map(p => p.id === id ? { ...p, ...patch } : p),
    }))
    get().scheduleSave()
  },
  removePart(id) {
    set(s => ({ parts: s.parts.filter(p => p.id !== id) }))
    get().scheduleSave()
  },

  updateSettings(patch) {
    set(s => ({ settings: { ...s.settings, ...patch } }))
    get().scheduleSave()
  },

  setResult(result) {
    set({ lastResult: result })
    get().scheduleSave()
  },

  scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(async () => {
      const s = get()
      try {
        await saveProject(s.sessionCode, {
          sessionCode: s.sessionCode,
          expiresAt: s.expiresAt,
          stockPanels: s.stockPanels,
          parts: s.parts,
          settings: s.settings,
          lastResult: s.lastResult,
        })
      } catch {
        // silent — no network in offline mode
      }
    }, 2000)
  },
}))
