import { formatMonthShort, toMonthISO } from '../utils/date'
import { goalForMonth, goalPerBar } from '../utils/goals'

// Draws a dashed reference line at the goal's height on a bar chart. Tags it
// with the month when showing a past month's (historical) goal, so it
// doesn't silently look like today's.
export default function GoalLine({ goals, itemKey, monthIso, barGranularity, maxValue, formatValue }) {
  const goal = goalForMonth(goals, itemKey, monthIso)
  if (!goal || maxValue <= 0) return null
  const target = goalPerBar(goal, barGranularity)
  if (!target) return null
  const bottomPct = Math.min(100, Math.max(0, (target / maxValue) * 100))

  const unit = goal.period === 'day' ? 'g' : 'sett'
  // Tag with the month the goal record actually belongs to, not the month
  // being queried -- a goal set in July still applies (unchanged) when
  // browsing August, so it should say "Lug", not "Ago".
  const isCurrentMonth = goal.month === toMonthISO(new Date())
  const monthTag = isCurrentMonth ? '' : ` · ${formatMonthShort(goal.month)}`

  return (
    <div className="goal-line" style={{ bottom: `${bottomPct}%` }}>
      <span className="goal-line__tag">
        Obiettivo {formatValue(goal.value)}/{unit}
        {monthTag}
      </span>
    </div>
  )
}
