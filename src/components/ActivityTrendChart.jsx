import { useState } from 'react'
import { dayLabel, formatDuration, formatFullDate, isSameDay, toISODate } from '../utils/date'
import { dailyTotalsForActivity } from '../utils/entries'
import { colorVar } from '../utils/palette'

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

export default function ActivityTrendChart({ activity, days, entries, now = new Date() }) {
  const totals = dailyTotalsForActivity(entries, activity.id, days, now)
  const maxMs = Math.max(1, ...totals.map((t) => t.ms))
  const [selected, setSelected] = useState(() => {
    const maxEntry = totals.reduce((best, t) => (t.ms > best.ms ? t : best), totals[0])
    return maxEntry
  })

  return (
    <div className="trend-chart">
      <p className="trend-chart__caption">
        {selected && selected.ms > 0
          ? `${formatFullDate(selected.date)} · ${formatDuration(selected.ms)}`
          : selected
            ? `${formatFullDate(selected.date)} · nessun dato`
            : 'Nessun dato in questo periodo'}
      </p>
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
              aria-label={`${formatFullDate(t.date)}: ${formatDuration(t.ms)}`}
            >
              <span className="trend-chart__bar-track">
                <span
                  className="trend-chart__bar"
                  style={{ height: `${heightPct}%`, background: colorVar(activity.colorSlot) }}
                />
              </span>
              <span className="trend-chart__label">
                {shouldLabel(i, totals.length) ? axisLabel(t.date, days) : ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
