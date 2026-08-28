import { formatMonthShort, toMonthISO } from '../utils/date'
import { goalDirection, goalForMonth, goalPerBar } from '../utils/goals'

// Draws a dashed reference line at the goal's height on a bar chart, plus two
// background bands showing which side is good and which is bad -- flipped
// depending on the goal's direction (more hours of "Lavoro" is good, more
// hours of "Social" is bad). Tags the line with the month when showing a
// past month's (historical) goal, so it doesn't silently look like today's.
export default function GoalLine({ goals, itemKey, monthIso, barGranularity, maxValue, formatValue, direction, tagLabel }) {
  const goal = goalForMonth(goals, itemKey, monthIso)
  if (!goal || goal.direction === 'none' || maxValue <= 0) return null
  const target = goalPerBar(goal, barGranularity)
  if (!target) return null
  const bottomPct = Math.min(100, Math.max(0, (target / maxValue) * 100))
  const higherIsBetter = goalDirection(goal, direction ?? 'higher_is_better') !== 'lower_is_better'

  // The tag normally names the goal in its OWN period ("5/sett"), which only
  // reads clearly when the bars share roughly that same unit (a day's raw
  // value, or a week's). When a chart's bars are a different unit entirely
  // (e.g. a raw count per month on a 0-31 scale, while the goal is set per
  // week), showing the goal in ITS unit next to a scale in a completely
  // different one is confusing -- the caller can pass tagLabel to show the
  // goal already converted to the chart's own unit instead.
  const unit = goal.period === 'day' ? 'g' : 'sett'
  // Tag with the month the goal record actually belongs to, not the month
  // being queried -- a goal set in July still applies (unchanged) when
  // browsing August, so it should say "Lug", not "Ago".
  const isCurrentMonth = goal.month === toMonthISO(new Date())
  const monthTag = isCurrentMonth ? '' : ` · ${formatMonthShort(goal.month)}`

  const aboveLine = { bottom: `${bottomPct}%`, top: 0 }
  const belowLine = { top: `${100 - bottomPct}%`, bottom: 0 }

  return (
    <>
      <div className="goal-zone goal-zone--good" style={higherIsBetter ? aboveLine : belowLine} />
      <div className="goal-zone goal-zone--bad" style={higherIsBetter ? belowLine : aboveLine} />
      <div className="goal-line" style={{ bottom: `${bottomPct}%` }}>
        <span className="goal-line__tag">
          {tagLabel ?? `Obiettivo ${formatValue(goal.value)}/${unit}`}
          {monthTag}
        </span>
      </div>
    </>
  )
}
