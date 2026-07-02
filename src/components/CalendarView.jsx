import { useState } from 'react'
import DayAgenda from './DayAgenda'
import WeekGrid from './WeekGrid'
import MonthGrid from './MonthGrid'

const MODES = [
  { id: 'day', label: 'Giorno' },
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
]

export default function CalendarView({
  activities,
  entries,
  onStartActivity,
  onEditEntry,
  onRemoveEntry,
  onAddManualEntry,
}) {
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
          entries={entries}
          onStartActivity={onStartActivity}
          onEditEntry={onEditEntry}
          onRemoveEntry={onRemoveEntry}
          onAddManualEntry={onAddManualEntry}
        />
      )}
      {mode === 'week' && (
        <WeekGrid
          cursor={cursor}
          onCursorChange={setCursor}
          onSelectDay={selectDay}
          activities={activities}
          entries={entries}
        />
      )}
      {mode === 'month' && (
        <MonthGrid
          cursor={cursor}
          onCursorChange={setCursor}
          onSelectDay={selectDay}
          activities={activities}
          entries={entries}
        />
      )}
    </div>
  )
}
