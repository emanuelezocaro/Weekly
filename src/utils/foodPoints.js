// Sistema a punti per "come sto andando" a colpo d'occhio, senza bisogno di
// un obiettivo: buono = 2 punti, medio = 1, male = 0 (extra: no = 2 -- averlo
// evitato è il risultato buono --, sì = 0). Un giorno con tutte e 6 le
// valutazioni "buono" vale 12, tutte "male" vale 0. Condiviso tra il report
// Alimentazione e la striscia "Oggi" della Dash, cosi la scala resta unica.
export const RATING_FIELDS = ['colazione', 'pranzo', 'cena', 'alcol', 'dolci']
export const POINT_VALUE = { bad: 0, mid: 1, good: 2 }
export const RATING_COLOR = { bad: 'var(--series-6)', mid: 'var(--series-3)', good: 'var(--series-2)' }
export const GAUGE_MAX = 12
export const GAUGE_ZONES = [
  { key: 'bad', label: 'Male', upTo: 4 },
  { key: 'mid', label: 'Medio', upTo: 9 },
  { key: 'good', label: 'Buono', upTo: GAUGE_MAX },
]

export function dayPoints(record) {
  if (!record) return null
  let sum = 0
  let rated = false
  for (const field of RATING_FIELDS) {
    if (record[field]) {
      sum += POINT_VALUE[record[field]]
      rated = true
    }
  }
  if (record.extra) {
    sum += record.extra === 'no' ? 2 : 0
    rated = true
  }
  return rated ? sum : null
}

// Media solo sui giorni con almeno una valutazione, come per Sonno/Sigarette
// -- un giorno senza dati non abbassa la media, semplicemente non conta.
export function averageDayPoints(records) {
  let total = 0
  let trackedDays = 0
  for (const r of records) {
    const p = dayPoints(r)
    if (p === null) continue
    total += p
    trackedDays += 1
  }
  return trackedDays > 0 ? total / trackedDays : null
}

// Male fino a 1/3 della scala, buono da 3/4 in su, medio la fascia in mezzo.
export function clusterFor(value, max = GAUGE_MAX) {
  if (value <= max * (4 / 12)) return GAUGE_ZONES[0]
  if (value < max * (9 / 12)) return GAUGE_ZONES[1]
  return GAUGE_ZONES[2]
}
