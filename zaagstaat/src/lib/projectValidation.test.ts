import { describe, expect, it } from 'vitest'
import { validateProject } from '../../shared/projectValidation'

function project() {
  return {
    sessionCode: 'ACDEF',
    expiresAt: '2026-10-13T12:00:00.000Z',
    projectName: 'Lesproject',
    stockPanels: [{ id: 's1', label: 'MDF', width: 2440, height: 1220, grainDirection: 'geen' }],
    parts: [{ id: 'p1', label: 'Zijde', width: 500, height: 300, qty: 2, material: 'MDF', grainDirection: 'geen' }],
    settings: {
      kerf: 4, schoonzagen: true, schoonzagenMaat: 5,
      brutomaten: true, overmaat: 5, optimizationGoal: 'minimize-waste',
    },
    lastResult: null,
  }
}

describe('project validation', () => {
  it('accepts a normal project', () => {
    expect(validateProject(project()).valid).toBe(true)
  })

  it('rejects excessive quantities', () => {
    const value = project()
    value.parts[0].qty = 1_001
    expect(validateProject(value)).toMatchObject({ valid: false, error: 'Ongeldige onderdeelgegevens.' })
  })

  it('rejects a project whose code does not match the allowed alphabet', () => {
    expect(validateProject({ ...project(), sessionCode: '00000' }).valid).toBe(false)
  })

  it('rejects malformed saved results', () => {
    expect(validateProject({ ...project(), lastResult: { placements: 'not-an-array' } }).valid).toBe(false)
  })

  it('accepts legacy projects without saved alternatives', () => {
    const value = project()
    expect(validateProject(value).valid).toBe(true)
  })

  it('rejects more than two alternative nestings', () => {
    expect(validateProject({ ...project(), allResults: [null, null, null] }).valid).toBe(false)
  })
})
