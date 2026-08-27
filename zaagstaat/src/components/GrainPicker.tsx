import React from 'react'
import type { GrainDirection } from '../lib/types'

const ACCENT = 'var(--accent)'
const GHOST = 'var(--ink-ghost)'

function IconVerticaal({ active }: { active: boolean }) {
  const c = active ? ACCENT : GHOST
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="11" y1="3" x2="11" y2="19" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <polyline points="7,7 11,3 15,7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polyline points="7,15 11,19 15,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconHorizontaal({ active }: { active: boolean }) {
  const c = active ? ACCENT : GHOST
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="3" y1="11" x2="19" y2="11" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <polyline points="7,7 3,11 7,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <polyline points="15,7 19,11 15,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconRotate({ active }: { active: boolean }) {
  const c = active ? ACCENT : GHOST
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M 11 4.5 A 6.5 6.5 0 1 1 4.5 11" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <polyline points="2.5,13 4.5,11 6.5,13" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconNoGrain({ active }: { active: boolean }) {
  const c = active ? ACCENT : GHOST
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
            className="p-1 rounded transition-colors"
            style={active
              ? { background: 'var(--accent-tint)', outline: '1px solid var(--accent)' }
              : undefined
            }
          >
            <Icon active={active} />
          </button>
        )
      })}
    </div>
  )
}
