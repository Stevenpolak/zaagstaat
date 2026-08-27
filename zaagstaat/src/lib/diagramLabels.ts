export const DIAGRAM_TYPE = {
  label: 36,
  dimensions: 25,
  badge: 44,
  badgeText: 27,
  waste: 28,
} as const

/**
 * SVG text has no automatic wrapping. Keep a consistent font size and shorten
 * only the content when a label cannot fit inside its rectangle.
 */
export function truncateDiagramLabel(label: string, availableWidth: number, fontSize: number): string {
  const averageCharacterWidth = fontSize * 0.58
  const maxCharacters = Math.floor(Math.max(0, availableWidth) / averageCharacterWidth)

  if (maxCharacters < 2) return ''
  if (label.length <= maxCharacters) return label
  if (maxCharacters === 2) return '…'
  return `${label.slice(0, maxCharacters - 1).trimEnd()}…`
}
