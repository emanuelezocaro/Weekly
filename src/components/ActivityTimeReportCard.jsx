import { dayLabel, formatDuration, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalTargetForDays, minutesToHours } from '../utils/goals'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import { colorVar } from '../utils/palette'
import GoalLine from './GoalLine'
import GoalTrendIndicator from './GoalTrendIndicator'
import TrendChartYAxis from './TrendChartYAxis'

// A regular space collapses to zero height when it's a block element's only
// content -- this reserves the delta row's height even with nothing to say,
// so swiping between periods doesn't shift the chart below it.
const NBSP = String.fromCharCode(160)

function shouldLabel(index, total) {
  if (total <= 7) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}

function axisLabel(date, days) {
  return days.length <= 7 ? dayLabel(date) : String(date.getDate())
}

function minutesForDays(durations, activityId, days) {
  return days.map((date) => {
    const iso = toISODate(date)
    const minutes = durations
      .filter((d) => d.activityId === activityId && d.date === iso)
      .reduce((sum, d) => sum + d.minutes, 0)
    return { date, minutes }
  })
}

// Same day/week-bar report shape as Sigarette -- just relabeled in ore
// invece di un conteggio semplice, per le attività "a tempo" (mode: 'time').
export default function ActivityTimeReportCard({ activity, durations, days, prevDays, period, goals }) {
  const perDay = minutesForDays(durations, activity.id, days)
  const total = perDay.reduce((sum, d) => sum + d.minutes, 0)
  const trackedDays = perDay.filter((d) => d.minutes > 0).length
  const avg = trackedDays > 0 ? Math.round(total / trackedDays) : 0

  // Anno: troppi giorni per una barra a testa, si aggrega per mese --
  // mostrando la media giornaliera (non il totale del mese, che farebbe
  // sembrare agosto "più attivo" di febbraio solo perché ha più giorni),
  // cosi il confronto con l'obiettivo resta lo stesso conto per-giorno
  // usato nelle viste settimana/mese (vedi barGranularity più sotto).
  // La media è sui giorni EFFETTIVAMENTE registrati quel mese, non su
  // tutti i giorni del mese -- un giorno non loggato non vuol dire "0 ore",
  // vuol dire solo che non l'hai segnato, stessa logica della media in
  // cima alla card qui sopra. Dividere per tutti i giorni rimetterebbe la
  // pressione a tracciare ogni giorno che il redesign voleva togliere.
  const bars =
    period === 'year'
      ? groupDaysByMonth(days).map((m) => {
          const monthDurations = minutesForDays(durations, activity.id, m.days)
          const monthTotal = monthDurations.reduce((sum, d) => sum + d.minutes, 0)
          const monthTrackedDays = monthDurations.filter((d) => d.minutes > 0).length
          return {
            key: toMonthISO(m.monthStart),
            label: formatMonthShort(toMonthISO(m.monthStart)),
            value: monthTrackedDays > 0 ? monthTotal / monthTrackedDays : 0,
          }
        })
      : perDay.map((d, i) => ({
          key: toISODate(d.date),
          label: shouldLabel(i, perDay.length) ? axisLabel(d.date, days) : '',
          value: d.minutes,
        }))
  const maxValue = Math.max(1, ...bars.map((b) => b.value))
  const goal = goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1]))
  const target = goalTargetForDays(goal, days.length)

  const prevTotal = minutesForDays(durations, activity.id, clipPrevDays(days, prevDays)).reduce(
    (sum, d) => sum + d.minutes,
    0,
  )
  const delta = deltaPct(total, prevTotal)

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">{activity.name}</h2>
        <GoalTrendIndicator
          goal={goal}
          actual={total}
          target={target}
          formatDiff={(minutes) => formatDuration(minutes * 60000)}
        />
      </div>
      <p className="trend-chart__caption">
        {formatDuration(total * 60000)} in totale · {formatDuration(avg * 60000)}/giorno in media
      </p>
      <p className="report-card__delta" style={{ textAlign: 'center' }}>
        {delta !== null ? `${delta > 0 ? '+' : ''}${delta}% rispetto al periodo precedente` : NBSP}
      </p>
      <div className="trend-chart__row">
        <TrendChartYAxis maxValue={maxValue} formatValue={(v) => formatDuration(v * 60000)} />
        <div className="trend-chart__bars-wrap">
          <GoalLine
            goals={goals}
            itemKey={activity.id}
            monthIso={toMonthISO(days[days.length - 1])}
            barGranularity="day"
            maxValue={maxValue}
            formatValue={(v) => `${minutesToHours(v)}h`}
          />
          <div className="trend-chart__bars">
            {bars.map((b) => {
              const heightPct = Math.max(2, (b.value / maxValue) * 100)
              return (
                <div key={b.key} className="trend-chart__col">
                  <span className="trend-chart__bar-track">
                    <span
                      className="cigarettes-chart__bar"
                      style={{ height: `${heightPct}%`, background: colorVar(activity.colorSlot) }}
                    />
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
