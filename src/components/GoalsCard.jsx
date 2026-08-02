import { useState } from 'react'
import { goalForMonth, hoursToMinutes, minutesToHours } from '../utils/goals'
import { colorVar } from '../utils/palette'

const GOAL_PERIODS = [
  { id: 'day', label: 'Giorno' },
  { id: 'week', label: 'Settimana' },
]

const GOAL_DIRECTIONS = [
  { id: 'higher_is_better', label: 'Più è meglio ↑' },
  { id: 'lower_is_better', label: 'Meno è meglio ↓' },
]

function PeriodSelect({ period, onChange }) {
  return (
    <select className="goal-row__select" value={period} onChange={(e) => onChange(e.target.value)}>
      {GOAL_PERIODS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  )
}

function DirectionSelect({ direction, onChange }) {
  return (
    <select
      className={`goal-row__select ${direction === 'lower_is_better' ? 'is-bad' : 'is-good'}`}
      value={direction}
      onChange={(e) => onChange(e.target.value)}
    >
      {GOAL_DIRECTIONS.map((d) => (
        <option key={d.id} value={d.id}>
          {d.label}
        </option>
      ))}
    </select>
  )
}

function DurationGoalRow({ itemKey, label, swatchColor, goal, onSave }) {
  const [period, setPeriod] = useState(goal?.period || 'week')
  const [direction, setDirection] = useState(goal?.direction || 'higher_is_better')
  const [hours, setHours] = useState(goal ? String(minutesToHours(goal.value)) : '')

  function commit(nextPeriod, nextDirection, nextHours) {
    const minutes = hoursToMinutes(nextHours)
    if (minutes === 0) return
    onSave(itemKey, nextPeriod, minutes, nextDirection)
  }

  return (
    <div className="goal-row">
      <div className="goal-row__name">
        <span className="goal-row__swatch" style={{ background: swatchColor }} />
        {label}
      </div>
      <div className="goal-row__controls">
        <PeriodSelect
          period={period}
          onChange={(p) => {
            setPeriod(p)
            commit(p, direction, hours)
          }}
        />
        <DirectionSelect
          direction={direction}
          onChange={(d) => {
            setDirection(d)
            commit(period, d, hours)
          }}
        />
        <input
          className="goal-row__value"
          type="number"
          min="0"
          step="0.5"
          placeholder="7.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={() => commit(period, direction, hours)}
        />
        <span className="goal-row__unit">h</span>
      </div>
    </div>
  )
}

function CountGoalRow({ itemKey, label, goal, onSave, defaultPeriod = 'day', withDirection, defaultDirection = 'higher_is_better' }) {
  const [period, setPeriod] = useState(goal?.period || defaultPeriod)
  const [direction, setDirection] = useState(goal?.direction || defaultDirection)
  const [value, setValue] = useState(goal ? String(goal.value) : '')

  function commit(nextPeriod, nextDirection, nextValue) {
    if (nextValue === '') return
    onSave(itemKey, nextPeriod, Number(nextValue) || 0, withDirection ? nextDirection : undefined)
  }

  return (
    <div className="goal-row">
      <div className="goal-row__name">{label}</div>
      <div className="goal-row__controls">
        <PeriodSelect
          period={period}
          onChange={(p) => {
            setPeriod(p)
            commit(p, direction, value)
          }}
        />
        {withDirection && (
          <DirectionSelect
            direction={direction}
            onChange={(d) => {
              setDirection(d)
              commit(period, d, value)
            }}
          />
        )}
        <input
          className="goal-row__value"
          type="number"
          min="0"
          placeholder="5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(period, direction, value)}
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
        "X/obiettivo" accanto a ogni riga. Per le attività scegli anche se superare l'obiettivo è
        un bene o un male: nel grafico la zona sopra e sotto la linea si colora di verde/rosso di
        conseguenza. Le modifiche valgono da questo mese in poi; i mesi passati mantengono
        l'obiettivo che avevano allora.
      </p>
      {activities.map((a) => (
        <DurationGoalRow
          key={a.id}
          itemKey={a.id}
          label={a.name}
          swatchColor={colorVar(a.colorSlot)}
          goal={goalForMonth(goals, a.id, monthIso)}
          onSave={(itemKey, period, value, direction) => onSetGoal(itemKey, monthIso, period, value, direction)}
        />
      ))}
      <CountGoalRow
        itemKey="cigarettes"
        label="Sigarette"
        withDirection
        defaultDirection="lower_is_better"
        goal={goalForMonth(goals, 'cigarettes', monthIso)}
        onSave={(itemKey, period, value, direction) => onSetGoal(itemKey, monthIso, period, value, direction)}
      />
      <CountGoalRow
        itemKey="outputs"
        label="Uscite"
        withDirection
        defaultDirection="higher_is_better"
        goal={goalForMonth(goals, 'outputs', monthIso)}
        onSave={(itemKey, period, value, direction) => onSetGoal(itemKey, monthIso, period, value, direction)}
      />
      {FOOD_GOALS.map((f) => (
        <CountGoalRow
          key={f.itemKey}
          itemKey={f.itemKey}
          label={f.label}
          defaultPeriod="week"
          withDirection
          defaultDirection="higher_is_better"
          goal={goalForMonth(goals, f.itemKey, monthIso)}
          onSave={(itemKey, period, value, direction) => onSetGoal(itemKey, monthIso, period, value, direction)}
        />
      ))}
    </section>
  )
}
