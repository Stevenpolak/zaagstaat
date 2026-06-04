import { useProjectStore } from '../store/useProjectStore'
import type { Part } from '../lib/types'
import { GrainPicker } from './GrainPicker'

function newPart(firstMaterial: string): Part {
  return {
    id: crypto.randomUUID(),
    label: '',
    width: 0,
    height: 0,
    qty: 1,
    material: firstMaterial,
    grainDirection: 'verticaal',
  }
}

export function PartsTable() {
  const { parts, stockPanels, settings, addPart, updatePart, removePart } = useProjectStore()
  const materials = stockPanels.map(s => s.label).filter(Boolean)
  const firstMaterial = materials[0] ?? ''

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-700 mb-1">Onderdelen</h2>
      <p className="text-xs text-slate-400 mb-3">
        Afmetingen zijn <strong>netto</strong>
        {settings.brutomaten && (
          <> — bruto maten (+{settings.overmaat} mm per kant) worden automatisch berekend.</>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="pb-1 pr-2 font-medium">Label</th>
              <th className="pb-1 pr-2 font-medium">Lengte (mm)</th>
              <th className="pb-1 pr-2 font-medium">Breedte (mm)</th>
              <th className="pb-1 pr-2 font-medium">Aantal</th>
              <th className="pb-1 pr-2 font-medium">Materiaal</th>
              <th className="pb-1 pr-2 font-medium">Nerf</th>
              <th className="pb-1" />
            </tr>
          </thead>
          <tbody>
            {parts.map(p => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-1 pr-2">
                  <input
                    className="w-full border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={p.label}
                    placeholder="bijv. Zijwand"
                    onChange={e => updatePart(p.id, { label: e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number" min={1}
                    className={`w-20 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                      !p.width ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
                    }`}
                    value={p.width || ''}
                    onChange={e => updatePart(p.id, { width: +e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number" min={1}
                    className={`w-20 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                      !p.height ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
                    }`}
                    value={p.height || ''}
                    onChange={e => updatePart(p.id, { height: +e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number" min={1}
                    className={`w-14 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                      !p.qty ? 'border-orange-300 bg-orange-50' : 'border-slate-200'
                    }`}
                    value={p.qty || ''}
                    onChange={e => updatePart(p.id, { qty: e.target.value === '' ? 0 : +e.target.value })}
                  />
                </td>
                <td className="py-1 pr-2">
                  <select
                    className="border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={p.material}
                    onChange={e => updatePart(p.id, { material: e.target.value })}
                  >
                    {materials.length === 0
                      ? <option value="">— voeg eerst platen toe —</option>
                      : materials.map(m => <option key={m} value={m}>{m}</option>)
                    }
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <GrainPicker
                    value={p.grainDirection}
                    onChange={v => updatePart(p.id, { grainDirection: v })}
                  />
                </td>
                <td className="py-1">
                  <button
                    onClick={() => removePart(p.id)}
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
        onClick={() => addPart(newPart(firstMaterial))}
        className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium transition-colors"
      >
        + Onderdeel toevoegen
      </button>
    </section>
  )
}
