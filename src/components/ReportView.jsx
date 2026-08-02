import { useState } from 'react'
import {
  addDays,
  addMonths,
  APP_START_DATE,
  formatDateRange,
  formatMonthLabel,
  isFuture,
  startOfMonth,
  startOfWeek,
} from '../utils/date'
import ActivityStatsSummary from './ActivityStatsSummary'
import OutputsWeekCard from './OutputsWeekCard'
import CigarettesReportCard from './CigarettesReportCard'
import FoodReportCard from './FoodReportCard'

const PERIODS = [
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
  { id: 'quarter', label: 'Trimestre' },
]

function startOfQuarter(date) {
  const qMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), qMonth, 1)
}

function shiftCursor(period, cursor, direction) {
  if (period === 'week') return addDays(cursor, direction * 7)
  if (period === 'month') return addMonths(cursor, direction)
  return addMonths(cursor, direction * 3)
}

function periodRange(period, cursor) {
  let start, end
  if (period === 'week') {
    start = startOfWeek(cursor)
    end = addDays(start, 7)
  } else if (period === 'month') {
    start = startOfMonth(cursor)
    end = startOfMonth(addMonths(cursor, 1))
  } else {
    start = startOfQuarter(cursor)
    end = startOfQuarter(addMonths(cursor, 3))
  }
  return [start < APP_START_DATE ? APP_START_DATE : start, end]
}

function periodDays(period, cursor) {
  const [start, end] = periodRange(period, cursor)
  const days = []
  let d = start
  while (d < end) {
    days.push(d)
    d = addDays(d, 1)
  }
  return days
}

function periodHeaderLabel(period, cursor) {
  if (period === 'month') return formatMonthLabel(startOfMonth(cursor))
  const [start, end] = periodRange(period, cursor)
  return formatDateRange(start, end)
}

function isNextDisabled(period, cursor) {
  const next = shiftCursor(period, cursor, 1)
  if (period === 'week') return isFuture(startOfWeek(next))
  if (period === 'month') return isFuture(startOfMonth(next))
  return isFuture(startOfQuarter(next))
}

function isPrevDisabled(period, cursor) {
  if (period === 'week') return startOfWeek(cursor) <= startOfWeek(APP_START_DATE)
  if (period === 'month') return startOfMonth(cursor) <= startOfMonth(APP_START_DATE)
  return startOfQuarter(cursor) <= startOfQuarter(APP_START_DATE)
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

      <OutputsWeekCard outputs={outputs} days={days} period={period} />
      <CigarettesReportCard cigarettes={cigarettes} days={days} period={period} />
      <FoodReportCard food={food} days={days} period={period} />

      <hr className="report-divider" />

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
