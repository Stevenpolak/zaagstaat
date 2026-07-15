import { create } from 'zustand'
import type { Part, Project, Settings, StockPanel, OptimizationResult } from '../lib/types'
import { generateCode, expiryDate, saveProject } from '../lib/session'

const DEFAULT_SETTINGS: Settings = {
  kerf: 4,
  schoonzagen: true,
  schoonzagenMaat: 5,
  brutomaten: true,
  overmaat: 5,
  optimizationGoal: 'minimize-waste',
}

function newProject(): Project {
  return {
    sessionCode: generateCode(),
    expiresAt: expiryDate(),
    projectName: '',
    stockPanels: [],
    parts: [],
    settings: { ...DEFAULT_SETTINGS },
    lastResult: null,
  }
}

export const RESULT_LABELS = ['Schulp stroken', 'Afkort stroken'] as const

interface ProjectStore extends Project {
  // session
  startNew: () => void
  loadFromRemote: (data: Project) => void
  updateProjectName: (name: string) => void

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

  // results — allResults is transient (not persisted), lastResult is the active one
  allResults: OptimizationResult[] | null
  activeResultIndex: number
  setResults: (results: OptimizationResult[]) => void
  cycleResult: () => void
  setResult: (result: OptimizationResult) => void  // kept for backward compat

  // persistence
  saveStatus: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  saveError: string | null
  scheduleSave: () => void
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null
let _saveController: AbortController | null = null
let _saveGeneration = 0

function cancelPendingSave() {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = null
  _saveController?.abort()
  _saveController = null
  _saveGeneration++
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...newProject(),
  saveStatus: 'idle',
  saveError: null,
  allResults: null,
  activeResultIndex: 0,

  startNew() {
    cancelPendingSave()
    set({ ...newProject(), allResults: null, activeResultIndex: 0, saveStatus: 'idle', saveError: null })
  },

  loadFromRemote(data) {
    cancelPendingSave()
    set({ ...data, allResults: null, activeResultIndex: 0, saveStatus: 'idle', saveError: null })
  },

  updateProjectName(name) {
    set({ projectName: name })
    get().scheduleSave()
  },

  addStock(panel) {
    set(s => ({ stockPanels: [...s.stockPanels, panel] }))
    get().scheduleSave()
  },
  updateStock(id, patch) {
    set(s => {
      const oldStock = s.stockPanels.find(p => p.id === id)
      const updated = s.stockPanels.map(p => p.id === id ? { ...p, ...patch } : p)
      let updatedParts = s.parts

      // Cascade label change → update material references in all parts
      if ('label' in patch && oldStock && patch.label !== oldStock.label) {
        updatedParts = updatedParts.map(p =>
          p.material === oldStock.label ? { ...p, material: patch.label! } : p
        )
      }

      // Cascade grain direction change → update grain in all parts using this material
      if ('grainDirection' in patch) {
        const stock = updated.find(p => p.id === id)
        if (stock) {
          const newGrain = stock.grainDirection
          updatedParts = updatedParts.map(p =>
            p.material === stock.label
              ? { ...p, grainDirection: newGrain === 'geen' ? 'geen' : newGrain }
              : p
          )
        }
      }

      return { stockPanels: updated, parts: updatedParts }
    })
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

  setResults(results) {
    set({ allResults: results, activeResultIndex: 0, lastResult: results[0] ?? null })
    get().scheduleSave()
  },

  cycleResult() {
    const { allResults, activeResultIndex } = get()
    if (!allResults || allResults.length < 2) return
    const next = (activeResultIndex + 1) % allResults.length
    set({ activeResultIndex: next, lastResult: allResults[next] })
    get().scheduleSave()
  },

  setResult(result) {
    set({ lastResult: result })
    get().scheduleSave()
  },

  scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveController?.abort()
    _saveController = null
    const generation = ++_saveGeneration
    set({ saveStatus: 'pending', saveError: null })
    _saveTimer = setTimeout(async () => {
      _saveTimer = null
      const s = get()
      const controller = new AbortController()
      _saveController = controller
      set({ saveStatus: 'saving', saveError: null })
      try {
        const expiresAt = await saveProject(s.sessionCode, {
          sessionCode: s.sessionCode,
          expiresAt: s.expiresAt,
          projectName: s.projectName,
          stockPanels: s.stockPanels,
          parts: s.parts,
          settings: s.settings,
          lastResult: s.lastResult,
        }, controller.signal)
        if (generation === _saveGeneration) {
          _saveController = null
          set({ expiresAt, saveStatus: 'saved', saveError: null })
        }
      } catch (error) {
        if (controller.signal.aborted || generation !== _saveGeneration) return
        _saveController = null
        set({
          saveStatus: 'error',
          saveError: error instanceof Error ? error.message : 'Opslaan mislukt.',
        })
      }
    }, 2000)
  },
}))
