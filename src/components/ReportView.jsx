import { useState } from 'react'
import {
  addDays,
  addMonths,
  endOfDay,
  formatFullDate,
  formatMonthLabel,
  formatWeekRange,
  getDatesInMonth,
  getWeekDates,
  isFuture,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../utils/date'
import ActivityStatsSummary from './ActivityStatsSummary'

const PERIODS = [
  { id: 'day', label: 'Giorno' },
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
]

function shiftCursor(period, cursor, direction) {
  if (period === 'day') return addDays(cursor, direction)
  if (period === 'week') return addDays(cursor, direction * 7)
  return addMonths(cursor, direction)
}

function periodRange(period, cursor) {
  if (period === 'day') return [startOfDay(cursor), endOfDay(cursor)]
  if (period === 'week') {
    const start = startOfWeek(cursor)
    return [start, addDays(start, 7)]
  }
  const start = startOfMonth(cursor)
  return [start, startOfMonth(addMonths(cursor, 1))]
}

function periodDays(period, cursor) {
  if (period === 'day') return [cursor]
  if (period === 'week') return getWeekDates(startOfWeek(cursor))
  return getDatesInMonth(startOfMonth(cursor))
}

function periodHeaderLabel(period, cursor) {
  if (period === 'day') {
    return isSameDay(cursor, new Date()) ? 'Oggi' : formatFullDate(cursor)
  }
  if (period === 'week') return formatWeekRange(startOfWeek(cursor))
  return formatMonthLabel(startOfMonth(cursor))
}

function isNextDisabled(period, cursor) {
  const next = shiftCursor(period, cursor, 1)
  if (period === 'day') return isFuture(next)
  if (period === 'week') return isFuture(startOfWeek(next))
  return isFuture(startOfMonth(next))
}

export default function ReportView({ activities, entries }) {
  const [period, setPeriod] = useState('week')
  const [cursor, setCursor] = useState(() => new Date())

  const [rangeStart, rangeEnd] = periodRange(period, cursor)
  const [prevRangeStart, prevRangeEnd] = periodRange(period, shiftCursor(period, cursor, -1))
  const nextDisabled = isNextDisabled(period, cursor)

  return (
    <div className="view">
      <div className="segmented">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`segmented__item ${period === p.id ? 'is-active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="day-switcher">
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => setCursor((c) => shiftCursor(period, c, -1))}
          aria-label="Periodo precedente"
        >
          ‹
        </button>
        <div className="day-switcher__label">
          <strong>{periodHeaderLabel(period, cursor)}</strong>
        </div>
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => setCursor((c) => shiftCursor(period, c, 1))}
          disabled={nextDisabled}
          aria-label="Periodo successivo"
        >
          ›
        </button>
      </div>

      <ActivityStatsSummary
        activities={activities}
        entries={entries}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        prevRangeStart={prevRangeStart}
        prevRangeEnd={prevRangeEnd}
        days={periodDays(period, cursor)}
      />
    </div>
  )
}
