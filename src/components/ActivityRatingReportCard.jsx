import { dayLabel, formatMonthShort, groupDaysByMonth, isFuture, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalPerBar, goalTargetForDays } from '../utils/goals'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import { RATING_COLOR, legendText } from '../utils/timeRatings'
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

function ratingMapFor(ratings, activityId) {
  const map = new Map()
  for (const r of ratings) {
    if (r.activityId === activityId) map.set(r.date, r.value)
  }
  return map
}

// One dot per day, colored by that day's Bad/Medium/Good tap (or empty if
// not rated yet) -- same scaffolding as ActivityChecklistReportCard's
// DotsRow, just 3 colors instead of on/off.
function DotsRow({ isoValues }) {
  return (
    <div className="trend-chart__row">
      <div className="mini-row__gutter" />
      <div className="trend-chart__bars-wrap">
        <div className="mini-row__dots">
          {isoValues.map(({ key, value }) => (
            <span key={key} className={value ? 'is-on' : ''} style={{ '--dot-color': value ? RATING_COLOR[value] : undefined }} />
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

function formatWeeklyRate(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

// Anno: come ActivityChecklistReportCard, una barra per mese con la media
// giornaliera di giorni "Good" convertita in "volte a settimana equivalenti"
// (solo sui giorni già passati, cosi un mese ancora in corso non viene
// diluito dai giorni futuri) -- stessa unità dell'obiettivo.
function YearBars({ activity, days, ratingMap, goals, color }) {
  const bars = groupDaysByMonth(days).map((m) => {
    const goodInMonth = m.days.filter((d) => ratingMap.get(toISODate(d)) === 'good').length
    const elapsedDays = Math.max(1, m.days.filter((d) => !isFuture(d)).length)
    return {
      key: toMonthISO(m.monthStart),
      label: formatMonthShort(toMonthISO(m.monthStart)),
      value: (goodInMonth / elapsedDays) * 7,
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

// Rating-mode activities (Sleep, Put off): a single Bad/Medium/Good tap per
// day instead of hours, judged the same way a checklist activity is --
// "how many Good days" against a weekly/daily goal -- just with 3 dot
// colors instead of on/off.
export default function ActivityRatingReportCard({ activity, ratings, days, prevDays, period, goals }) {
  const ratingMap = ratingMapFor(ratings, activity.id)
  const goodCount = days.filter((d) => ratingMap.get(toISODate(d)) === 'good').length
  const legend = legendText(activity.name)

  const goal = goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1]))
  const target = goalTargetForDays(goal, days.length)

  const clippedPrev = clipPrevDays(days, prevDays)
  const prevGoodCount = clippedPrev.filter((d) => ratingMap.get(toISODate(d)) === 'good').length
  const delta = deltaPct(goodCount, prevGoodCount)

  const elapsedDaysCount = Math.max(1, days.filter((d) => !isFuture(d)).length)
  const weeklyRate = (goodCount / elapsedDaysCount) * 7

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">{activity.name}</h2>
        <GoalTrendIndicator goal={goal} actual={goodCount} target={target} />
      </div>
      <p className="trend-chart__caption">
        {period === 'year' ? `${formatWeeklyRate(weeklyRate)} volte a settimana` : `${goodCount}/${days.length} giorni buono`}
        {delta !== null && (
          <span className="report-card__delta">
            {' '}
            ({delta > 0 ? '+' : ''}
            {delta}%)
          </span>
        )}
      </p>
      {legend && <p className="trend-chart__caption">{legend}</p>}
      {period === 'year' ? (
        <YearBars activity={activity} days={days} ratingMap={ratingMap} goals={goals} color={RATING_COLOR.good} />
      ) : (
        <>
          <DotsRow isoValues={days.map((d) => ({ key: toISODate(d), value: ratingMap.get(toISODate(d)) ?? null }))} />
          {days.length <= 7 ? (
            <WeekAxisRow days={days} />
          ) : (
            <p className="trend-chart__caption" style={{ marginTop: 4 }}>
              {axisLegend(days)}
            </p>
          )}
        </>
      )}
    </section>
  )
}
