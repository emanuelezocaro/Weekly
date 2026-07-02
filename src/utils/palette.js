// Validated categorical palette (see /references/palette.md in the dataviz
// skill). Fixed slot order — never cycled per-render — so an activity keeps
// the same color for its lifetime once assigned.
export const PALETTE_SIZE = 8

export function colorVar(slotIndex) {
  return `var(--series-${(slotIndex % PALETTE_SIZE) + 1})`
}
