import React from 'react'
import type { GrainDirection } from '../lib/types'

function IconVerticaal({ active }: { active: boolean }) {
  const c = active ? '#1d4ed8' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="11" y1="3" x2="11" y2="19" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <polyline points="7,7 11,3 15,7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polyline points="7,15 11,19 15,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconHorizontaal({ active }: { active: boolean }) {
  const c = active ? '#1d4ed8' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="3" y1="11" x2="19" y2="11" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <polyline points="7,7 3,11 7,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polyline points="15,7 19,11 15,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

/** Circular rotation arrow — for parts: "mag vrij draaien" */
function IconRotate({ active }: { active: boolean }) {
  const c = active ? '#1d4ed8' : '#94a3b8'
  // 270° clockwise arc: start at top (11,4.5), end at left (4.5,11)
  // center (11,11), r=6.5 — large-arc=1, sweep=1 (clockwise)
  // Tangent at left point is straight down → arrowhead opens upward
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M 11 4.5 A 6.5 6.5 0 1 1 4.5 11"
        stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"
      />
      {/* arrowhead at (4.5,11) pointing downward (clockwise tangent) */}
      <polyline points="2.5,9 4.5,11 6.5,9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

/** Circle with diagonal slash — for sheets: "geen nerf gedefinieerd" */
function IconNoGrain({ active }: { active: boolean }) {
  const c = active ? '#1d4ed8' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="7.5" stroke={c} strokeWidth="2"/>
      <line x1="5.7" y1="5.7" x2="16.3" y2="16.3" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

interface Props {
  value: GrainDirection
  onChange: (v: GrainDirection) => void
  /** 'rotate' = circular arrow (parts), 'prohibited' = circle-slash (sheets) */
  noneIcon?: 'rotate' | 'prohibited'
}

export function GrainPicker({ value, onChange, noneIcon = 'rotate' }: Props) {
  const NoneIcon = noneIcon === 'prohibited' ? IconNoGrain : IconRotate
  const noneLabel = noneIcon === 'prohibited' ? 'Geen nerf' : 'Vrij draaien'

  const options: { value: GrainDirection; label: string; Icon: (p: { active: boolean }) => React.ReactElement }[] = [
    { value: 'verticaal',   label: 'Verticaal',  Icon: IconVerticaal },
    { value: 'horizontaal', label: 'Horizontaal', Icon: IconHorizontaal },
    { value: 'geen',        label: noneLabel,    Icon: NoneIcon },
  ]

  return (
    <div className="flex gap-1">
      {options.map(({ value: v, label, Icon }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            title={label}
            onClick={() => onChange(v)}
            className={`p-1 rounded transition-colors ${
              active ? 'bg-blue-100 ring-1 ring-blue-400' : 'hover:bg-slate-100'
            }`}
          >
            <Icon active={active} />
          </button>
        )
      })}
    </div>
  )
}
