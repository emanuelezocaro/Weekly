import { useState } from 'react'
import {
  addDays,
  addMonths,
  formatFullDate,
  formatMonthLabel,
  formatWeekRange,
  getDatesInMonth,
  getWeekDates,
  isFuture,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from '../utils/date'
import { bestStreak, currentStreak, rangeCompletion } from '../utils/stats'

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

function periodDates(period, cursor) {
  if (period === 'day') return [cursor]
  if (period === 'week') return getWeekDates(startOfWeek(cursor))
  return getDatesInMonth(startOfMonth(cursor))
}

function periodLabel(period, cursor) {
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

export default function ReportView({ activities, logs }) {
  const [period, setPeriod] = useState('week')
  const [cursor, setCursor] = useState(() => new Date())

  const dates = periodDates(period, cursor)
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
          <strong>{periodLabel(period, cursor)}</strong>
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

      {activities.length === 0 ? (
        <p className="empty-state">Aggiungi delle attività per vedere i report.</p>
      ) : (
        <ul className="report-list">
          {activities.map((activity) => {
            const { done, total, pct } = rangeCompletion(logs, activity.id, dates)
            const streak = currentStreak(logs, activity.id)
            const best = bestStreak(logs, activity.id)
            return (
              <li key={activity.id} className="report-card">
                <div className="report-card__header">
                  <span aria-hidden="true">{activity.emoji}</span>
                  <span className="report-card__name">{activity.name}</span>
                  <span className="report-card__pct">{pct}%</span>
                </div>
                <div className="report-card__bar">
                  <div className="report-card__bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="report-card__meta">
                  <span>
                    {done}/{total} giorni
                  </span>
                  <span>🔥 streak: {streak}</span>
                  <span>🏆 record: {best}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
