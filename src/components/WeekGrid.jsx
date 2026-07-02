import { addDays, formatDuration, formatWeekRange, isFuture, startOfWeek } from '../utils/date'
import { aggregateDuration } from '../utils/entries'
import { colorVar } from '../utils/palette'

const DAY_MS = 24 * 60 * 60 * 1000

export default function WeekGrid({ cursor, onCursorChange, activities, entries }) {
  const weekStart = startOfWeek(cursor)
  const weekEnd = addDays(weekStart, 7)
  const nextWeekDisabled = isFuture(addDays(weekStart, 7))

  const now = new Date()
  const totals = aggregateDuration(entries, weekStart, weekEnd, now)
  const elapsedMs = Math.max(0, Math.min(weekEnd, now) - weekStart)
  const elapsedDays = Math.max(1, Math.round(elapsedMs / DAY_MS))

  const ranked = activities
    .map((a) => ({ ...a, ms: totals.get(a.id) || 0 }))
    .sort((a, b) => b.ms - a.ms)

  return (
    <div className="panel">
      <div className="day-switcher">
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => onCursorChange(addDays(cursor, -7))}
          aria-label="Settimana precedente"
        >
          ‹
        </button>
        <div className="day-switcher__label">
          <strong>{formatWeekRange(weekStart)}</strong>
        </div>
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => onCursorChange(addDays(cursor, 7))}
          disabled={nextWeekDisabled}
          aria-label="Settimana successiva"
        >
          ›
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
      ) : (
        <ul className="report-list">
          {ranked.map((activity) => (
            <li key={activity.id} className="report-card">
              <div className="report-card__header">
                <span className="report-card__swatch" style={{ background: colorVar(activity.colorSlot) }} />
                <span aria-hidden="true">{activity.emoji}</span>
                <span className="report-card__name">{activity.name}</span>
                <span className="report-card__pct">{formatDuration(activity.ms)}</span>
              </div>
              <p className="report-card__avg">media {formatDuration(activity.ms / elapsedDays)}/giorno</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
