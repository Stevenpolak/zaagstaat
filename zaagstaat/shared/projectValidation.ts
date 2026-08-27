const CODE_RE = /^[ACDEFGHJKLMNPQRTUVWXY3467]{5}$/
const GRAIN_DIRECTIONS = new Set(['verticaal', 'horizontaal', 'geen'])
const OPTIMIZATION_GOALS = new Set(['minimize-waste', 'minimize-sheets'])

export interface ValidationResult {
  valid: boolean
  error?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isText = (value: unknown, maxLength: number): value is string =>
  typeof value === 'string' && value.length <= maxLength

const isNumber = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

const isInteger = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && isNumber(value, min, max)

function validStock(value: unknown): boolean {
  return isRecord(value) &&
    isText(value.id, 100) && value.id.length > 0 &&
    isText(value.label, 120) &&
    isNumber(value.width, 0, 100_000) &&
    isNumber(value.height, 0, 100_000) &&
    typeof value.grainDirection === 'string' && GRAIN_DIRECTIONS.has(value.grainDirection)
}

function validPart(value: unknown): boolean {
  return isRecord(value) &&
    isText(value.id, 100) && value.id.length > 0 &&
    isText(value.label, 120) &&
    isText(value.material, 120) &&
    isNumber(value.width, 0, 100_000) &&
    isNumber(value.height, 0, 100_000) &&
    isInteger(value.qty, 0, 1_000) &&
    typeof value.grainDirection === 'string' && GRAIN_DIRECTIONS.has(value.grainDirection)
}

function validSettings(value: unknown): boolean {
  return isRecord(value) &&
    isNumber(value.kerf, 0, 100) &&
    typeof value.schoonzagen === 'boolean' &&
    isNumber(value.schoonzagenMaat, 0, 1_000) &&
    typeof value.brutomaten === 'boolean' &&
    isNumber(value.overmaat, 0, 1_000) &&
    typeof value.optimizationGoal === 'string' && OPTIMIZATION_GOALS.has(value.optimizationGoal)
}

function validResult(value: unknown): boolean {
  if (value === null) return true
  if (!isRecord(value)) return false

  if (!Array.isArray(value.placements) || value.placements.length > 20_000 ||
      !Array.isArray(value.sheetsUsed) || value.sheetsUsed.length > 20_000 ||
      !Array.isArray(value.unplacedPartIds) || value.unplacedPartIds.length > 20_000 ||
      !Array.isArray(value.cutLines) || value.cutLines.length > 20_000) return false
  if (!isRecord(value.sheetsUsedPerStock) ||
      !Object.values(value.sheetsUsedPerStock).every(count => isInteger(count, 0, 20_000))) return false
  if (!isNumber(value.totalArea, 0, Number.MAX_SAFE_INTEGER)) return false
  if (!isNumber(value.usedArea, 0, Number.MAX_SAFE_INTEGER)) return false
  if (!isNumber(value.wasteArea, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)) return false
  if (!isNumber(value.wastePercent, -100, 100)) return false

  const placementsValid = value.placements.every(placement =>
    isRecord(placement) &&
    isText(placement.partId, 100) &&
    isText(placement.stockPanelId, 100) &&
    isInteger(placement.sheetIndex, 0, 20_000) &&
    isNumber(placement.x, 0, 100_000) &&
    isNumber(placement.y, 0, 100_000) &&
    isNumber(placement.width, 0, 100_000) &&
    isNumber(placement.height, 0, 100_000) &&
    typeof placement.rotated === 'boolean')
  const sheetsValid = value.sheetsUsed.every(sheet =>
    isRecord(sheet) && isText(sheet.stockPanelId, 100) && isInteger(sheet.sheetNumber, 1, 20_000))
  const cutLinesValid = value.cutLines.every(cut =>
    isRecord(cut) &&
    isInteger(cut.sheetIndex, 0, 20_000) &&
    (cut.orientation === 'horizontal' || cut.orientation === 'vertical') &&
    isNumber(cut.position, 0, 100_000) &&
    isNumber(cut.from, 0, 100_000) &&
    isNumber(cut.to, 0, 100_000))

  return placementsValid && sheetsValid && cutLinesValid &&
    value.unplacedPartIds.every(id => isText(id, 100))
}

export function validateProject(value: unknown): ValidationResult {
  if (!isRecord(value)) return { valid: false, error: 'Project moet een object zijn.' }
  if (typeof value.sessionCode !== 'string' || !CODE_RE.test(value.sessionCode)) {
    return { valid: false, error: 'Ongeldige projectcode.' }
  }
  if (typeof value.expiresAt !== 'string' || value.expiresAt.length > 40 || !Number.isFinite(Date.parse(value.expiresAt))) {
    return { valid: false, error: 'Ongeldige verloopdatum.' }
  }
  if (!isText(value.projectName, 120)) return { valid: false, error: 'Projectnaam is te lang.' }
  if (!Array.isArray(value.stockPanels) || value.stockPanels.length > 50 || !value.stockPanels.every(validStock)) {
    return { valid: false, error: 'Ongeldige plaatgegevens.' }
  }
  if (!Array.isArray(value.parts) || value.parts.length > 500 || !value.parts.every(validPart)) {
    return { valid: false, error: 'Ongeldige onderdeelgegevens.' }
  }
  if (!validSettings(value.settings)) return { valid: false, error: 'Ongeldige instellingen.' }
  if (!validResult(value.lastResult)) return { valid: false, error: 'Ongeldig berekeningsresultaat.' }
  if (value.allResults !== undefined && value.allResults !== null &&
      (!Array.isArray(value.allResults) || value.allResults.length > 2 || !value.allResults.every(validResult))) {
    return { valid: false, error: 'Ongeldige alternatieve berekeningsresultaten.' }
  }
  if (value.activeResultIndex !== undefined && !isInteger(value.activeResultIndex, 0, 1)) {
    return { valid: false, error: 'Ongeldige actieve nesting.' }
  }

  return { valid: true }
}
