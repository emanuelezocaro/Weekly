import { dayLabel, formatShortDate, groupDaysByWeek, toISODate, toMonthISO } from '../utils/date'
import GoalLine from './GoalLine'

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

function outputCountsForDays(outputs, days) {
  return days.map((date) => {
    const iso = toISODate(date)
    return { date, count: outputs.filter((o) => o.date === iso).length }
  })
}

export default function OutputsWeekCard({ outputs, days, period, goals }) {
  const counts = outputCountsForDays(outputs, days)
  const daysWithOutputs = counts.filter((c) => c.count > 0).length

  // Trimestre: troppi giorni per una barra a testa, si aggrega per settimana.
  const bars =
    period === 'quarter'
      ? groupDaysByWeek(days).map((w, i, weeks) => {
          const weekTotal = outputCountsForDays(outputs, w.days).reduce((sum, c) => sum + c.count, 0)
          return {
            key: toISODate(w.weekStart),
            label: shouldLabel(i, weeks.length) ? formatShortDate(w.weekStart) : '',
            value: weekTotal,
          }
        })
      : counts.map((c, i) => ({
          key: toISODate(c.date),
          label: shouldLabel(i, counts.length) ? axisLabel(c.date, days) : '',
          value: c.count,
        }))
  const maxValue = Math.max(1, ...bars.map((b) => b.value))

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Uscite</h2>
      <p className="trend-chart__caption">
        {daysWithOutputs}/{days.length} giorni con almeno un'uscita
      </p>
      <div className="trend-chart__bars-wrap">
        <GoalLine
          goals={goals}
          itemKey="outputs"
          monthIso={toMonthISO(days[days.length - 1])}
          barGranularity={period === 'quarter' ? 'week' : 'day'}
          maxValue={maxValue}
          formatValue={(v) => String(v)}
        />
        <div className="trend-chart__bars">
          {bars.map((b) => {
            const heightPct = Math.max(2, (b.value / maxValue) * 100)
            return (
              <div key={b.key} className="trend-chart__col">
                <span className="trend-chart__bar-track">
                  <span className="outputs-chart__bar" style={{ height: `${heightPct}%` }} />
                </span>
                <span className="trend-chart__label">{b.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
