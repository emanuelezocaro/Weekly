import { dayLabel, toISODate } from '../utils/date'

function outputCountsForDays(outputs, days) {
  return days.map((date) => {
    const iso = toISODate(date)
    return { date, count: outputs.filter((o) => o.date === iso).length }
  })
}

export default function OutputsWeekCard({ outputs, days }) {
  const counts = outputCountsForDays(outputs, days)
  const maxCount = Math.max(1, ...counts.map((c) => c.count))
  const daysWithOutputs = counts.filter((c) => c.count > 0).length

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Uscite</h2>
      <p className="trend-chart__caption">
        {daysWithOutputs}/{days.length} giorni con almeno un'uscita
      </p>
      <div className="trend-chart__bars">
        {counts.map((c) => {
          const heightPct = Math.max(2, (c.count / maxCount) * 100)
          return (
            <div key={toISODate(c.date)} className="trend-chart__col">
              <span className="trend-chart__bar-track">
                <span className="outputs-chart__bar" style={{ height: `${heightPct}%` }} />
              </span>
              <span className="trend-chart__label">{dayLabel(c.date)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
