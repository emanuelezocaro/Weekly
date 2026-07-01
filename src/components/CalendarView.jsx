import { useState } from 'react'
import DayAgenda from './DayAgenda'
import WeekGrid from './WeekGrid'
import MonthGrid from './MonthGrid'

const MODES = [
  { id: 'day', label: 'Giorno' },
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
]

export default function CalendarView({ activities, logs, onToggle }) {
  const [mode, setMode] = useState('day')
  const [cursor, setCursor] = useState(() => new Date())

  function selectDay(date) {
    setCursor(date)
    setMode('day')
  }

  return (
    <div className="view">
      <div className="segmented">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`segmented__item ${mode === m.id ? 'is-active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'day' && (
        <DayAgenda
          cursor={cursor}
          onCursorChange={setCursor}
          activities={activities}
          logs={logs}
          onToggle={onToggle}
        />
      )}
      {mode === 'week' && (
        <WeekGrid
          cursor={cursor}
          onCursorChange={setCursor}
          onSelectDay={selectDay}
          activities={activities}
          logs={logs}
          onToggle={onToggle}
        />
      )}
      {mode === 'month' && (
        <MonthGrid
          cursor={cursor}
          onCursorChange={setCursor}
          onSelectDay={selectDay}
          activities={activities}
          logs={logs}
        />
      )}
    </div>
  )
}
