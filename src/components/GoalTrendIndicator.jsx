import { isGoalMet } from '../utils/goals'

// On track: just a confirmation triangle. Off track: not a vague arrow, but
// the actual gap from the goal -- how much more or less than target,
// signed, so the number itself says what happened instead of just "bad".
export default function GoalTrendIndicator({
  goal,
  actual,
  target,
  fallbackDirection = 'higher_is_better',
  formatDiff = (n) => String(Math.round(n)),
}) {
  if (!goal || goal.direction === 'none' || target === null || target === undefined) return null
  const met = isGoalMet(goal, actual, target, fallbackDirection)
  if (met) return <span className="goal-trend is-good">▲</span>
  const diff = actual - target
  const sign = diff > 0 ? '+' : '−'
  return (
    <span className="goal-trend is-bad">
      {sign}
      {formatDiff(Math.abs(diff))}
    </span>
  )
}
