import { addMonths, formatDuration, formatMonthLabel, isFuture, startOfMonth } from '../utils/date'
import { aggregateDuration } from '../utils/entries'
import { colorVar } from '../utils/palette'

const DAY_MS = 24 * 60 * 60 * 1000

export default function MonthGrid({ cursor, onCursorChange, activities, entries }) {
  const monthStart = startOfMonth(cursor)
  const monthEnd = startOfMonth(addMonths(cursor, 1))
  const nextDisabled = isFuture(monthEnd)

  const now = new Date()
  const totals = aggregateDuration(entries, monthStart, monthEnd, now)
  const elapsedMs = Math.max(0, Math.min(monthEnd, now) - monthStart)
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
          onClick={() => onCursorChange(addMonths(cursor, -1))}
          aria-label="Mese precedente"
        >
          ‹
        </button>
        <div className="day-switcher__label">
          <strong>{formatMonthLabel(monthStart)}</strong>
        </div>
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => onCursorChange(addMonths(cursor, 1))}
          disabled={nextDisabled}
          aria-label="Mese successivo"
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
