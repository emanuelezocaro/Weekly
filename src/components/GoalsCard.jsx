import { useState } from 'react'
import { goalForMonth, hoursToMinutes, minutesToHours } from '../utils/goals'
import { colorVar } from '../utils/palette'

// Tapping the arrow cycles through the three directions -- rarely changed,
// so it doesn't deserve a full dropdown of its own.
const DIRECTIONS = [
  { id: 'higher_is_better', glyph: '↑', label: 'Più è meglio' },
  { id: 'lower_is_better', glyph: '↓', label: 'Meno è meglio' },
  { id: 'none', glyph: '–', label: 'Solo traccia' },
]

const FOOD_GOALS = [
  { itemKey: 'food_colazione', label: 'Colazione buona' },
  { itemKey: 'food_pranzo', label: 'Pranzo buono' },
  { itemKey: 'food_cena', label: 'Cena buona' },
  { itemKey: 'food_alcol', label: 'Alcol buono' },
  { itemKey: 'food_dolci', label: 'Dolci buono' },
  { itemKey: 'food_extra', label: 'Extra evitato' },
]

// Duration goals are stored in minutes but edited in hours.
function GoalRow({ label, color, goal, isDuration = false, defaultPeriod, onSave }) {
  const [period, setPeriod] = useState(goal?.period || defaultPeriod)
  const [direction, setDirection] = useState(goal?.direction || 'higher_is_better')
  const [value, setValue] = useState(goal ? String(isDuration ? minutesToHours(goal.value) : goal.value) : '')

  function commit(nextPeriod, nextDirection, nextValue) {
    if (nextValue === '') return
    const stored = isDuration ? hoursToMinutes(nextValue) : Number(nextValue) || 0
    if (isDuration && stored === 0) return
    onSave(nextPeriod, stored, nextDirection)
  }

  const dirIndex = Math.max(0, DIRECTIONS.findIndex((d) => d.id === direction))
  const dir = DIRECTIONS[dirIndex]

  return (
    <div className="list-row">
      <span className="list-row__label">
        {color && <span className="list-row__dot" style={{ background: color }} />}
        <span className="list-row__name">{label}</span>
      </span>
      <div className="goal-control">
        <input
          className="goal-control__value"
          type="number"
          min="0"
          step={isDuration ? '0.5' : '1'}
          inputMode="decimal"
          placeholder="–"
          aria-label={`Obiettivo ${label}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(period, direction, value)}
        />
        {isDuration && <span className="goal-control__unit">h</span>}
        <select
          className="goal-control__period"
          aria-label="Periodo"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value)
            commit(e.target.value, direction, value)
          }}
        >
          <option value="day">/ giorno</option>
          <option value="week">/ sett.</option>
        </select>
        <button
          type="button"
          className={`goal-control__dir is-${dir.id}`}
          aria-label={`Direzione: ${dir.label}`}
          title={dir.label}
          onClick={() => {
            const next = DIRECTIONS[(dirIndex + 1) % DIRECTIONS.length].id
            setDirection(next)
            commit(period, next, value)
          }}
        >
          {dir.glyph}
        </button>
      </div>
    </div>
  )
}

export default function GoalsCard({ activities, goals, monthIso, onSetGoal }) {
  const save = (itemKey) => (period, value, direction) => onSetGoal(itemKey, monthIso, period, value, direction)
  return (
    <>
      <p className="list-section__hint">
        Valgono da questo mese in poi. ↑ più è meglio · ↓ meno è meglio · – solo traccia.
      </p>

      {activities.length > 0 && (
        <section className="list-section">
          <h2 className="list-section__title">Attività</h2>
          <div className="list-card">
            {activities.map((a) => (
              <GoalRow
                key={a.id}
                label={a.mode === 'rating' ? `${a.name} buono` : a.name}
                color={colorVar(a.colorSlot)}
                goal={goalForMonth(goals, a.id, monthIso)}
                isDuration={a.mode === 'time'}
                defaultPeriod={a.mode === 'checklist' ? 'day' : 'week'}
                onSave={save(a.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="list-section">
        <h2 className="list-section__title">Alimentazione</h2>
        <div className="list-card">
          {FOOD_GOALS.map((f) => (
            <GoalRow
              key={f.itemKey}
              label={f.label}
              goal={goalForMonth(goals, f.itemKey, monthIso)}
              defaultPeriod="week"
              onSave={save(f.itemKey)}
            />
          ))}
        </div>
      </section>
    </>
  )
}
