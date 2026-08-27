import { useState, useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import type { GrainDirection, Part } from '../lib/types'

function newPart(firstMaterial: string): Part {
  return { id: crypto.randomUUID(), label: '', width: 0, height: 0, qty: 1, material: firstMaterial, grainDirection: 'verticaal' }
}

const fieldBase: React.CSSProperties = {
  background: 'var(--field)',
  borderColor: 'var(--line)',
  borderRadius: 'var(--r-field)',
  color: 'var(--ink)',
}

const fieldWarn: React.CSSProperties = {
  background: 'rgba(176,106,58,0.08)',
  borderColor: 'rgba(176,106,58,0.5)',
  borderRadius: 'var(--r-field)',
  color: 'var(--ink)',
}

function GrainButtons({ value, onChange, disabled }: {
  value: GrainDirection; onChange: (v: GrainDirection) => void; disabled: boolean
}) {
  const options: { v: GrainDirection; title: string; svg: React.ReactNode }[] = [
    { v: 'verticaal', title: 'Verticaal', svg: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <line x1="11" y1="3" x2="11" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <polyline points="7,7 11,3 15,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <polyline points="7,15 11,19 15,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )},
    { v: 'horizontaal', title: 'Horizontaal', svg: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <polyline points="7,7 3,11 7,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <polyline points="15,7 19,11 15,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )},
  ]
  return (
    <div className={`flex gap-1 transition-opacity ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      {options.map(({ v, title, svg }) => (
        <button key={v} type="button" title={title} onClick={() => onChange(v)}
          className="p-1 rounded transition-colors"
          style={!disabled && value === v
            ? { background: 'var(--accent-tint)', outline: '1px solid var(--accent)', color: 'var(--accent)' }
            : { color: 'var(--ink-ghost)' }
          }>
          {svg}
        </button>
      ))}
    </div>
  )
}

export function PartsTable() {
  const { parts, stockPanels, settings, addPart, updatePart, removePart } = useProjectStore()
  const materials = stockPanels.map(s => s.label).filter(Boolean)
  const firstMaterial = materials[0] ?? ''
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    if (!focusId) return
    const inputs = document.querySelectorAll<HTMLInputElement>(`[data-label-id="${focusId}"]`)
    for (const el of inputs) {
      if (el.offsetParent !== null) { el.focus(); break }
    }
  }, [focusId])

  function handleAdd() {
    const p = newPart(firstMaterial)
    addPart(p)
    setFocusId(p.id)
  }

  function handleMaterialChange(partId: string, newMaterial: string) {
    const stock = stockPanels.find(s => s.label === newMaterial)
    const patch: Partial<Part> = { material: newMaterial }
    if (stock) patch.grainDirection = stock.grainDirection === 'geen' ? 'geen' : stock.grainDirection
    updatePart(partId, patch)
  }

  function handleGrainCheck(part: Part, checked: boolean) {
    if (!checked) {
      updatePart(part.id, { grainDirection: 'geen' })
    } else {
      const stock = stockPanels.find(s => s.label === part.material)
      const dir: GrainDirection = stock && stock.grainDirection !== 'geen' ? stock.grainDirection : 'verticaal'
      updatePart(part.id, { grainDirection: dir })
    }
  }

  const numStyle = (val: number, extra?: React.CSSProperties): React.CSSProperties => ({
    ...(val ? fieldBase : fieldWarn),
    fontFamily: 'var(--font-mono)',
    ...extra,
  })

  const thStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 500,
  }

  return (
    <section>
      <h2 className="text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>Onderdelen</h2>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-faint)' }}>
        Afmetingen zijn <strong style={{ color: 'var(--ink-soft)' }}>netto</strong>
        {settings.brutomaten && <> — bruto maten (+{settings.overmaat} mm rondom) worden automatisch berekend.</>}
      </p>

      {/* ── Desktop table (sm and up) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--line-strong)' }}>
              <th className="pb-2 pr-2" style={thStyle}>Label</th>
              <th className="pb-2 pr-2" style={thStyle}>Lengte</th>
              <th className="pb-2 pr-2" style={thStyle}>Breedte</th>
              <th className="pb-2 pr-2" style={thStyle}>Aantal</th>
              <th className="pb-2 pr-2" style={thStyle}>Materiaal</th>
              <th className="pb-2 pr-2" style={thStyle}>Nerf</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {parts.map(p => {
              const grainActive = p.grainDirection !== 'geen'
              const stock = stockPanels.find(s => s.label === p.material)
              const stockHasNoGrain = stock?.grainDirection === 'geen'
              return (
                <tr key={p.id} className="border-b" style={{ borderColor: 'var(--line-faint)' }}>
                  <td className="py-1.5 pr-2">
                    <input data-label-id={p.id}
                      className="w-full border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                      style={fieldBase}
                      value={p.label} placeholder="optioneel"
                      onChange={e => updatePart(p.id, { label: e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min={1}
                      className="w-20 border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                      style={numStyle(p.width)}
                      value={p.width || ''} onChange={e => updatePart(p.id, { width: +e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min={1}
                      className="w-20 border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                      style={numStyle(p.height)}
                      value={p.height || ''} onChange={e => updatePart(p.id, { height: +e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min={1}
                      className="w-14 border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                      style={numStyle(p.qty)}
                      value={p.qty || ''} onChange={e => updatePart(p.id, { qty: e.target.value === '' ? 0 : +e.target.value })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select className="border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                      style={fieldBase}
                      value={p.material} onChange={e => handleMaterialChange(p.id, e.target.value)}>
                      {materials.length === 0
                        ? <option value="">— voeg eerst platen toe —</option>
                        : materials.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={grainActive} disabled={stockHasNoGrain}
                        title={stockHasNoGrain ? 'Materiaal heeft geen nerf' : 'Nerf respecteren'}
                        onChange={e => handleGrainCheck(p, e.target.checked)}
                        className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        style={{ accentColor: 'var(--accent)' }} />
                      <GrainButtons value={p.grainDirection} onChange={v => updatePart(p.id, { grainDirection: v })} disabled={!grainActive} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <button onClick={() => removePart(p.id)} className="transition-colors px-1" style={{ color: 'var(--line-strong)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--cut)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--line-strong)')}
                      title="Verwijder">✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (below sm) ── */}
      <div className="sm:hidden space-y-2">
        {parts.map(p => {
          const grainActive = p.grainDirection !== 'geen'
          const stock = stockPanels.find(s => s.label === p.material)
          const stockHasNoGrain = stock?.grainDirection === 'geen'
          return (
            <div key={p.id} className="border rounded-xl p-3 space-y-2" style={{ borderColor: 'var(--line)' }}>
              <div className="flex gap-2 items-center">
                <input data-label-id={p.id}
                  className="flex-1 border px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                  style={fieldBase}
                  value={p.label} placeholder="optioneel"
                  onChange={e => updatePart(p.id, { label: e.target.value })} />
                <button onClick={() => removePart(p.id)} className="transition-colors px-1" style={{ color: 'var(--line-strong)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--cut)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--line-strong)')}
                  title="Verwijder">✕</button>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>L</span>
                  <input type="number" min={1} className="w-20 border px-2 py-1 text-sm focus:outline-none focus:ring-1"
                    style={numStyle(p.width)}
                    value={p.width || ''} onChange={e => updatePart(p.id, { width: +e.target.value })} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>B</span>
                  <input type="number" min={1} className="w-20 border px-2 py-1 text-sm focus:outline-none focus:ring-1"
                    style={numStyle(p.height)}
                    value={p.height || ''} onChange={e => updatePart(p.id, { height: +e.target.value })} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>#</span>
                  <input type="number" min={1} className="w-14 border px-2 py-1 text-sm focus:outline-none focus:ring-1"
                    style={numStyle(p.qty)}
                    value={p.qty || ''} onChange={e => updatePart(p.id, { qty: e.target.value === '' ? 0 : +e.target.value })} />
                </div>
              </div>
              <select className="w-full border px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                style={fieldBase}
                value={p.material} onChange={e => handleMaterialChange(p.id, e.target.value)}>
                {materials.length === 0
                  ? <option value="">— voeg eerst platen toe —</option>
                  : materials.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={grainActive} disabled={stockHasNoGrain}
                  title={stockHasNoGrain ? 'Materiaal heeft geen nerf' : 'Nerf respecteren'}
                  onChange={e => handleGrainCheck(p, e.target.checked)}
                  className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                  style={{ accentColor: 'var(--accent)' }} />
                <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>Nerf</span>
                <GrainButtons value={p.grainDirection} onChange={v => updatePart(p.id, { grainDirection: v })} disabled={!grainActive} />
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={handleAdd} className="mt-3 text-sm font-semibold transition-colors" style={{ color: 'var(--accent)' }}>
        + Onderdeel toevoegen
      </button>
    </section>
  )
}
