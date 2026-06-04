import { useProjectStore } from '../store/useProjectStore'
import type { GrainDirection, Part } from '../lib/types'

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

// Inline V / H arrow buttons (no "geen" option — checkbox handles that)
function GrainButtons({ value, onChange, disabled }: {
  value: GrainDirection
  onChange: (v: GrainDirection) => void
  disabled: boolean
}) {
  const options: { v: GrainDirection; title: string; svg: React.ReactNode }[] = [
    {
      v: 'verticaal', title: 'Verticaal',
      svg: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <line x1="11" y1="3" x2="11" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <polyline points="7,7 11,3 15,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <polyline points="7,15 11,19 15,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
    },
    {
      v: 'horizontaal', title: 'Horizontaal',
      svg: (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <polyline points="7,7 3,11 7,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <polyline points="15,7 19,11 15,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
    },
  ]

  return (
    <div className={`flex gap-1 transition-opacity ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      {options.map(({ v, title, svg }) => {
        const active = !disabled && value === v
        return (
          <button
            key={v}
            type="button"
            title={title}
            onClick={() => onChange(v)}
            className={`p-1 rounded transition-colors ${
              active ? 'bg-blue-100 ring-1 ring-blue-400 text-blue-700' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            {svg}
          </button>
        )
      })}
    </div>
  )
}

export function PartsTable() {
  const { parts, stockPanels, settings, addPart, updatePart, removePart } = useProjectStore()
  const materials = stockPanels.map(s => s.label).filter(Boolean)
  const firstMaterial = materials[0] ?? ''

  function handleMaterialChange(partId: string, newMaterial: string) {
    const stock = stockPanels.find(s => s.label === newMaterial)
    const patch: Partial<Part> = { material: newMaterial }
    // Auto-sync grain: match stock grain, or clear if stock has none
    if (stock) {
      patch.grainDirection = stock.grainDirection === 'geen' ? 'geen' : stock.grainDirection
    }
    updatePart(partId, patch)
  }

  function handleGrainCheck(part: Part, checked: boolean) {
    if (!checked) {
      updatePart(part.id, { grainDirection: 'geen' })
    } else {
      // Re-enable: default to matching stock grain, or verticaal
      const stock = stockPanels.find(s => s.label === part.material)
      const dir: GrainDirection =
        stock && stock.grainDirection !== 'geen' ? stock.grainDirection : 'verticaal'
      updatePart(part.id, { grainDirection: dir })
    }
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-700 mb-1">Onderdelen</h2>
      <p className="text-xs text-slate-400 mb-3">
        Afmetingen zijn <strong>netto</strong>
        {settings.brutomaten && (
          <> — bruto maten (+{settings.overmaat} mm rondom) worden automatisch berekend.</>
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
            {parts.map(p => {
              const grainActive = p.grainDirection !== 'geen'
              const stock = stockPanels.find(s => s.label === p.material)
              const stockHasNoGrain = stock?.grainDirection === 'geen'

              return (
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
                      onChange={e => handleMaterialChange(p.id, e.target.value)}
                    >
                      {materials.length === 0
                        ? <option value="">— voeg eerst platen toe —</option>
                        : materials.map(m => <option key={m} value={m}>{m}</option>)
                      }
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={grainActive}
                        disabled={stockHasNoGrain}
                        title={stockHasNoGrain ? 'Materiaal heeft geen nerf' : 'Nerf respecteren'}
                        onChange={e => handleGrainCheck(p, e.target.checked)}
                        className="accent-blue-600 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <GrainButtons
                        value={p.grainDirection}
                        onChange={v => updatePart(p.id, { grainDirection: v })}
                        disabled={!grainActive}
                      />
                    </div>
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => removePart(p.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors px-1"
                      title="Verwijder"
                    >✕</button>
                  </td>
                </tr>
              )
            })}
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
