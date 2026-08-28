import { dayLabel, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalTargetForDays } from '../utils/goals'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import GoalLine from './GoalLine'
import GoalTrendIndicator from './GoalTrendIndicator'
import TrendChartYAxis from './TrendChartYAxis'

// A regular space collapses to zero height when it's a block element's only
// content -- this reserves the delta row's height even with nothing to say,
// so swiping between periods doesn't shift the chart below it.
const NBSP = String.fromCharCode(160)

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

export default function CigarettesReportCard({ cigarettes, days, prevDays, period, goals }) {
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

  // Anno: troppi giorni per una barra a testa, si aggrega per mese --
  // mostrando la media giornaliera (non il totale del mese, che farebbe
  // sembrare un mese più lungo "peggiore" solo perché ha più giorni), cosi
  // il confronto con l'obiettivo resta lo stesso conto per-giorno usato
  // nelle viste settimana/mese (vedi barGranularity più sotto). La media è
  // sui giorni con un record (anche uno 0 esplicito conta), non su tutti i
  // giorni del mese -- stessa definizione di "tracked" della media qui sopra.
  const bars =
    period === 'year'
      ? groupDaysByMonth(days).map((m) => {
          const monthCounts = countsForDays(cigarettes, m.days)
          const monthTotal = monthCounts.reduce((sum, c) => sum + (c.count || 0), 0)
          const monthTracked = monthCounts.filter((c) => c.count !== null).length
          return {
            key: toMonthISO(m.monthStart),
            label: formatMonthShort(toMonthISO(m.monthStart)),
            value: monthTracked > 0 ? monthTotal / monthTracked : 0,
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

  const prevTotal = countsForDays(cigarettes, clipPrevDays(days, prevDays)).reduce(
    (sum, c) => sum + (c.count || 0),
    0,
  )
  const delta = deltaPct(total, prevTotal)
  // Year bars are a daily average and can land on a fraction (e.g. 2.3
  // cigarettes/day) -- week/month bars are always a whole day's raw count,
  // so they keep the plain integer they always had.
  const formatAxisValue = (v) => (period === 'year' ? v.toFixed(1) : String(v))

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">Sigarette</h2>
        <GoalTrendIndicator goal={goal} actual={total} target={target} fallbackDirection="lower_is_better" />
      </div>
      <p className="trend-chart__caption">{avg}/giorno</p>
      <p className="report-card__delta" style={{ textAlign: 'center' }}>
        {delta !== null ? `${delta > 0 ? '+' : ''}${delta}% rispetto al periodo precedente` : NBSP}
      </p>
      <div className="trend-chart__row">
        <TrendChartYAxis maxValue={maxValue} formatValue={formatAxisValue} />
        <div className="trend-chart__bars-wrap">
          <GoalLine
            goals={goals}
            itemKey="cigarettes"
            monthIso={toMonthISO(days[days.length - 1])}
            barGranularity="day"
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
