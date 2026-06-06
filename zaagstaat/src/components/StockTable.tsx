import { useRef, useState, useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import type { StockPanel } from '../lib/types'
import { GrainPicker } from './GrainPicker'

function newPanel(): StockPanel {
  return { id: crypto.randomUUID(), label: '', width: 2440, height: 1220, grainDirection: 'verticaal' }
}

export function StockTable() {
  const { stockPanels, addStock, updateStock, removeStock } = useProjectStore()
  const labelRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    if (focusId && labelRefs.current[focusId]) {
      labelRefs.current[focusId]?.focus()
      setFocusId(null)
    }
  }, [focusId])

  function handleAdd() {
    const p = newPanel()
    addStock(p)
    setFocusId(p.id)
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-700 mb-2">Plaatmateriaal</h2>
      <p className="text-xs text-slate-400 mb-3">Het programma berekent hoeveel platen nodig zijn.</p>

      {/* ── Desktop table (sm and up) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="pb-1 pr-2 font-medium">Label</th>
              <th className="pb-1 pr-2 font-medium">Lengte (mm)</th>
              <th className="pb-1 pr-2 font-medium">Breedte (mm)</th>
              <th className="pb-1 pr-2 font-medium">Nerf</th>
              <th className="pb-1" />
            </tr>
          </thead>
          <tbody>
            {stockPanels.map(p => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-1 pr-2">
                  <input
                    ref={el => { labelRefs.current[p.id] = el }}
                    className="w-full border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={p.label}
                    placeholder="optioneel"
                    onChange={e => updateStock(p.id, { label: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input type="number" min={1}
                    className={`w-20 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!p.width ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}
                    value={p.width || ''}
                    onChange={e => updateStock(p.id, { width: +e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input type="number" min={1}
                    className={`w-20 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${!p.height ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}
                    value={p.height || ''}
                    onChange={e => updateStock(p.id, { height: +e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <GrainPicker value={p.grainDirection} onChange={v => updateStock(p.id, { grainDirection: v })} noneIcon="prohibited" />
                </td>
                <td className="py-1">
                  <button onClick={() => removeStock(p.id)} className="text-slate-300 hover:text-red-500 transition-colors px-1" title="Verwijder">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (below sm) ── */}
      <div className="sm:hidden space-y-2">
        {stockPanels.map(p => (
          <div key={p.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                ref={el => { labelRefs.current[p.id] = el }}
                className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={p.label}
                placeholder="optioneel"
                onChange={e => updateStock(p.id, { label: e.target.value })}
              />
              <button onClick={() => removeStock(p.id)} className="text-slate-300 hover:text-red-500 transition-colors px-1" title="Verwijder">✕</button>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">L</span>
                <input type="number" min={1}
                  className={`w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${!p.width ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}
                  value={p.width || ''}
                  onChange={e => updateStock(p.id, { width: +e.target.value })}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">B</span>
                <input type="number" min={1}
                  className={`w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${!p.height ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}
                  value={p.height || ''}
                  onChange={e => updateStock(p.id, { height: +e.target.value })}
                />
              </div>
              <GrainPicker value={p.grainDirection} onChange={v => updateStock(p.id, { grainDirection: v })} noneIcon="prohibited" />
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleAdd} className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium transition-colors">
        + Plaat toevoegen
      </button>
    </section>
  )
}
