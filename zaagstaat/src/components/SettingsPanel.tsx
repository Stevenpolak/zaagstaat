import { useProjectStore } from '../store/useProjectStore'

export function SettingsPanel() {
  const { settings, updateSettings } = useProjectStore()

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-700 mb-3">Instellingen</h2>

      <div className="space-y-4">
        {/* Zaagdikte */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600">Zaagdikte (mm)</label>
          <input
            type="number" min={0} step={0.1}
            className="w-20 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={settings.kerf}
            onChange={e => updateSettings({ kerf: +e.target.value })}
          />
        </div>

        {/* Schoonzagen */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Schoonzagen</label>
            <Toggle
              value={settings.schoonzagen}
              onChange={v => updateSettings({ schoonzagen: v })}
            />
          </div>
          {settings.schoonzagen && (
            <div className="flex items-center justify-between mt-2 pl-4">
              <label className="text-xs text-slate-400">Maat per kant (mm)</label>
              <input
                type="number" min={0}
                className="w-20 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={settings.schoonzagenMaat}
                onChange={e => updateSettings({ schoonzagenMaat: +e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Bruto maten */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-slate-600">Bruto maten</label>
              <p className="text-xs text-slate-400">Overmaat per kant toevoegen</p>
            </div>
            <Toggle
              value={settings.brutomaten}
              onChange={v => updateSettings({ brutomaten: v })}
            />
          </div>
          {settings.brutomaten && (
            <div className="flex items-center justify-between mt-2 pl-4">
              <label className="text-xs text-slate-400">Overmaat per kant (mm)</label>
              <input
                type="number" min={0}
                className="w-20 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={settings.overmaat}
                onChange={e => updateSettings({ overmaat: +e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Optimalisatiedoel */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600">Optimalisatiedoel</label>
          <select
            className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={settings.optimizationGoal}
            onChange={e => updateSettings({ optimizationGoal: e.target.value as 'minimize-waste' | 'minimize-sheets' })}
          >
            <option value="minimize-waste">Minimaliseer uitval</option>
            <option value="minimize-sheets">Minimaliseer platen</option>
          </select>
        </div>
      </div>
    </section>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}
