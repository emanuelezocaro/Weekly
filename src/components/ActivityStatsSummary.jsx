import { formatDuration, toMonthISO } from '../utils/date'
import { activityStats } from '../utils/entries'
import { goalForMonth, goalTargetForDays } from '../utils/goals'
import { colorVar } from '../utils/palette'
import ActivityTrendChart from './ActivityTrendChart'
import GoalTrendIndicator from './GoalTrendIndicator'

function formatPct(fraction) {
  return `${Math.round(fraction * 100)}%`
}

const PERIOD_PHRASE = {
  week: 'della settimana trascorsa',
  month: 'del mese trascorso',
  quarter: 'del trimestre trascorso',
}

export default function ActivityStatsSummary({
  activities,
  entries,
  rangeStart,
  rangeEnd,
  prevRangeStart,
  prevRangeEnd,
  days,
  period,
  goals,
  now = new Date(),
}) {
  if (activities.length === 0) {
    return <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
  }

  const { stats, trackedMs, untrackedMs } = activityStats(activities, entries, rangeStart, rangeEnd, now)

  // Compare like-for-like: if the current period is still in progress, only
  // count the same elapsed duration from the previous period too, instead of
  // its full (already complete) span -- otherwise a week that just started
  // would always look far behind a previous week that had all 7 days to run.
  const rawElapsedMs = Math.max(0, Math.min(rangeEnd, now) - rangeStart)
  const prevStatsById = new Map()
  if (prevRangeStart && prevRangeEnd) {
    const clippedPrevEnd = new Date(
      Math.min(prevRangeStart.getTime() + rawElapsedMs, prevRangeEnd.getTime()),
    )
    const prev = activityStats(activities, entries, prevRangeStart, clippedPrevEnd, now)
    for (const s of prev.stats) prevStatsById.set(s.id, s)
  }

  const barSegments = stats.filter((s) => s.totalMs > 0)
  const canDrillDown = Array.isArray(days) && days.length > 1

  // The bar always renders full: widths are proportions of what's actually
  // elapsed so far (tracked + untracked), not of a fixed 24h/day denominator
  // -- otherwise an in-progress week/month would show a bar that trails off
  // partway, since the current day hasn't fully elapsed yet.
  const accountedMs = trackedMs + untrackedMs
  const barWidth = (ms) => (accountedMs > 0 ? formatPct(ms / accountedMs) : '0%')

  const periodMs = rangeEnd - rangeStart
  const elapsedPct = periodMs > 0 ? Math.round((accountedMs / periodMs) * 100) : 100
  const periodPhrase = PERIOD_PHRASE[period]

  return (
    <div className="stats-summary">
      <div className="avg-day-bar">
        {barSegments.map((s) => (
          <span key={s.id} style={{ width: barWidth(s.totalMs), background: colorVar(s.colorSlot) }} />
        ))}
        {untrackedMs > 0 && <span className="avg-day-bar__untracked" style={{ width: barWidth(untrackedMs) }} />}
      </div>
      {canDrillDown && periodPhrase && (
        <p className="stats-summary__progress">
          {elapsedPct}% {periodPhrase} · {100 - elapsedPct}% rimanente
        </p>
      )}

      <div className="report-summary">
        <span>
          Tracciato: <strong>{formatDuration(trackedMs)}</strong>
        </span>
        <span className="report-summary__muted">Non registrato: {formatDuration(untrackedMs)}</span>
      </div>

      <ul className="report-list">
        {stats.map((activity) => {
          const prev = prevStatsById.get(activity.id)
          const delta =
            prev && prev.totalMs > 0
              ? Math.round(((activity.totalMs - prev.totalMs) / prev.totalMs) * 100)
              : null
          const goal = canDrillDown ? goalForMonth(goals, activity.id, toMonthISO(days[days.length - 1])) : null
          const target = canDrillDown ? goalTargetForDays(goal, days.length) : null
          return (
            <li key={activity.id} className="report-card">
              <div className="report-card__header">
                <span className="report-card__swatch" style={{ background: colorVar(activity.colorSlot) }} />
                <span className="report-card__name">{activity.name}</span>
                <GoalTrendIndicator goal={goal} actual={activity.totalMs / 60000} target={target} />
              </div>
              <div className="report-card__line2">
                <span className="report-card__total">{formatDuration(activity.totalMs)}</span>
                <span className="report-card__avg">{formatDuration(activity.avgMsPerDay)}/giorno</span>
                <span className="report-card__pct">{formatPct(activity.pctOfDay)}</span>
              </div>
              {delta !== null && (
                <p className="report-card__delta">
                  {delta > 0 ? '+' : ''}
                  {delta}% rispetto al periodo precedente
                </p>
              )}
              {canDrillDown && (
                <ActivityTrendChart
                  activity={activity}
                  days={days}
                  entries={entries}
                  period={period}
                  goals={goals}
                  now={now}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
