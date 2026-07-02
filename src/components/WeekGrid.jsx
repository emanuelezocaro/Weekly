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
import { daySegments } from '../utils/entries'
import { colorVar } from '../utils/palette'

const DAY_MS = 24 * 60 * 60 * 1000

function activityFor(activities, id) {
  return activities.find((a) => a.id === id)
}

function DayBar({ date, activities, entries }) {
  const segments = daySegments(entries, date, new Date())
  return (
    <div className="day-bar">
      {segments.map((seg, i) => {
        const widthPct = ((seg.end - seg.start) / DAY_MS) * 100
        if (widthPct <= 0) return null
        if (seg.kind === 'future') {
          return <span key={i} className="day-bar__seg day-bar__seg--future" style={{ width: `${widthPct}%` }} />
        }
        if (seg.kind === 'gap') {
          return <span key={i} className="day-bar__seg day-bar__seg--gap" style={{ width: `${widthPct}%` }} />
        }
        const activity = activityFor(activities, seg.activityId)
        return (
          <span
            key={i}
            className="day-bar__seg"
            style={{ width: `${widthPct}%`, background: activity ? colorVar(activity.colorSlot) : 'var(--gap)' }}
          />
        )
      })}
    </div>
  )
}

export default function WeekGrid({ cursor, onCursorChange, onSelectDay, activities, entries }) {
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
        <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
      ) : (
        <ul className="week-bars">
          {dates.map((date) => (
            <li key={toISODate(date)} className={`week-bars__row ${isSameDay(date, new Date()) ? 'is-today' : ''}`}>
              <button type="button" className="week-bars__day" onClick={() => onSelectDay(date)}>
                <span className="week-bars__label">{dayLabel(date)}</span>
                <span className="week-bars__date">{date.getDate()}</span>
              </button>
              <DayBar date={date} activities={activities} entries={entries} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
