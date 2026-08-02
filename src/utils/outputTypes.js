// Uscite are tagged with one of three types. Existing records predate this
// field, so they're treated as "commerciale" (via fallback, not a rewrite)
// rather than migrated.
export const OUTPUT_TYPES = [
  { id: 'contatto', label: 'Contatto' },
  { id: 'commerciale', label: 'Commerciale' },
  { id: 'consegna', label: 'Consegna' },
]

export const DEFAULT_OUTPUT_TYPE = 'consegna'

const VALID_TYPES = new Set(OUTPUT_TYPES.map((t) => t.id))

export function outputType(output) {
  return VALID_TYPES.has(output.type) ? output.type : 'commerciale'
}
