import { useProjectStore } from '../store/useProjectStore'

export function SettingsPanel() {
  const { settings, updateSettings } = useProjectStore()

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-700 mb-3">Instellingen</h2>

      <div className="space-y-3">

        {/* Zaagdikte */}
        <Row label="Zaagdikte">
          <NumberInput
            value={settings.kerf}
            onChange={v => updateSettings({ kerf: v })}
            suffix="mm"
          />
        </Row>

        {/* Schoonzagen — toggle + value on one line, value hidden when off */}
        <Row label="Schoonzagen">
          <div className="flex items-center gap-2">
            <Toggle value={settings.schoonzagen} onChange={v => updateSettings({ schoonzagen: v })} />
            {settings.schoonzagen && (
              <NumberInput
                value={settings.schoonzagenMaat}
                onChange={v => updateSettings({ schoonzagenMaat: v })}
                suffix="mm"
              />
            )}
          </div>
        </Row>

        {/* Bruto maten — toggle + value on one line, value hidden when off */}
        <Row label="Bruto maten">
          <div className="flex items-center gap-2">
            <Toggle value={settings.brutomaten} onChange={v => updateSettings({ brutomaten: v })} />
            {settings.brutomaten && (
              <NumberInput
                value={settings.overmaat}
                onChange={v => updateSettings({ overmaat: v })}
                suffix="mm p/k"
              />
            )}
          </div>
        </Row>

        {/* Optimalisatiedoel */}
        <Row label="Doel">
          <select
            className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={settings.optimizationGoal}
            onChange={e => updateSettings({ optimizationGoal: e.target.value as 'minimize-waste' | 'minimize-sheets' })}
          >
            <option value="minimize-waste">Min. uitval</option>
            <option value="minimize-sheets">Min. platen</option>
          </select>
        </Row>

      </div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-32 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={0} step={0.1}
        className="w-16 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={value}
        onChange={e => onChange(+e.target.value)}
      />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  )
}
