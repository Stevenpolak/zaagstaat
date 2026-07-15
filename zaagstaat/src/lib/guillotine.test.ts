import { describe, it, expect } from 'vitest'
import { optimize } from './guillotine'
import type { Part, Settings, StockPanel } from './types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const sheet = (overrides: Partial<StockPanel> = {}): StockPanel => ({
  id: 's1',
  label: 'Plaat',
  width: 2440,
  height: 1220,
  grainDirection: 'verticaal',
  ...overrides,
})

const part = (overrides: Partial<Part> = {}): Part => ({
  id: 'p1',
  label: 'Deel',
  width: 400,
  height: 300,
  qty: 1,
  material: 'Plaat',
  grainDirection: 'verticaal',
  ...overrides,
})

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  kerf: 0,
  schoonzagen: false,
  schoonzagenMaat: 0,
  brutomaten: false,
  overmaat: 0,
  optimizationGoal: 'minimize-waste',
  ...overrides,
})

// ── Basic placement ───────────────────────────────────────────────────────────

describe('basic placement', () => {
  it('places a single part on one sheet', () => {
    const result = optimize([part()], [sheet()], settings())
    expect(result.placements).toHaveLength(1)
    expect(result.unplacedPartIds).toHaveLength(0)
    expect(result.sheetsUsed).toHaveLength(1)
  })

  it('places multiple quantities of the same part', () => {
    const result = optimize([part({ qty: 4 })], [sheet()], settings())
    expect(result.placements).toHaveLength(4)
    expect(result.unplacedPartIds).toHaveLength(0)
  })

  it('uses a second sheet when parts overflow the first', () => {
    // Each part is 1200×600, sheet is 2440×1220 — fits 4 max (2×2)
    // With 5 parts, a second sheet is needed
    const result = optimize(
      [part({ width: 1200, height: 600, qty: 5 })],
      [sheet()],
      settings(),
    )
    expect(result.sheetsUsedPerStock['Plaat']).toBe(2)
    expect(result.placements).toHaveLength(5)
  })
})

// ── Material matching ─────────────────────────────────────────────────────────

describe('material matching', () => {
  it('only places parts on sheets with the matching label', () => {
    const result = optimize(
      [part({ material: 'MDF' })],
      [sheet({ label: 'Plaat' })],
      settings(),
    )
    expect(result.placements).toHaveLength(0)
    expect(result.unplacedPartIds).toContain('p1')
  })

  it('places parts on the correct sheet when multiple stock types exist', () => {
    const result = optimize(
      [
        part({ id: 'a', material: 'Berkenplex' }),
        part({ id: 'b', material: 'MDF' }),
      ],
      [
        sheet({ id: 's1', label: 'Berkenplex' }),
        sheet({ id: 's2', label: 'MDF' }),
      ],
      settings(),
    )
    const placedA = result.placements.find(p => p.partId === 'a')
    const placedB = result.placements.find(p => p.partId === 'b')
    expect(placedA?.stockPanelId).toBe('s1')
    expect(placedB?.stockPanelId).toBe('s2')
  })
})

// ── Grain direction ───────────────────────────────────────────────────────────

describe('grain direction', () => {
  it('does not rotate a part when grain matches the sheet', () => {
    const result = optimize(
      [part({ width: 500, height: 200, grainDirection: 'verticaal' })],
      [sheet({ grainDirection: 'verticaal' })],
      settings(),
    )
    expect(result.placements[0].rotated).toBe(false)
    expect(result.placements[0].width).toBe(500)
    expect(result.placements[0].height).toBe(200)
  })

  it('pre-rotates a part when its grain differs from the sheet grain', () => {
    // Part is 500×200 with horizontaal grain on a verticaal sheet → must rotate
    const result = optimize(
      [part({ width: 500, height: 200, grainDirection: 'horizontaal' })],
      [sheet({ grainDirection: 'verticaal' })],
      settings(),
    )
    expect(result.placements[0].rotated).toBe(true)
    // Placed dimensions should be swapped
    expect(result.placements[0].width).toBe(200)
    expect(result.placements[0].height).toBe(500)
  })

  it('allows free rotation when grainDirection is geen', () => {
    // Tall narrow part (100×600) — packer should be free to rotate it to fit better
    const result = optimize(
      [part({ width: 100, height: 600, qty: 3, grainDirection: 'geen' })],
      [sheet({ grainDirection: 'verticaal' })],
      settings(),
    )
    expect(result.placements).toHaveLength(3)
    expect(result.unplacedPartIds).toHaveLength(0)
  })
})

