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

export async function saveProject(code: string, data: object): Promise<void> {
  const res = await fetch(`${API_BASE}/project/${code}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Opslaan mislukt: ${res.status}`)
}

export async function loadProject(code: string): Promise<object> {
  const res = await fetch(`${API_BASE}/project/${code}`)
  if (res.status === 404) throw new Error('Code niet gevonden of verlopen.')
  if (!res.ok) throw new Error(`Laden mislukt: ${res.status}`)
  return res.json()
}
