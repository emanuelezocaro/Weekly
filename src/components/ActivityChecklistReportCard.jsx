import { dayLabel, groupDaysByWeek, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalTargetForDays } from '../utils/goals'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import GoalTrendIndicator from './GoalTrendIndicator'

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

// One dot per day (or, for a quarter, one dot per week) -- filled if done,
// empty if not. Same scaffolding as DiaryReportCard's DotsRow.
function DotsRow({ isOnByKey }) {
  return (
    <div className="trend-chart__row">
      <div className="mini-row__gutter" />
      <div className="trend-chart__bars-wrap">
        <div className="mini-row__dots">
          {isOnByKey.map(({ key, isOn }) => (
            <span key={key} className={isOn ? 'is-on' : ''} />
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

  const goal = goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1]))
  const target = goalTargetForDays(goal, days.length)

  const clippedPrev = clipPrevDays(days, prevDays)
  const prevCount = clippedPrev.filter((d) => doneSet.has(toISODate(d))).length
  const delta = deltaPct(doneCount, prevCount)

  const dotsRow =
    period === 'quarter' ? (
      <DotsRow
        isOnByKey={groupDaysByWeek(days).map((w) => ({
          key: toISODate(w.weekStart),
          isOn: w.days.some((d) => doneSet.has(toISODate(d))),
        }))}
      />
    ) : (
      <DotsRow isOnByKey={days.map((d) => ({ key: toISODate(d), isOn: doneSet.has(toISODate(d)) }))} />
    )

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
      {dotsRow}
      {days.length <= 7 && period !== 'quarter' ? (
        <WeekAxisRow days={days} />
      ) : (
        <p className="trend-chart__caption" style={{ marginTop: 4 }}>
          {period === 'quarter' ? `${axisLegend(days)} · un pallino per settimana` : axisLegend(days)}
        </p>
      )}
    </section>
  )
}
