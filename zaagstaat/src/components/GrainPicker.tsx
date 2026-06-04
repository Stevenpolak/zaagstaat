import type { GrainDirection } from '../lib/types'

// SVG icons for each grain direction
function IconVerticaal({ active }: { active: boolean }) {
  const c = active ? '#1d4ed8' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* shaft */}
      <line x1="11" y1="3" x2="11" y2="19" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      {/* top arrowhead */}
      <polyline points="7,7 11,3 15,7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* bottom arrowhead */}
      <polyline points="7,15 11,19 15,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconHorizontaal({ active }: { active: boolean }) {
  const c = active ? '#1d4ed8' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* shaft */}
      <line x1="3" y1="11" x2="19" y2="11" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      {/* left arrowhead */}
      <polyline points="7,7 3,11 7,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* right arrowhead */}
      <polyline points="15,7 19,11 15,15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconGeen({ active }: { active: boolean }) {
  const c = active ? '#1d4ed8' : '#94a3b8'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* 4 short arrows pointing outward: up, down, left, right */}
      {/* up */}
      <line x1="11" y1="11" x2="11" y2="4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="8.5,6.5 11,4 13.5,6.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* down */}
      <line x1="11" y1="11" x2="11" y2="18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="8.5,15.5 11,18 13.5,15.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* left */}
      <line x1="11" y1="11" x2="4" y2="11" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="6.5,8.5 4,11 6.5,13.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* right */}
      <line x1="11" y1="11" x2="18" y2="11" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="15.5,8.5 18,11 15.5,13.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

const OPTIONS: { value: GrainDirection; label: string; Icon: typeof IconVerticaal }[] = [
  { value: 'verticaal',   label: 'Verticaal',   Icon: IconVerticaal },
  { value: 'horizontaal', label: 'Horizontaal', Icon: IconHorizontaal },
  { value: 'geen',        label: 'Geen',        Icon: IconGeen },
]

interface Props {
  value: GrainDirection
  onChange: (v: GrainDirection) => void
}

export function GrainPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map(({ value: v, label, Icon }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            title={label}
            onClick={() => onChange(v)}
            className={`p-1 rounded transition-colors ${
              active
                ? 'bg-blue-100 ring-1 ring-blue-400'
                : 'hover:bg-slate-100'
            }`}
          >
            <Icon active={active} />
          </button>
        )
      })}
    </div>
  )
}
