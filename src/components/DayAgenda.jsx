import { addDays, formatFullDate, isFuture, isSameDay, toISODate } from '../utils/date'

export default function DayAgenda({ cursor, onCursorChange, activities, logs, onToggle }) {
  const iso = toISODate(cursor)
  const dayLog = logs[iso] || {}
  const isToday = isSameDay(cursor, new Date())
  const nextDisabled = isFuture(addDays(cursor, 1))

  return (
    <div className="panel">
      <div className="day-switcher">
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => onCursorChange(addDays(cursor, -1))}
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <button
          type="button"
          className="day-switcher__label"
          onClick={() => onCursorChange(new Date())}
        >
          <strong>{isToday ? 'Oggi' : formatFullDate(cursor)}</strong>
          {!isToday && <span className="day-switcher__sub">{formatFullDate(cursor)}</span>}
        </button>
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => onCursorChange(addDays(cursor, 1))}
          disabled={nextDisabled}
          aria-label="Giorno successivo"
        >
          ›
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="empty-state">
          Nessuna attività ancora. Aggiungine una dalla scheda "Impostazioni".
        </p>
      ) : (
        <ul className="habit-list">
          {activities.map((activity) => {
            const done = !!dayLog[activity.id]
            return (
              <li key={activity.id}>
                <button
                  type="button"
                  className={`habit-row ${done ? 'is-done' : ''}`}
                  onClick={() => onToggle(iso, activity.id)}
                >
                  <span className="habit-row__emoji" aria-hidden="true">
                    {activity.emoji}
                  </span>
                  <span className="habit-row__name">{activity.name}</span>
                  <span className="habit-row__check">{done ? '✓' : ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
