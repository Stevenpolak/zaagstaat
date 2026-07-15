import { useState, useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import type { GrainDirection, StockPanel } from '../lib/types'

function newPanel(): StockPanel {
  return { id: crypto.randomUUID(), label: '', width: 2440, height: 1220, grainDirection: 'verticaal' }
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

function StockGrainControl({ value, onChange }: { value: GrainDirection; onChange: (v: GrainDirection) => void }) {
  const grainActive = value !== 'geen'

  function handleCheck(checked: boolean) {
    onChange(checked ? 'verticaal' : 'geen')
  }

  return (
    <div className="flex items-center gap-2">
      <input type="checkbox" checked={grainActive}
        title="Nerf respecteren"
        onChange={e => handleCheck(e.target.checked)}
        className="w-4 h-4 cursor-pointer"
        style={{ accentColor: 'var(--accent)' }} />
      <GrainButtons value={value} onChange={onChange} disabled={!grainActive} />
    </div>
  )
}

export function StockTable() {
  const { stockPanels, addStock, updateStock, removeStock } = useProjectStore()
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    if (!focusId) return
    const inputs = document.querySelectorAll<HTMLInputElement>(`[data-label-id="${focusId}"]`)
    for (const el of inputs) {
      if (el.offsetParent !== null) { el.focus(); break }
    }
  }, [focusId])

  function handleAdd() {
    const p = newPanel()
    addStock(p)
    setFocusId(p.id)
  }

  const thStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--ink-faint)',
    fontWeight: 500,
  }

  return (
    <section>
      <h2 className="text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>Plaatmateriaal</h2>
      <p className="text-xs mb-3" style={{ color: 'var(--ink-faint)' }}>Het programma berekent hoeveel platen nodig zijn.</p>

      {/* ── Desktop table (sm and up) ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: 'var(--line-strong)' }}>
              <th className="pb-2 pr-2" style={thStyle}>Label</th>
              <th className="pb-2 pr-2" style={thStyle}>Lengte</th>
              <th className="pb-2 pr-2" style={thStyle}>Breedte</th>
              <th className="pb-2 pr-2" style={thStyle}>Nerf</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {stockPanels.map(p => (
              <tr key={p.id} className="border-b" style={{ borderColor: 'var(--line-faint)' }}>
                <td className="py-1.5 pr-2">
                  <input
                    data-label-id={p.id}
                    className="w-full border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                    style={!p.label ? fieldWarn : fieldBase}
                    value={p.label}
                    placeholder="bijv. Multiplex 18mm"
                    onChange={e => updateStock(p.id, { label: e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input type="number" min={1}
                    className="w-20 border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                    style={{ ...(!p.width ? fieldWarn : fieldBase), fontFamily: 'var(--font-mono)' }}
                    value={p.width || ''}
                    onChange={e => updateStock(p.id, { width: +e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input type="number" min={1}
                    className="w-20 border px-2 py-1.5 focus:outline-none focus:ring-1 text-sm"
                    style={{ ...(!p.height ? fieldWarn : fieldBase), fontFamily: 'var(--font-mono)' }}
                    value={p.height || ''}
                    onChange={e => updateStock(p.id, { height: +e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <StockGrainControl value={p.grainDirection} onChange={v => updateStock(p.id, { grainDirection: v })} />
                </td>
                <td className="py-1.5">
                  <button onClick={() => removeStock(p.id)} className="transition-colors px-1" style={{ color: 'var(--line-strong)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--cut)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--line-strong)')}
                    title="Verwijder">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (below sm) ── */}
      <div className="sm:hidden space-y-2">
        {stockPanels.map(p => (
          <div key={p.id} className="border rounded-xl p-3 space-y-2" style={{ borderColor: 'var(--line)' }}>
            <div className="flex gap-2 items-center">
              <input
                data-label-id={p.id}
                className="flex-1 border px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                style={!p.label ? fieldWarn : fieldBase}
                value={p.label}
                placeholder="bijv. Multiplex 18mm"
                onChange={e => updateStock(p.id, { label: e.target.value })}
              />
              <button onClick={() => removeStock(p.id)} className="transition-colors px-1" style={{ color: 'var(--line-strong)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--cut)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--line-strong)')}
                title="Verwijder">✕</button>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>L</span>
                <input type="number" min={1}
                  className="w-20 border px-2 py-1 text-sm focus:outline-none focus:ring-1"
                  style={{ ...(!p.width ? fieldWarn : fieldBase), fontFamily: 'var(--font-mono)' }}
                  value={p.width || ''}
                  onChange={e => updateStock(p.id, { width: +e.target.value })}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>B</span>
                <input type="number" min={1}
                  className="w-20 border px-2 py-1 text-sm focus:outline-none focus:ring-1"
                  style={{ ...(!p.height ? fieldWarn : fieldBase), fontFamily: 'var(--font-mono)' }}
                  value={p.height || ''}
                  onChange={e => updateStock(p.id, { height: +e.target.value })}
                />
              </div>
              <StockGrainControl value={p.grainDirection} onChange={v => updateStock(p.id, { grainDirection: v })} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleAdd} className="mt-3 text-sm font-semibold transition-colors" style={{ color: 'var(--accent)' }}>
        + Plaat toevoegen
      </button>
    </section>
  )
}
