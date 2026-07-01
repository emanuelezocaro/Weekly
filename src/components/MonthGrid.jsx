import {
  addMonths,
  formatMonthLabel,
  getMonthMatrix,
  isFuture,
  isSameDay,
  isSameMonth,
  startOfMonth,
  toISODate,
} from '../utils/date'
import { dayCompletionRatio } from '../utils/stats'

const WEEKDAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

export default function MonthGrid({ cursor, onCursorChange, onSelectDay, activities, logs }) {
  const monthDate = startOfMonth(cursor)
  const weeks = getMonthMatrix(monthDate)
  const nextDisabled = isFuture(startOfMonth(addMonths(monthDate, 1)))

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
          <strong>{formatMonthLabel(monthDate)}</strong>
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

      <div className="month-grid">
        <div className="month-grid__weekdays">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div className="month-grid__week" key={wi}>
            {week.map((date) => {
              const iso = toISODate(date)
              const outside = !isSameMonth(date, monthDate)
              const today = isSameDay(date, new Date())
              const future = isFuture(date)
              const ratio = activities.length > 0 ? dayCompletionRatio(logs, activities, iso) : 0
              return (
                <button
                  key={iso}
                  type="button"
                  className={`month-grid__day ${outside ? 'is-outside' : ''} ${today ? 'is-today' : ''}`}
                  onClick={() => onSelectDay(date)}
                >
                  <span className="month-grid__num">{date.getDate()}</span>
                  {!outside && !future && activities.length > 0 && (
                    <span
                      className="month-grid__dot"
                      style={{ opacity: ratio > 0 ? 0.35 + ratio * 0.65 : 0.15 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
