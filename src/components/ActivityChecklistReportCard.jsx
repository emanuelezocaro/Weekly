import { dayLabel, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalPerBar, goalTargetForDays } from '../utils/goals'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import { colorVar } from '../utils/palette'
import GoalLine from './GoalLine'
import GoalTrendIndicator from './GoalTrendIndicator'
import TrendChartYAxis from './TrendChartYAxis'

// A regular space collapses to zero height when it's a block element's only
// content -- this reserves the delta row's height even with nothing to say,
// so swiping between periods doesn't shift the chart below it.
const NBSP = String.fromCharCode(160)

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

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">{activity.name}</h2>
        <GoalTrendIndicator goal={goal} actual={doneCount} target={target} />
      </div>
      <p className="trend-chart__caption">
        {doneCount}/{days.length} giorni fatti
      </p>
      <p className="report-card__delta" style={{ textAlign: 'center' }}>
        {delta !== null ? `${delta > 0 ? '+' : ''}${delta}% rispetto al periodo precedente` : NBSP}
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

// Anno: un pallino per giorno (o anche uno per settimana, come prima)
// direbbe poco -- "almeno un giorno su 7" è quasi sempre vero. A differenza
// di un'attività a orario, però, qui non ha senso nemmeno una media: un
// sì/no non è una quantità da diluire sui giorni, è un conteggio -- esattamente
// come Sigarette/Uscite. Ogni barra è quindi il numero grezzo di giorni
// fatti quel mese, con l'obiettivo scalato su un mese medio (goalPerBar
// 'month'), non sul singolo giorno.
function YearBars({ activity, days, doneSet, goals, color }) {
  const bars = groupDaysByMonth(days).map((m) => {
    const doneInMonth = m.days.filter((d) => doneSet.has(toISODate(d))).length
    return {
      key: toMonthISO(m.monthStart),
      label: formatMonthShort(toMonthISO(m.monthStart)),
      value: doneInMonth,
    }
  })
  const maxValue = Math.max(1, ...bars.map((b) => b.value))

  // The goal itself is set per giorno/settimana, but these bars are a raw
  // count on a 0-31 scale -- showing "Obiettivo 5/sett" next to that scale
  // reads as unrelated to what the eye sees. Converting it to the bar's own
  // unit ("Obiettivo 22/mese") keeps the tag legible against the axis it's
  // actually drawn on.
  const goalForTag = goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1]))
  const monthTarget = goalForTag ? Math.round(goalPerBar(goalForTag, 'month')) : null

  return (
    <div className="trend-chart__row">
      <TrendChartYAxis maxValue={maxValue} formatValue={(v) => String(v)} />
      <div className="trend-chart__bars-wrap">
        <GoalLine
          goals={goals}
          itemKey={activity.id}
          monthIso={toMonthISO(days[days.length - 1])}
          barGranularity="month"
          maxValue={maxValue}
          formatValue={(v) => String(v)}
          tagLabel={monthTarget !== null ? `Obiettivo ${monthTarget}/mese` : undefined}
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
