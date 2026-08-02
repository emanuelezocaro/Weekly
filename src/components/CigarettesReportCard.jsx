import { useState } from 'react'
import { dayLabel, toISODate } from '../utils/date'

// Sparse x-axis labels: every day for a week, every ~5th (plus first/last) for
// a month — mirrors ActivityTrendChart's axis logic.
function shouldLabel(index, total) {
  if (total <= 7) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}

function axisLabel(date, days) {
  return days.length <= 7 ? dayLabel(date) : String(date.getDate())
}

function countsForDays(cigarettes, days) {
  return days.map((date) => {
    const iso = toISODate(date)
    const rec = cigarettes.find((c) => c.date === iso)
    return { date, count: rec ? rec.count : null }
  })
}

export default function CigarettesReportCard({ cigarettes, days }) {
  const [expanded, setExpanded] = useState(false)
  const counts = countsForDays(cigarettes, days)

  if (days.length === 1) {
    const value = counts[0].count
    return (
      <section className="settings-card">
        <h2 className="settings-card__title">Sigarette</h2>
        {value === null ? (
          <p className="trend-chart__caption">Nessun dato per questo giorno</p>
        ) : (
          <p className="field-readout">
            <strong>{value} sigarette</strong> (indicativo)
          </p>
        )}
      </section>
    )
  }

  const tracked = counts.filter((c) => c.count !== null)
  const total = tracked.reduce((sum, c) => sum + c.count, 0)
  const avg = tracked.length > 0 ? Math.round(total / tracked.length) : 0
  const maxCount = Math.max(1, ...counts.map((c) => c.count || 0))

  return (
    <section className="settings-card">
      <button type="button" className="report-card__header--btn" onClick={() => setExpanded((e) => !e)}>
        <h2 className="settings-card__title" style={{ marginBottom: 4 }}>
          Sigarette
        </h2>
        <p className="trend-chart__caption" style={{ margin: 0 }}>
          {total} in totale · {avg}/giorno in media
        </p>
      </button>
      {expanded && (
        <div className="trend-chart">
          <div className="trend-chart__bars">
            {counts.map((c, i) => {
              const heightPct = c.count ? Math.max(2, (c.count / maxCount) * 100) : 2
              return (
                <div key={toISODate(c.date)} className="trend-chart__col">
                  <span className="trend-chart__bar-track">
                    <span className="cigarettes-chart__bar" style={{ height: `${heightPct}%` }} />
                  </span>
                  <span className="trend-chart__label">
                    {shouldLabel(i, counts.length) ? axisLabel(c.date, days) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
