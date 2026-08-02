import { dayLabel, formatShortDate, groupDaysByWeek, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalTargetForDays } from '../utils/goals'
import GoalLine from './GoalLine'
import GoalTrendIndicator from './GoalTrendIndicator'
import TrendChartYAxis from './TrendChartYAxis'

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

export default function CigarettesReportCard({ cigarettes, days, period, goals }) {
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

  // Trimestre: troppi giorni per una barra a testa, si aggrega per settimana.
  const bars =
    period === 'quarter'
      ? groupDaysByWeek(days).map((w, i, weeks) => {
          const weekTotal = countsForDays(cigarettes, w.days).reduce((sum, c) => sum + (c.count || 0), 0)
          return {
            key: toISODate(w.weekStart),
            label: shouldLabel(i, weeks.length) ? formatShortDate(w.weekStart) : '',
            value: weekTotal,
          }
        })
      : counts.map((c, i) => ({
          key: toISODate(c.date),
          label: shouldLabel(i, counts.length) ? axisLabel(c.date, days) : '',
          value: c.count || 0,
        }))
  const maxValue = Math.max(1, ...bars.map((b) => b.value))
  const goal = goalForMonth(goals, 'cigarettes', toMonthISO(days[days.length - 1]))
  const target = goalTargetForDays(goal, days.length)

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">Sigarette</h2>
        <GoalTrendIndicator goal={goal} actual={total} target={target} fallbackDirection="lower_is_better" />
      </div>
      <p className="trend-chart__caption">
        {total} in totale · {avg}/giorno in media
      </p>
      <div className="trend-chart__row">
        <TrendChartYAxis maxValue={maxValue} formatValue={(v) => String(v)} />
        <div className="trend-chart__bars-wrap">
          <GoalLine
            goals={goals}
            itemKey="cigarettes"
            monthIso={toMonthISO(days[days.length - 1])}
            barGranularity={period === 'quarter' ? 'week' : 'day'}
            maxValue={maxValue}
            formatValue={(v) => String(v)}
            direction="lower_is_better"
          />
          <div className="trend-chart__bars">
            {bars.map((b) => {
              const heightPct = Math.max(2, (b.value / maxValue) * 100)
              return (
                <div key={b.key} className="trend-chart__col">
                  <span className="trend-chart__bar-track">
                    <span className="cigarettes-chart__bar" style={{ height: `${heightPct}%` }} />
                  </span>
                  <span className="trend-chart__label">{b.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
