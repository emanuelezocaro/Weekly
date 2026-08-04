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

// Ring chart for "share of the day so far": each slice's arc length comes
// from stroke-dasharray on a plain circle, with a small gap (the standard
// donut technique) between slices so adjacent colors never touch.
function DonutChart({ segments, size = 108, strokeWidth = 20 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gapPx = segments.length > 1 ? 3 : 0
  let cumulative = 0

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="day-donut__svg" role="img" aria-label="Ripartizione del tempo per attività">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={strokeWidth} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s) => {
          const rawLen = s.fraction * circumference
          const len = Math.max(0, rawLen - gapPx)
          const dashoffset = -cumulative
          cumulative += rawLen
          if (rawLen <= 0) return null
          return (
            <circle
              key={s.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
            />
          )
        })}
      </g>
    </svg>
  )
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
  const zeroActivities = stats.filter((s) => s.totalMs === 0)
  const canDrillDown = Array.isArray(days) && days.length > 1

  // Sub-minute leftovers (floating-point/clock-tick residue between "now"
  // and the last logged entry) round down to "0m" when displayed, so guard
  // on the rounded value -- otherwise a technically-nonzero-but-invisible
  // untrackedMs shows a "Non registrato: 0m" that reads as a bug.
  const hasUntracked = Math.round(untrackedMs / 60000) > 0

  // Shares are proportions of what's actually elapsed so far (tracked +
  // untracked), not of a fixed 24h/day denominator -- otherwise an
  // in-progress week/month would show slices that don't add up to a full
  // ring, since the current day hasn't fully elapsed yet.
  const accountedMs = trackedMs + untrackedMs
  const shareOf = (ms) => (accountedMs > 0 ? ms / accountedMs : 0)
  const donutSegments = [
    ...barSegments.map((s) => ({ id: s.id, name: s.name, color: colorVar(s.colorSlot), fraction: shareOf(s.totalMs) })),
    ...(hasUntracked
      ? [{ id: '__untracked', name: 'Non registrato', color: 'var(--gap)', fraction: shareOf(untrackedMs) }]
      : []),
  ]

  const periodMs = rangeEnd - rangeStart
  const elapsedPct = periodMs > 0 ? Math.round((accountedMs / periodMs) * 100) : 100
  const periodPhrase = PERIOD_PHRASE[period]

  return (
    <div className="stats-summary">
      <section className="settings-card">
        <h2 className="settings-card__title">Attività</h2>
        {donutSegments.length > 0 && (
          <div className="day-donut">
            <DonutChart segments={donutSegments} />
            <ul className="day-donut__legend">
              {donutSegments.map((s) => (
                <li key={s.id}>
                  <span className="day-donut__swatch" style={{ background: s.color }} />
                  <span className="day-donut__name">{s.name}</span>
                  <span className="day-donut__pct">{formatPct(s.fraction)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {zeroActivities.length > 0 && (
          <p className="day-donut__zero">A zero: {zeroActivities.map((a) => a.name).join(', ')}</p>
        )}
        {canDrillDown && periodPhrase && (
          <p className="stats-summary__progress">
            {elapsedPct}% {periodPhrase}
            {elapsedPct < 100 && ` · ${100 - elapsedPct}% rimanente`}
          </p>
        )}

        <div className="report-summary">
          <span>
            Tracciato: <strong>{formatDuration(trackedMs)}</strong>
          </span>
          {hasUntracked && (
            <span className="report-summary__missing">Non registrato: {formatDuration(untrackedMs)}</span>
          )}
        </div>
      </section>

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
                <GoalTrendIndicator
                  goal={goal}
                  actual={activity.totalMs / 60000}
                  target={target}
                  formatDiff={(minutes) => formatDuration(minutes * 60000)}
                />
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
