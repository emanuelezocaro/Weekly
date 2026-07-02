import { addDays, formatWeekRange, isFuture, startOfWeek } from '../utils/date'
import ActivityStatsSummary from './ActivityStatsSummary'

export default function WeekGrid({ cursor, onCursorChange, activities, entries }) {
  const weekStart = startOfWeek(cursor)
  const weekEnd = addDays(weekStart, 7)
  const prevWeekStart = addDays(weekStart, -7)
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

      <ActivityStatsSummary
        activities={activities}
        entries={entries}
        rangeStart={weekStart}
        rangeEnd={weekEnd}
        prevRangeStart={prevWeekStart}
        prevRangeEnd={weekStart}
      />
    </div>
  )
}
