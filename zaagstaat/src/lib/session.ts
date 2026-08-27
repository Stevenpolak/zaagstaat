import type { Project } from './types'
import { validateProject, sanitizeProject } from '../../shared/projectValidation'

// Unambiguous alphabet: no O/0, I/1, S/5, Z/2, B/8
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3467'

export function generateCode(length = 5): string {
  return Array.from({ length }, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('')
}

export function expiryDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString()
}

export function formatExpiry(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const API_BASE = import.meta.env.VITE_WORKER_URL ?? ''

export async function saveProject(code: string, data: object, signal?: AbortSignal, keepalive = false): Promise<string> {
  const res = await fetch(`${API_BASE}/project/${code}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
    keepalive,
  })
  if (!res.ok) throw new Error(`Opslaan mislukt: ${res.status}`)
  const result: unknown = await res.json()
  if (typeof result !== 'object' || result === null ||
      !('expiresAt' in result) || typeof result.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(result.expiresAt))) {
    throw new Error('Opslaan mislukt: ongeldig antwoord van server.')
  }
  return result.expiresAt
}

export async function loadProject(code: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/project/${code}`)
  if (res.status === 404) throw new Error('Code niet gevonden of verlopen.')
  if (!res.ok) throw new Error(`Laden mislukt: ${res.status}`)
  const data: unknown = await res.json()
  const validation = validateProject(data)
  if (!validation.valid) throw new Error(`Projectgegevens zijn ongeldig: ${validation.error}`)
  return sanitizeProject(data as Record<string, unknown>) as unknown as Project
}
