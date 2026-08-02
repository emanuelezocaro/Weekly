import { dayLabel, toISODate } from '../utils/date'

const RATING_LABELS = { bad: 'Male', mid: 'Medio', good: 'Buono' }
const RATING_HEIGHT = { bad: '30%', mid: '60%', good: '100%' }
const RATING_COLOR = { bad: 'var(--series-6)', mid: 'var(--series-3)', good: 'var(--series-2)' }
const EXTRA_LABELS = { yes: 'Sì', no: 'No' }

// Mirrors ActivityTrendChart's sparse-axis logic for month view.
function axisLegend(days) {
  if (days.length <= 7) return days.map((d) => dayLabel(d)).join(' · ')
  return `${String(days[0].getDate())} – ${String(days[days.length - 1].getDate())}`
}

// Aggregate counts across all rating rows, so the reader doesn't have to
// count colored bars by eye.
function ratingSummary(records) {
  const counts = { good: 0, mid: 0, bad: 0 }
  let extraYes = 0
  for (const r of records) {
    if (!r) continue
    for (const field of ['colazione', 'pranzo', 'cena', 'alcol', 'dolci']) {
      if (r[field]) counts[r[field]] += 1
    }
    if (r.extra === 'yes') extraYes += 1
  }
  return { ...counts, extraYes }
}

function RatingMiniRow({ label, values }) {
  return (
    <div className="mini-row">
      <span className="mini-row__label">{label}</span>
      <div className="mini-row__bars">
        {values.map((v, i) => (
          <span
            key={i}
            style={{ height: v ? RATING_HEIGHT[v] : '4px', background: v ? RATING_COLOR[v] : 'var(--border)' }}
          />
        ))}
      </div>
    </div>
  )
}

function ExtraMiniRow({ values }) {
  return (
    <div className="mini-row">
      <span className="mini-row__label">Extra</span>
      <div className="mini-row__bars">
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              height: '100%',
              background: v === 'yes' ? 'var(--accent)' : 'var(--text-muted)',
              opacity: v === 'yes' ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function FoodReportCard({ food, days }) {
  const records = days.map((date) => {
    const iso = toISODate(date)
    return food.find((f) => f.date === iso) || null
  })

  if (days.length === 1) {
    const rec = records[0]
    return (
      <section className="settings-card">
        <h2 className="settings-card__title">Alimentazione</h2>
        {!rec ? (
          <p className="trend-chart__caption">Nessun dato per questo giorno</p>
        ) : (
          <>
            <p className="field-readout">
              Colazione: <strong>{RATING_LABELS[rec.colazione] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Pranzo: <strong>{RATING_LABELS[rec.pranzo] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Cena: <strong>{RATING_LABELS[rec.cena] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Alcol: <strong>{RATING_LABELS[rec.alcol] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Dolci: <strong>{RATING_LABELS[rec.dolci] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Extra: <strong>{EXTRA_LABELS[rec.extra] ?? '—'}</strong>
            </p>
          </>
        )}
      </section>
    )
  }

  const summary = ratingSummary(records)

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Alimentazione</h2>
      <p className="trend-chart__caption">
        {summary.good} buono · {summary.mid} medio · {summary.bad} male · Extra {summary.extraYes}/{days.length}{' '}
        giorni
      </p>
      <RatingMiniRow label="Colazione" values={records.map((r) => r?.colazione ?? null)} />
      <RatingMiniRow label="Pranzo" values={records.map((r) => r?.pranzo ?? null)} />
      <RatingMiniRow label="Cena" values={records.map((r) => r?.cena ?? null)} />
      <RatingMiniRow label="Alcol" values={records.map((r) => r?.alcol ?? null)} />
      <RatingMiniRow label="Dolci" values={records.map((r) => r?.dolci ?? null)} />
      <ExtraMiniRow values={records.map((r) => r?.extra ?? null)} />
      <p className="trend-chart__caption" style={{ marginTop: 4 }}>
        {axisLegend(days)}
      </p>
    </section>
  )
}
