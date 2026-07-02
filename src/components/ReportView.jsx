import { useState } from 'react'
import {
  addDays,
  addMonths,
  endOfDay,
  formatDuration,
  formatFullDate,
  formatMonthLabel,
  formatWeekRange,
  isFuture,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../utils/date'
import { aggregateDuration } from '../utils/entries'
import { colorVar } from '../utils/palette'

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

export default function ReportView({ activities, entries }) {
  const [period, setPeriod] = useState('week')
  const [cursor, setCursor] = useState(() => new Date())

  const [rangeStart, rangeEnd] = periodRange(period, cursor)
  const now = new Date()
  const nextDisabled = isNextDisabled(period, cursor)

  const totals = aggregateDuration(entries, rangeStart, rangeEnd, now)
  const trackedMs = Array.from(totals.values()).reduce((sum, ms) => sum + ms, 0)
  const elapsedMs = Math.max(0, Math.min(rangeEnd, now) - rangeStart)
  const untrackedMs = Math.max(0, elapsedMs - trackedMs)

  const ranked = activities
    .map((a) => ({ ...a, ms: totals.get(a.id) || 0 }))
    .sort((a, b) => b.ms - a.ms)
  const maxMs = Math.max(1, ...ranked.map((a) => a.ms))

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
        <>
          <div className="report-summary">
            <span>
              Tracciato: <strong>{formatDuration(trackedMs)}</strong>
            </span>
            <span className="report-summary__muted">
              Non registrato: {formatDuration(untrackedMs)}
            </span>
          </div>

          <ul className="report-list">
            {ranked.map((activity) => (
              <li key={activity.id} className="report-card">
                <div className="report-card__header">
                  <span
                    className="report-card__swatch"
                    style={{ background: colorVar(activity.colorSlot) }}
                  />
                  <span aria-hidden="true">{activity.emoji}</span>
                  <span className="report-card__name">{activity.name}</span>
                  <span className="report-card__pct">{formatDuration(activity.ms)}</span>
                </div>
                <div className="report-card__bar">
                  <div
                    className="report-card__bar-fill"
                    style={{
                      width: `${(activity.ms / maxMs) * 100}%`,
                      background: colorVar(activity.colorSlot),
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
