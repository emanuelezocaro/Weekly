import { dayLabel, formatMonthShort, groupDaysByMonth, isFuture, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalPerBar, goalTargetForDays } from '../utils/goals'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import { colorVar } from '../utils/palette'
import GoalLine from './GoalLine'
import GoalTrendIndicator from './GoalTrendIndicator'
import TrendChartYAxis from './TrendChartYAxis'

// Mirrors ActivityTrendChart/FoodReportCard's sparse-axis logic: spell out
// each weekday for a week, otherwise just the date range (too many days to
// label individually).
function axisLegend(days) {
  if (days.length <= 7) return days.map((d) => dayLabel(d)).join(' · ')
  return `${String(days[0].getDate())} – ${String(days[days.length - 1].getDate())}`
}

function doneSetFor(checklist, activityId) {
  return new Set(checklist.filter((c) => c.activityId === activityId).map((c) => c.date))
}

// One dot per day -- filled (in the activity's own color) if done, empty if
// not. Same scaffolding as DiaryReportCard's DotsRow. The color is set as a
// CSS variable on the span rather than a direct style, since the dot itself
// is drawn by ::after.
function DotsRow({ isOnByKey, color }) {
  return (
    <div className="trend-chart__row">
      <div className="mini-row__gutter" />
      <div className="trend-chart__bars-wrap">
        <div className="mini-row__dots">
          {isOnByKey.map(({ key, isOn }) => (
            <span key={key} className={isOn ? 'is-on' : ''} style={{ '--dot-color': color }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function WeekAxisRow({ days }) {
  return (
    <div className="trend-chart__row">
      <div className="mini-row__gutter" />
      <div className="trend-chart__bars-wrap">
        <div className="mini-row__axis">
          {days.map((d) => (
            <span key={toISODate(d)}>{dayLabel(d)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Same done/not-done dots report shape as Diary -- for attività "a
// checklist" (mode: 'checklist'), plus the same goal-vs-count comparison
// Sigarette/Uscite already use ("X volte a settimana").
export default function ActivityChecklistReportCard({ activity, checklist, days, prevDays, period, goals }) {
  const doneSet = doneSetFor(checklist, activity.id)
  const doneCount = days.filter((d) => doneSet.has(toISODate(d))).length
  const color = colorVar(activity.colorSlot)

  const goal = goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1]))
  const target = goalTargetForDays(goal, days.length)

  const clippedPrev = clipPrevDays(days, prevDays)
  const prevCount = clippedPrev.filter((d) => doneSet.has(toISODate(d))).length
  const delta = deltaPct(doneCount, prevCount)

  // In Anno la stessa unità del grafico qui sotto (volte a settimana), sui
  // giorni già passati cosi un periodo ancora in corso non viene diluito dai
  // giorni futuri -- ma solo li: guardando già una singola settimana o un
  // mese, "X volte a settimana in media" è un giro inutile, "X/Y giorni
  // fatti" si legge diretto.
  const elapsedDaysCount = Math.max(1, days.filter((d) => !isFuture(d)).length)
  const weeklyRate = (doneCount / elapsedDaysCount) * 7

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">{activity.name}</h2>
        <GoalTrendIndicator goal={goal} actual={doneCount} target={target} />
      </div>
      <p className="trend-chart__caption">
        {period === 'year' ? `${formatWeeklyRate(weeklyRate)} volte a settimana` : `${doneCount}/${days.length} giorni fatti`}
        {delta !== null && (
          <span className="report-card__delta">
            {' '}
            ({delta > 0 ? '+' : ''}
            {delta}%)
          </span>
        )}
      </p>
      {period === 'year' ? (
        <YearBars activity={activity} days={days} doneSet={doneSet} goals={goals} color={color} />
      ) : (
        <>
          <DotsRow isOnByKey={days.map((d) => ({ key: toISODate(d), isOn: doneSet.has(toISODate(d)) }))} color={color} />
          {days.length <= 7 ? <WeekAxisRow days={days} /> : (
            <p className="trend-chart__caption" style={{ marginTop: 4 }}>
              {axisLegend(days)}
            </p>
          )}
        </>
      )}
    </section>
  )
}

// Un'attività checklist ha un obiettivo numerico ("5 volte a settimana"),
// non percentuale -- quindi anche il grafico deve restare un numero nella
// stessa unità, non una %. Ogni barra è la media giornaliera del mese
// (giorni fatti / giorni passati, cosi un mese ancora in corso non viene
// diluito dai giorni futuri) convertita in "volte a settimana equivalenti",
// e l'obiettivo è mostrato/disegnato nella stessa identica unità -- sempre a
// settimana, indipendentemente dal periodo scelto per l'obiettivo (giorno o
// settimana), cosi barre e linea si leggono sempre allo stesso modo.
function formatWeeklyRate(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function YearBars({ activity, days, doneSet, goals, color }) {
  const bars = groupDaysByMonth(days).map((m) => {
    const doneInMonth = m.days.filter((d) => doneSet.has(toISODate(d))).length
    const elapsedDays = Math.max(1, m.days.filter((d) => !isFuture(d)).length)
    return {
      key: toMonthISO(m.monthStart),
      label: formatMonthShort(toMonthISO(m.monthStart)),
      value: (doneInMonth / elapsedDays) * 7,
    }
  })
  const maxValue = Math.max(1, ...bars.map((b) => b.value))

  const goalForTag = goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1]))
  const weekTarget = goalForTag ? goalPerBar(goalForTag, 'week') : null
  const tagLabel = weekTarget !== null ? `Obiettivo ${formatWeeklyRate(weekTarget)}/sett` : undefined

  return (
    <div className="trend-chart__row">
      <TrendChartYAxis maxValue={maxValue} formatValue={formatWeeklyRate} />
      <div className="trend-chart__bars-wrap">
        <GoalLine
          goals={goals}
          itemKey={activity.id}
          monthIso={toMonthISO(days[days.length - 1])}
          barGranularity="week"
          maxValue={maxValue}
          formatValue={(v) => String(v)}
          tagLabel={tagLabel}
        />
        <div className="trend-chart__bars">
          {bars.map((b) => {
            const heightPct = Math.max(2, (b.value / maxValue) * 100)
            return (
              <div key={b.key} className="trend-chart__col">
                <span className="trend-chart__bar-track">
                  <span className="cigarettes-chart__bar" style={{ height: `${heightPct}%`, background: color }} />
                </span>
                <span className="trend-chart__label">{b.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
