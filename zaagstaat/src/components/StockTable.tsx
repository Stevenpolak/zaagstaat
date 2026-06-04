import { useProjectStore } from '../store/useProjectStore'
import type { StockPanel } from '../lib/types'
import { GrainPicker } from './GrainPicker'

function newPanel(): StockPanel {
  // Standard sheet: 2440 mm (lengte) × 1220 mm (breedte)
  return { id: crypto.randomUUID(), label: '', width: 2440, height: 1220, grainDirection: 'verticaal' }
}

export function StockTable() {
  const { stockPanels, addStock, updateStock, removeStock } = useProjectStore()

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-700 mb-2">Plaatmateriaal</h2>
      <p className="text-xs text-slate-400 mb-3">Het programma berekent hoeveel platen nodig zijn.</p>

      <div className="overflow-x-auto">
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
                    className="w-full border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={p.label}
                    placeholder="bijv. Birkenmultiplex 18mm"
                    onChange={e => updateStock(p.id, { label: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number" min={1}
                    className="w-20 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={p.width}
                    onChange={e => updateStock(p.id, { width: +e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number" min={1}
                    className="w-20 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={p.height}
                    onChange={e => updateStock(p.id, { height: +e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <GrainPicker
                    value={p.grainDirection}
                    onChange={v => updateStock(p.id, { grainDirection: v })}
                  />
                </td>
                <td className="py-1">
                  <button
                    onClick={() => removeStock(p.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors px-1"
                    title="Verwijder"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => addStock(newPanel())}
        className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium transition-colors"
      >
        + Plaat toevoegen
      </button>
    </section>
  )
}
