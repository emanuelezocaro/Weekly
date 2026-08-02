import { isGoalMet } from '../utils/goals'

// A single glance at whether the period shown is going well or badly
// against its goal -- nothing else, so it fits in a card header.
export default function GoalTrendIndicator({ goal, actual, target, fallbackDirection = 'higher_is_better' }) {
  if (!goal || target === null || target === undefined) return null
  const met = isGoalMet(goal, actual, target, fallbackDirection)
  return <span className={`goal-trend ${met ? 'is-good' : 'is-bad'}`}>{met ? '▲' : '▼'}</span>
}
