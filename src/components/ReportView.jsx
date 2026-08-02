import { useState } from 'react'
import {
  addDays,
  addMonths,
  APP_START_DATE,
  endOfDay,
  formatDateRange,
  formatFullDate,
  formatMonthLabel,
  getDatesInMonth,
  getWeekDates,
  isFuture,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toISODate,
} from '../utils/date'
import ActivityStatsSummary from './ActivityStatsSummary'
import OutputsWeekCard from './OutputsWeekCard'
import CigarettesReportCard from './CigarettesReportCard'
import FoodReportCard from './FoodReportCard'

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
  let start, end
  if (period === 'day') {
    ;[start, end] = [startOfDay(cursor), endOfDay(cursor)]
  } else if (period === 'week') {
    start = startOfWeek(cursor)
    end = addDays(start, 7)
  } else {
    start = startOfMonth(cursor)
    end = startOfMonth(addMonths(cursor, 1))
  }
  return [start < APP_START_DATE ? APP_START_DATE : start, end]
}

function periodDays(period, cursor) {
  let days
  if (period === 'day') days = [cursor]
  else if (period === 'week') days = getWeekDates(startOfWeek(cursor))
  else days = getDatesInMonth(startOfMonth(cursor))
  return days.filter((d) => toISODate(d) >= toISODate(APP_START_DATE))
}

function periodHeaderLabel(period, cursor) {
  if (period === 'day') {
    return isSameDay(cursor, new Date()) ? 'Oggi' : formatFullDate(cursor)
  }
  if (period === 'week') {
    const [start, end] = periodRange('week', cursor)
    return formatDateRange(start, end)
  }
  return formatMonthLabel(startOfMonth(cursor))
}

function isNextDisabled(period, cursor) {
  const next = shiftCursor(period, cursor, 1)
  if (period === 'day') return isFuture(next)
  if (period === 'week') return isFuture(startOfWeek(next))
  return isFuture(startOfMonth(next))
}

function isPrevDisabled(period, cursor) {
  if (period === 'day') return toISODate(cursor) <= toISODate(APP_START_DATE)
  if (period === 'week') return startOfWeek(cursor) <= startOfWeek(APP_START_DATE)
  return startOfMonth(cursor) <= startOfMonth(APP_START_DATE)
}

export default function ReportView({ activities, entries, outputs, cigarettes, food }) {
  const [period, setPeriod] = useState('week')
  const [cursor, setCursor] = useState(() => new Date())

  const [rangeStart, rangeEnd] = periodRange(period, cursor)
  const [prevRangeStart, prevRangeEnd] = periodRange(period, shiftCursor(period, cursor, -1))
  const nextDisabled = isNextDisabled(period, cursor)
  const prevDisabled = isPrevDisabled(period, cursor)
  const days = periodDays(period, cursor)

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
          disabled={prevDisabled}
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

      {period === 'week' && <OutputsWeekCard outputs={outputs} days={days} />}
      <CigarettesReportCard cigarettes={cigarettes} days={days} />
      <FoodReportCard food={food} days={days} />

      <ActivityStatsSummary
        activities={activities}
        entries={entries}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        prevRangeStart={prevRangeStart}
        prevRangeEnd={prevRangeEnd}
        days={days}
        period={period}
      />
    </div>
  )
}
