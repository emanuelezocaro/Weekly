import { formatDuration } from '../utils/date'
import { DAY_MS, activityStats } from '../utils/entries'
import { colorVar } from '../utils/palette'

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
  now = new Date(),
}) {
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
          return (
            <li key={activity.id} className="report-card">
              <div className="report-card__header">
                <span className="report-card__swatch" style={{ background: colorVar(activity.colorSlot) }} />
                <span className="report-card__name">{activity.name}</span>
                <span className="report-card__pct">{formatDuration(activity.avgMsPerDay)}/giorno</span>
              </div>
              <p className="report-card__avg">
                {formatPct(activity.pctOfDay)} della giornata
                {delta !== null && (
                  <span className="report-card__delta">
                    {' · '}
                    {delta > 0 ? '+' : ''}
                    {delta}% rispetto al periodo precedente
                  </span>
                )}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
