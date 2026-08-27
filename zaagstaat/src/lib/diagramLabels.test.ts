import { describe, expect, it } from 'vitest'
import { DIAGRAM_TYPE, truncateDiagramLabel } from './diagramLabels'

describe('sheet diagram labels', () => {
  it('uses one fixed type scale for every part', () => {
    expect(DIAGRAM_TYPE).toEqual({
      label: 36,
      dimensions: 25,
      badge: 44,
      badgeText: 27,
      waste: 28,
    })
  })

  it('keeps labels that fit and truncates long labels instead of shrinking them', () => {
    expect(truncateDiagramLabel('ding', 200, DIAGRAM_TYPE.label)).toBe('ding')
    expect(truncateDiagramLabel('een veel te lange onderdeelnaam', 150, DIAGRAM_TYPE.label)).toBe('een ve…')
  })

  it('hides text when a rectangle is too narrow to show it safely', () => {
    expect(truncateDiagramLabel('kastdeel', 20, DIAGRAM_TYPE.label)).toBe('')
  })
})
