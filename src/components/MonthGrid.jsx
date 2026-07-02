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
import { daySegments } from '../utils/entries'
import { colorVar } from '../utils/palette'

const WEEKDAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const DAY_MS = 24 * 60 * 60 * 1000

function activityFor(activities, id) {
  return activities.find((a) => a.id === id)
}

function MiniBar({ date, activities, entries }) {
  const segments = daySegments(entries, date, new Date()).filter((s) => s.kind === 'entry')
  if (segments.length === 0) return <span className="month-grid__bar month-grid__bar--empty" />
  return (
    <span className="month-grid__bar">
      {segments.map((seg, i) => {
        const widthPct = ((seg.end - seg.start) / DAY_MS) * 100
        const activity = activityFor(activities, seg.activityId)
        return (
          <span
            key={i}
            style={{ width: `${widthPct}%`, background: activity ? colorVar(activity.colorSlot) : 'var(--gap)' }}
          />
        )
      })}
    </span>
  )
}

export default function MonthGrid({ cursor, onCursorChange, onSelectDay, activities, entries }) {
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
              return (
                <button
                  key={iso}
                  type="button"
                  className={`month-grid__day ${outside ? 'is-outside' : ''} ${today ? 'is-today' : ''}`}
                  onClick={() => onSelectDay(date)}
                >
                  <span className="month-grid__num">{date.getDate()}</span>
                  {!outside && !future && activities.length > 0 && (
                    <MiniBar date={date} activities={activities} entries={entries} />
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
