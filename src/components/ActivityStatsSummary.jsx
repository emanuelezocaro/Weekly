import { useState } from 'react'
import { formatDuration } from '../utils/date'
import { DAY_MS, activityStats } from '../utils/entries'
import { colorVar } from '../utils/palette'
import ActivityTrendChart from './ActivityTrendChart'

function formatPct(fraction) {
  return `${Math.round(fraction * 100)}%`
}

export default function ActivityStatsSummary({
  activities,
  entries,
  rangeStart,
  rangeEnd,
  prevRangeStart,
  prevRangeEnd,
  days,
  now = new Date(),
}) {
  const [expandedId, setExpandedId] = useState(null)

  if (activities.length === 0) {
    return <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
  }

  const { stats, trackedMs, untrackedMs, avgUntrackedMsPerDay } = activityStats(
    activities,
    entries,
    rangeStart,
    rangeEnd,
    now,
  )

  const prevStatsById = new Map()
  if (prevRangeStart && prevRangeEnd) {
    const prev = activityStats(activities, entries, prevRangeStart, prevRangeEnd, now)
    for (const s of prev.stats) prevStatsById.set(s.id, s)
  }

  const barSegments = stats.filter((s) => s.avgMsPerDay > 0)
  const canDrillDown = Array.isArray(days) && days.length > 1

  return (
    <div className="stats-summary">
      <div className="avg-day-bar">
        {barSegments.map((s) => (
          <span key={s.id} style={{ width: formatPct(s.pctOfDay), background: colorVar(s.colorSlot) }} />
        ))}
        {avgUntrackedMsPerDay > 0 && (
          <span className="avg-day-bar__untracked" style={{ width: formatPct(avgUntrackedMsPerDay / DAY_MS) }} />
        )}
      </div>
      <p className="stats-summary__caption">Come si compone in media la tua giornata di 24 ore</p>

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
            prev && prev.avgMsPerDay > 0
              ? Math.round(((activity.avgMsPerDay - prev.avgMsPerDay) / prev.avgMsPerDay) * 100)
              : null
          const expanded = expandedId === activity.id
          return (
            <li key={activity.id} className="report-card">
              <button
                type="button"
                className="report-card__header report-card__header--btn"
                disabled={!canDrillDown}
                onClick={() => setExpandedId(expanded ? null : activity.id)}
              >
                <span className="report-card__swatch" style={{ background: colorVar(activity.colorSlot) }} />
                <span className="report-card__name">{activity.name}</span>
              </button>
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
              {expanded && (
                <ActivityTrendChart activity={activity} days={days} entries={entries} now={now} />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
