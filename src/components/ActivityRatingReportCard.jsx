import { dayLabel, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'
import { POINT_VALUE, RATING_COLOR, clusterFor } from '../utils/foodPoints'
import { goalForMonth, goalTargetForDays, isGoalMet } from '../utils/goals'
import { legendText } from '../utils/timeRatings'
import GoalTrendIndicator from './GoalTrendIndicator'
import TrendChartYAxis from './TrendChartYAxis'

// Rating-mode activities (Sleep, Put off, Work) get the exact same
// good/medium/bad gauge as Food's per-category rows -- Male=0, Medio=1,
// Buono=2 points a day, but the gauge up top reads on a 0-14 "a settimana"
// scale (7 days x 2 points) instead of the raw 0-2 daily average, same
// framing FoodCategoryChart already uses for a single field: the number
// then matches what you'd say out loud ("9/14 points this week") instead of
// an abstract daily average. It's still exactly the same average under the
// hood, just x7 -- clusterFor and the zone boundaries are percentage-based
// (1/3 and 3/4 of the max), so multiplying both the value and the max by 7
// lands in the identical zone. The daily/monthly bars below stay on the raw
// 0-2 scale, since a single day only ever earns up to 2 points.
const DAY_POINTS_MAX = 2
const WEEK_POINTS_MAX = DAY_POINTS_MAX * 7

function pointsFor(value) {
  return value ? POINT_VALUE[value] : null
}

function ratingMapFor(ratings, activityId) {
  const map = new Map()
  for (const r of ratings) {
    if (r.activityId === activityId) map.set(r.date, r.value)
  }
  return map
}

function averagePoints(values) {
  let total = 0
  let tracked = 0
  for (const v of values) {
    const p = pointsFor(v)
    if (p === null) continue
    total += p
    tracked += 1
  }
  return tracked > 0 ? total / tracked : null
}

function axisLegend(days) {
  if (days.length <= 7) return days.map((d) => dayLabel(d)).join(' · ')
  return `${String(days[0].getDate())} – ${String(days[days.length - 1].getDate())}`
}

function formatScaleValue(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

// `dailyAverage` is the raw 0-2 average; displayed and judged on the 0-14
// "a settimana" scale instead (see the constants above).
function RatingGauge({ dailyAverage }) {
  if (dailyAverage === null) return <p className="trend-chart__caption">Nessun dato per questo periodo</p>
  const value = dailyAverage * 7
  const cluster = clusterFor(value, WEEK_POINTS_MAX)
  const pct = Math.min(100, Math.max(0, (value / WEEK_POINTS_MAX) * 100))
  const badUpTo = WEEK_POINTS_MAX * (4 / 12)
  const midUpTo = WEEK_POINTS_MAX * (9 / 12)

  return (
    <>
      <div className="gauge-head">
        <span className={`gauge-head__value is-${cluster.key}`}>{value.toFixed(1)}</span>
        <span className="gauge-head__unit">/ {WEEK_POINTS_MAX} points a week</span>
      </div>
      <p className={`gauge-cluster is-${cluster.key}`}>{cluster.label}</p>
      <div className="gauge-track">
        <span className="gauge-zone gauge-zone--bad" style={{ width: `${(badUpTo / WEEK_POINTS_MAX) * 100}%` }} />
        <span className="gauge-zone gauge-zone--mid" style={{ width: `${((midUpTo - badUpTo) / WEEK_POINTS_MAX) * 100}%` }} />
        <span className="gauge-zone gauge-zone--good" style={{ width: `${((WEEK_POINTS_MAX - midUpTo) / WEEK_POINTS_MAX) * 100}%` }} />
        <span className="gauge-pointer" style={{ left: `${pct}%` }} />
      </div>
      <div className="gauge-scale">
        <span style={{ left: '0%' }}>0</span>
        <span style={{ left: `${(badUpTo / WEEK_POINTS_MAX) * 100}%` }}>{formatScaleValue(badUpTo)}</span>
        <span style={{ left: `${(midUpTo / WEEK_POINTS_MAX) * 100}%` }}>{formatScaleValue(midUpTo)}</span>
        <span style={{ left: '100%' }}>{WEEK_POINTS_MAX}</span>
      </div>
    </>
  )
}

// Same 3-band background as Food's PointZoneBackground -- expressed in
// percentages (1/3, 3/4), so it's identical regardless of the field's own
// max.
const BAD_BOUNDARY_PCT = (4 / 12) * 100
const MID_BOUNDARY_PCT = (9 / 12) * 100

function PointZoneBackground() {
  return (
    <>
      <div className="goal-zone goal-zone--bad" style={{ bottom: 0, top: `${100 - BAD_BOUNDARY_PCT}%` }} />
      <div className="goal-zone goal-zone--mid" style={{ bottom: `${BAD_BOUNDARY_PCT}%`, top: `${100 - MID_BOUNDARY_PCT}%` }} />
      <div className="goal-zone goal-zone--good" style={{ bottom: `${MID_BOUNDARY_PCT}%`, top: 0 }} />
      <div className="goal-line" style={{ bottom: `${MID_BOUNDARY_PCT}%` }}>
        <span className="goal-line__tag">Good</span>
      </div>
      <div className="goal-line" style={{ bottom: `${BAD_BOUNDARY_PCT}%` }}>
        <span className="goal-line__tag">Medium</span>
      </div>
    </>
  )
}

function shouldLabelDay(index, total) {
  if (total <= 7) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}

function dailyAxisLabel(d, days) {
  return days.length <= 7 ? dayLabel(d) : String(d.getDate())
}

// One bar per day with that day's own points (0/1/2), colored by its own
// zone -- not the period average -- so it's obvious at a glance which day
// pulled the gauge above up or down.
function RatingDailyChart({ days, ratingMap }) {
  return (
    <div className="trend-chart__row">
      <TrendChartYAxis maxValue={DAY_POINTS_MAX} formatValue={(v) => `${v}`} />
      <div className="trend-chart__bars-wrap">
        <PointZoneBackground />
        <div className="trend-chart__bars">
          {days.map((d, i) => {
            const points = pointsFor(ratingMap.get(toISODate(d)) ?? null)
            const heightPct = points === null ? 2 : Math.max(2, (points / DAY_POINTS_MAX) * 100)
            const color = points === null ? 'var(--border)' : RATING_COLOR[clusterFor(points, DAY_POINTS_MAX).key]
            return (
              <div key={toISODate(d)} className="trend-chart__col">
                <span className="trend-chart__bar-track">
                  <span className="cigarettes-chart__bar" style={{ height: `${heightPct}%`, background: color }} />
                </span>
                <span className="trend-chart__label">{shouldLabelDay(i, days.length) ? dailyAxisLabel(d, days) : ''}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Anno: una barra per mese con la media punti (solo giorni valutati) di
// quel mese -- stessa scala e stesso sfondo a fasce del grafico giornaliero.
function RatingMonthlyChart({ months, ratingMap }) {
  return (
    <div className="trend-chart__row">
      <TrendChartYAxis maxValue={DAY_POINTS_MAX} formatValue={(v) => `${v}`} />
      <div className="trend-chart__bars-wrap">
        <PointZoneBackground />
        <div className="trend-chart__bars">
          {months.map((m) => {
            const values = m.days.map((d) => ratingMap.get(toISODate(d)) ?? null)
            const avg = averagePoints(values)
            const heightPct = avg === null ? 2 : Math.max(2, (avg / DAY_POINTS_MAX) * 100)
            const color = avg === null ? 'var(--border)' : RATING_COLOR[clusterFor(avg, DAY_POINTS_MAX).key]
            return (
              <div key={toMonthISO(m.monthStart)} className="trend-chart__col">
                <span className="trend-chart__bar-track">
                  <span className="cigarettes-chart__bar" style={{ height: `${heightPct}%`, background: color }} />
                </span>
                <span className="trend-chart__label">{formatMonthShort(toMonthISO(m.monthStart))}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Rating-mode activities (Sleep, Put off, Work): a single Bad/Medium/Good
// tap per day, shown with the exact same gauge + zone-colored chart as
// Food, on a 0-14 "a settimana" scale (Male=0, Medio=1, Buono=2 points a
// day, x7) instead of Food's own 0-12 -- plus the "how many Good days" goal
// Cibo/checklist activities already use.
export default function ActivityRatingReportCard({ activity, ratings, days, period, goals }) {
  const ratingMap = ratingMapFor(ratings, activity.id)
  const values = days.map((d) => ratingMap.get(toISODate(d)) ?? null)
  const goodCount = values.filter((v) => v === 'good').length
  const legend = legendText(activity.name)

  const goal = goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1]))
  const target = goalTargetForDays(goal, days.length)

  const dailyAverage = averagePoints(values)

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">{activity.name}</h2>
        <GoalTrendIndicator goal={goal} actual={goodCount} target={target} />
      </div>
      <RatingGauge dailyAverage={dailyAverage} />
      {legend && <p className="trend-chart__caption">{legend}</p>}
      {period === 'year' ? (
        <>
          <p className="trend-chart__caption">Media punti di ogni mese (0-{DAY_POINTS_MAX})</p>
          <RatingMonthlyChart months={groupDaysByMonth(days)} ratingMap={ratingMap} />
        </>
      ) : (
        <>
          <p className="trend-chart__caption">Punteggio di ogni giorno (0-{DAY_POINTS_MAX})</p>
          <RatingDailyChart days={days} ratingMap={ratingMap} />
          {days.length <= 7 ? null : (
            <p className="trend-chart__caption" style={{ marginTop: 4 }}>
              {axisLegend(days)}
            </p>
          )}
        </>
      )}
      <p className="trend-chart__caption">
        {goodCount}/{days.length} giorni buono
        {goal && target !== null && (
          <span className="report-card__delta">
            {' '}
            (obiettivo {goal.value}/{goal.period === 'day' ? 'giorno' : 'settimana'}:{' '}
            {isGoalMet(goal, goodCount, Math.round(target)) ? 'raggiunto' : 'non raggiunto'})
          </span>
        )}
      </p>
    </section>
  )
}
