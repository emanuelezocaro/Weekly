import { useState } from 'react'
import {
  addDays,
  dayLabel,
  formatDateRange,
  formatDuration,
  formatFullDate,
  formatShortDate,
  groupDaysByWeek,
  isSameDay,
  toISODate,
  toMonthISO,
} from '../utils/date'
import { dailyTotalsForActivity } from '../utils/entries'
import { colorVar } from '../utils/palette'
import { minutesToHours } from '../utils/goals'
import GoalLine from './GoalLine'

// Sparse x-axis labels: every day for a week, every ~5th (plus first/last) for
// a month — never one label per bar once there are more than a handful.
function shouldLabel(index, total) {
  if (total <= 7) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}

function axisLabel(date, days) {
  return days.length <= 7 ? dayLabel(date) : String(date.getDate())
}

// Trimestre: troppi giorni per una barra a testa, si aggrega per settimana
// sommando le durate.
function weeklyTotals(dailyTotals, days) {
  const msByDate = new Map(dailyTotals.map((t) => [toISODate(t.date), t.ms]))
  return groupDaysByWeek(days).map((w) => ({
    date: w.weekStart,
    ms: w.days.reduce((sum, d) => sum + (msByDate.get(toISODate(d)) || 0), 0),
  }))
}

export default function ActivityTrendChart({ activity, days, entries, period, goals, now = new Date() }) {
  const dailyTotals = dailyTotalsForActivity(entries, activity.id, days, now)
  const isWeekly = period === 'quarter'
  const totals = isWeekly ? weeklyTotals(dailyTotals, days) : dailyTotals
  const maxMs = Math.max(1, ...totals.map((t) => t.ms))
  const [selected, setSelected] = useState(() => {
    const maxEntry = totals.reduce((best, t) => (t.ms > best.ms ? t : best), totals[0])
    return maxEntry
  })

  function captionFor(t) {
    const label = isWeekly ? formatDateRange(t.date, addDays(t.date, 7)) : formatFullDate(t.date)
    return t.ms > 0 ? `${label} · ${formatDuration(t.ms)}` : `${label} · nessun dato`
  }

  return (
    <div className="trend-chart">
      <p className="trend-chart__caption">{selected ? captionFor(selected) : 'Nessun dato in questo periodo'}</p>
      <div className="trend-chart__bars-wrap">
        <GoalLine
          goals={goals}
          itemKey={activity.id}
          monthIso={toMonthISO(days[days.length - 1])}
          barGranularity={isWeekly ? 'week' : 'day'}
          maxValue={maxMs / 60000}
          formatValue={(v) => `${minutesToHours(v)}h`}
        />
        <div className="trend-chart__bars">
          {totals.map((t, i) => {
            const heightPct = Math.max(2, (t.ms / maxMs) * 100)
            const isSelected = selected && isSameDay(t.date, selected.date)
            return (
              <button
                key={toISODate(t.date)}
                type="button"
                className={`trend-chart__col ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelected(t)}
                aria-label={captionFor(t)}
              >
                <span className="trend-chart__bar-track">
                  <span
                    className="trend-chart__bar"
                    style={{ height: `${heightPct}%`, background: colorVar(activity.colorSlot) }}
                  />
                </span>
                <span className="trend-chart__label">
                  {shouldLabel(i, totals.length) ? (isWeekly ? formatShortDate(t.date) : axisLabel(t.date, days)) : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
