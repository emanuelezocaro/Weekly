import { addMonths, formatMonthLabel, getDatesInMonth, isFuture, startOfMonth } from '../utils/date'
import ActivityStatsSummary from './ActivityStatsSummary'

export default function MonthGrid({ cursor, onCursorChange, activities, entries }) {
  const monthStart = startOfMonth(cursor)
  const monthEnd = startOfMonth(addMonths(cursor, 1))
  const prevMonthStart = startOfMonth(addMonths(cursor, -1))
  const nextDisabled = isFuture(monthEnd)

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

      <ActivityStatsSummary
        activities={activities}
        entries={entries}
        rangeStart={monthStart}
        rangeEnd={monthEnd}
        prevRangeStart={prevMonthStart}
        prevRangeEnd={monthStart}
        days={getDatesInMonth(monthStart)}
        periodLabel="del mese"
      />
    </div>
  )
}
