import { useState } from 'react'
import { goalForMonth } from '../utils/goals'
import { colorVar } from '../utils/palette'

const GOAL_PERIODS = [
  { id: 'day', label: 'Giorno' },
  { id: 'week', label: 'Settimana' },
]

function PeriodToggle({ period, onChange }) {
  return (
    <div className="goal-seg">
      {GOAL_PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={period === p.id ? 'is-active' : ''}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function DurationGoalRow({ itemKey, label, swatchColor, goal, onSave }) {
  const [period, setPeriod] = useState(goal?.period || 'week')
  const [hours, setHours] = useState(goal ? String(Math.floor(goal.value / 60)) : '')
  const [minutes, setMinutes] = useState(goal ? String(goal.value % 60) : '')

  function commit(nextPeriod, nextHours, nextMinutes) {
    const h = Number(nextHours) || 0
    const m = Number(nextMinutes) || 0
    if (h === 0 && m === 0) return
    onSave(itemKey, nextPeriod, h * 60 + m)
  }

  return (
    <div className="goal-row">
      <div className="goal-row__name">
        <span className="goal-row__swatch" style={{ background: swatchColor }} />
        {label}
      </div>
      <div className="goal-row__controls">
        <PeriodToggle
          period={period}
          onChange={(p) => {
            setPeriod(p)
            commit(p, hours, minutes)
          }}
        />
        <input
          className="goal-row__value goal-row__value--num"
          type="number"
          min="0"
          placeholder="h"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={() => commit(period, hours, minutes)}
        />
        <span className="goal-row__unit">h</span>
        <input
          className="goal-row__value goal-row__value--num"
          type="number"
          min="0"
          max="59"
          placeholder="m"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onBlur={() => commit(period, hours, minutes)}
        />
        <span className="goal-row__unit">m</span>
      </div>
    </div>
  )
}

function CountGoalRow({ itemKey, label, goal, onSave }) {
  const [period, setPeriod] = useState(goal?.period || 'day')
  const [value, setValue] = useState(goal ? String(goal.value) : '')

  function commit(nextPeriod, nextValue) {
    if (nextValue === '') return
    onSave(itemKey, nextPeriod, Number(nextValue) || 0)
  }

  return (
    <div className="goal-row">
      <div className="goal-row__name">{label}</div>
      <div className="goal-row__controls">
        <PeriodToggle
          period={period}
          onChange={(p) => {
            setPeriod(p)
            commit(p, value)
          }}
        />
        <input
          className="goal-row__value"
          type="number"
          min="0"
          placeholder="es. 5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(period, value)}
        />
      </div>
    </div>
  )
}

export default function GoalsCard({ activities, goals, monthIso, onSetGoal }) {
  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Obiettivi</h2>
      <p className="settings-card__hint">
        Imposta un valore di riferimento per attività, sigarette e uscite: lo vedrai come linea nei
        grafici del Report. Le modifiche valgono da questo mese in poi; i mesi passati mantengono
        l'obiettivo che avevano allora.
      </p>
      {activities.map((a) => (
        <DurationGoalRow
          key={a.id}
          itemKey={a.id}
          label={a.name}
          swatchColor={colorVar(a.colorSlot)}
          goal={goalForMonth(goals, a.id, monthIso)}
          onSave={(itemKey, period, value) => onSetGoal(itemKey, monthIso, period, value)}
        />
      ))}
      <CountGoalRow
        itemKey="cigarettes"
        label="Sigarette"
        goal={goalForMonth(goals, 'cigarettes', monthIso)}
        onSave={(itemKey, period, value) => onSetGoal(itemKey, monthIso, period, value)}
      />
      <CountGoalRow
        itemKey="outputs"
        label="Uscite"
        goal={goalForMonth(goals, 'outputs', monthIso)}
        onSave={(itemKey, period, value) => onSetGoal(itemKey, monthIso, period, value)}
      />
    </section>
  )
}