// ── Schoonzagen ───────────────────────────────────────────────────────────────

describe('schoonzagen', () => {
  it('reduces usable area by the schoonzagen border', () => {
    // Sheet 2440×1220, schoonzagen 10mm each side → usable 2420×1200
    // Part that fits in 2420×1200 but not in 2440×1220 with 10mm border...
    // Use a part that fills almost the full usable area:
    const result = optimize(
      [part({ width: 2420, height: 1200 })],
      [sheet()],
      settings({ schoonzagen: true, schoonzagenMaat: 10 }),
    )
    expect(result.placements).toHaveLength(1)
    // Placement x and y should be offset by the schoonzagen border
    expect(result.placements[0].x).toBe(10)
    expect(result.placements[0].y).toBe(10)
  })

  it('rejects a part that fits the sheet but not the usable area after schoonzagen', () => {
    // Part exactly the size of the full sheet — won't fit with any border
    const result = optimize(
      [part({ width: 2440, height: 1220 })],
      [sheet()],
      settings({ schoonzagen: true, schoonzagenMaat: 10 }),
    )
    expect(result.unplacedPartIds).toContain('p1')
  })
})

// ── Bruto maten ───────────────────────────────────────────────────────────────

describe('bruto maten', () => {
  it('adds overmaat to part dimensions before placing', () => {
    // Netto 400×300, overmaat 5 → placed as 410×310
    const result = optimize(
      [part({ width: 400, height: 300 })],
      [sheet()],
      settings({ brutomaten: true, overmaat: 5 }),
    )
    expect(result.placements[0].width).toBe(410)
    expect(result.placements[0].height).toBe(310)
  })

  it('a part that fits netto but not bruto is unplaced', () => {
    // Sheet 500×500, part netto 492×492 fits netto but bruto = 502×502 → does not fit
    const result = optimize(
      [part({ width: 492, height: 492 })],
      [sheet({ width: 500, height: 500 })],
      settings({ brutomaten: true, overmaat: 5 }),
    )
    expect(result.unplacedPartIds).toContain('p1')
  })
})

// ── Kerf ──────────────────────────────────────────────────────────────────────

describe('kerf', () => {
  it('accounts for kerf between parts', () => {
    // Sheet 100 wide, two parts of 48 wide with kerf 4 = 48+4+48 = 100 → fits exactly
    const result = optimize(
      [part({ width: 48, height: 50, qty: 2 })],
      [sheet({ width: 100, height: 100 })],
      settings({ kerf: 4 }),
    )
    expect(result.placements).toHaveLength(2)
    expect(result.unplacedPartIds).toHaveLength(0)
  })

  it('rejects second part when kerf makes it too tight', () => {
    // Sheet 100 wide, two parts of 49 wide with kerf 4 = 49+4+49 = 102 → doesn't fit
    const result = optimize(
      [part({ width: 49, height: 50, qty: 2 })],
      [sheet({ width: 100, height: 100 })],
      settings({ kerf: 4 }),
    )
    // First fits, second goes to sheet 2
    expect(result.sheetsUsedPerStock['Plaat']).toBe(2)
  })
})

// ── Waste calculation ─────────────────────────────────────────────────────────

describe('waste calculation', () => {
  it('reports zero waste when part perfectly fills the sheet', () => {
    const result = optimize(
      [part({ width: 2440, height: 1220 })],
      [sheet()],
      settings(),
    )
    expect(result.wastePercent).toBe(0)
  })

  it('reports correct waste percentage', () => {
    // Sheet 1000×1000, part 500×500 → 25% used, 75% waste
    const result = optimize(
      [part({ width: 500, height: 500 })],
      [sheet({ width: 1000, height: 1000 })],
      settings(),
    )
    expect(result.wastePercent).toBe(75)
  })
})

describe('unplaceable parts', () => {
  it('does not count an empty sheet when no part fits', () => {
    const result = optimize(
      [part({ width: 2_000, height: 2_000 })],
      [sheet({ width: 1_000, height: 1_000 })],
      settings(),
    )

    expect(result.placements).toHaveLength(0)
    expect(result.sheetsUsed).toHaveLength(0)
    expect(result.sheetsUsedPerStock.Plaat).toBe(0)
    expect(result.totalArea).toBe(0)
    expect(result.unplacedPartIds).toContain('p1')
  })
})
