import {
  addDays,
  dayLabel,
  formatWeekRange,
  getWeekDates,
  isFuture,
  isSameDay,
  startOfWeek,
  toISODate,
} from '../utils/date'

export default function WeekGrid({ cursor, onCursorChange, onSelectDay, activities, logs, onToggle }) {
  const weekStart = startOfWeek(cursor)
  const dates = getWeekDates(weekStart)
  const nextWeekDisabled = isFuture(addDays(weekStart, 7))

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
        <p className="empty-state">
          Nessuna attività ancora. Aggiungine una dalla scheda "Impostazioni".
        </p>
      ) : (
        <div className="week-grid-wrap">
          <table className="week-grid">
            <thead>
              <tr>
                <th className="week-grid__activity-col" />
                {dates.map((date) => (
                  <th
                    key={toISODate(date)}
                    className={isSameDay(date, new Date()) ? 'is-today' : ''}
                  >
                    <button
                      type="button"
                      className="week-grid__day-btn"
                      onClick={() => onSelectDay(date)}
                    >
                      <span className="week-grid__day">{dayLabel(date)}</span>
                      <span className="week-grid__date">{date.getDate()}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <th scope="row" className="week-grid__activity-col">
                    <span aria-hidden="true">{activity.emoji}</span> {activity.name}
                  </th>
                  {dates.map((date) => {
                    const iso = toISODate(date)
                    const done = !!logs[iso]?.[activity.id]
                    const future = isFuture(date)
                    return (
                      <td key={iso} className={isSameDay(date, new Date()) ? 'is-today' : ''}>
                        <button
                          type="button"
                          className={`week-grid__cell ${done ? 'is-done' : ''}`}
                          disabled={future}
                          onClick={() => onToggle(iso, activity.id)}
                          aria-label={`${activity.name} - ${iso}`}
                        >
                          {done ? '✓' : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
