import { useState } from 'react'
import { goalForMonth, hoursToMinutes, minutesToHours } from '../utils/goals'
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
  const [hours, setHours] = useState(goal ? String(minutesToHours(goal.value)) : '')

  function commit(nextPeriod, nextHours) {
    const minutes = hoursToMinutes(nextHours)
    if (minutes === 0) return
    onSave(itemKey, nextPeriod, minutes)
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
            commit(p, hours)
          }}
        />
        <input
          className="goal-row__value goal-row__value--num"
          type="number"
          min="0"
          step="0.5"
          placeholder="es. 7.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={() => commit(period, hours)}
        />
        <span className="goal-row__unit">h</span>
      </div>
    </div>
  )
}

function CountGoalRow({ itemKey, label, goal, onSave, defaultPeriod = 'day' }) {
  const [period, setPeriod] = useState(goal?.period || defaultPeriod)
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

const FOOD_GOALS = [
  { itemKey: 'food_colazione', label: 'Colazione buona' },
  { itemKey: 'food_pranzo', label: 'Pranzo buono' },
  { itemKey: 'food_cena', label: 'Cena buona' },
  { itemKey: 'food_alcol', label: 'Alcol buono' },
  { itemKey: 'food_dolci', label: 'Dolci buono' },
  { itemKey: 'food_extra', label: 'Extra evitato' },
]

export default function GoalsCard({ activities, goals, monthIso, onSetGoal }) {
  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Obiettivi</h2>
      <p className="settings-card__hint">
        Imposta un valore di riferimento per attività, sigarette, uscite e alimentazione: per le
        prime tre lo vedrai come linea nei grafici del Report, per l'alimentazione come conteggio
        "X/obiettivo" accanto a ogni riga. Le modifiche valgono da questo mese in poi; i mesi
        passati mantengono l'obiettivo che avevano allora.
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
      {FOOD_GOALS.map((f) => (
        <CountGoalRow
          key={f.itemKey}
          itemKey={f.itemKey}
          label={f.label}
          defaultPeriod="week"
          goal={goalForMonth(goals, f.itemKey, monthIso)}
          onSave={(itemKey, period, value) => onSetGoal(itemKey, monthIso, period, value)}
        />
      ))}
    </section>
  )
}
