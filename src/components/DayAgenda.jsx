import { useEffect, useState } from 'react'
import {
  addDays,
  formatDuration,
  formatFullDate,
  formatTime,
  isFuture,
  isSameDay,
  nowISODateTime,
  parseISODateTime,
  toISODate,
} from '../utils/date'
import { entriesForDay, getOpenEntry } from '../utils/entries'
import { colorVar } from '../utils/palette'

function activityFor(activities, id) {
  return activities.find((a) => a.id === id)
}

function ActivityGrid({ activities, onPick }) {
  return (
    <div className="activity-grid">
      {activities.map((a) => (
        <button
          key={a.id}
          type="button"
          className="activity-grid__item"
          style={{ '--chip-color': colorVar(a.colorSlot) }}
          onClick={() => onPick(a.id)}
        >
          <span className="activity-grid__emoji" aria-hidden="true">
            {a.emoji}
          </span>
          <span className="activity-grid__name">{a.name}</span>
        </button>
      ))}
    </div>
  )
}

function EntryEditor({ entry, activities, dayDate, onSave, onDelete, onCancel, onCloseNow }) {
  const isOpen = entry.end === null
  const startDate = parseISODateTime(entry.start)
  const endDate = entry.end ? parseISODateTime(entry.end) : null
  const crossesMidnight =
    !isSameDay(startDate, dayDate) || (endDate && !isSameDay(endDate, dayDate))

  const [activityId, setActivityId] = useState(entry.activityId)
  const [startTime, setStartTime] = useState(formatTime(startDate))
  const [endTime, setEndTime] = useState(endDate ? formatTime(endDate) : '')

  if (crossesMidnight) {
    return (
      <div className="entry-editor">
        <p className="entry-editor__hint">
          Questo blocco attraversa la mezzanotte: modificalo dal giorno in cui è iniziato (
          {formatFullDate(startDate)}).
        </p>
        <div className="entry-editor__actions">
          <button type="button" className="backup-card__secondary" onClick={onCancel}>
            Chiudi
          </button>
        </div>
      </div>
    )
  }

  function handleSave() {
    const dateIso = toISODate(dayDate)
    const patch = { activityId, start: `${dateIso}T${startTime}:00` }
    if (!isOpen) patch.end = `${dateIso}T${endTime}:00`
    onSave(patch)
  }

  return (
    <div className="entry-editor">
      <div className="activity-grid activity-grid--compact">
        {activities.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`activity-grid__item ${activityId === a.id ? 'is-selected' : ''}`}
            style={{ '--chip-color': colorVar(a.colorSlot) }}
            onClick={() => setActivityId(a.id)}
          >
            <span className="activity-grid__emoji" aria-hidden="true">
              {a.emoji}
            </span>
            <span className="activity-grid__name">{a.name}</span>
          </button>
        ))}
      </div>

      <div className="entry-editor__times">
        <label>
          <span>Inizio</span>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        {isOpen ? (
          <button type="button" className="backup-card__secondary" onClick={onCloseNow}>
            Termina ora
          </button>
        ) : (
          <label>
            <span>Fine</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        )}
      </div>

      <div className="entry-editor__actions">
        <button type="button" onClick={handleSave}>
          Salva
        </button>
        <button type="button" className="backup-card__secondary" onClick={onCancel}>
          Annulla
        </button>
        <button type="button" className="icon-btn icon-btn--danger" onClick={onDelete} aria-label="Elimina">
          🗑
        </button>
      </div>
    </div>
  )
}

export default function DayAgenda({
  cursor,
  onCursorChange,
  activities,
  entries,
  onStartActivity,
  onEditEntry,
  onRemoveEntry,
  onAddManualEntry,
}) {
  const isToday = isSameDay(cursor, new Date())
  const nextDisabled = isFuture(addDays(cursor, 1))

  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => forceTick((n) => n + 1), 60000)
    return () => clearInterval(id)
  }, [isToday])

  const [pickerOpen, setPickerOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [addingManual, setAddingManual] = useState(false)

  const openEntry = getOpenEntry(entries)
  const items = entriesForDay(entries, cursor, new Date())

  function handleStart(activityId) {
    onStartActivity(activityId)
    setPickerOpen(false)
  }

  function handleSaveEdit(id, patch) {
    onEditEntry(id, patch)
    setExpandedId(null)
  }

  function handleDelete(id) {
    onRemoveEntry(id)
    setExpandedId(null)
  }

  return (
    <div className="panel">
      <div className="day-switcher">
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => onCursorChange(addDays(cursor, -1))}
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <button type="button" className="day-switcher__label" onClick={() => onCursorChange(new Date())}>
          <strong>{isToday ? 'Oggi' : formatFullDate(cursor)}</strong>
          {isToday && <span className="day-switcher__sub">{formatFullDate(cursor)}</span>}
        </button>
        <button
          type="button"
          className="day-switcher__arrow"
          onClick={() => onCursorChange(addDays(cursor, 1))}
          disabled={nextDisabled}
          aria-label="Giorno successivo"
        >
          ›
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
      ) : (
        <>
          {isToday && (
            <div className="now-card">
              {openEntry ? (
                (() => {
                  const activity = activityFor(activities, openEntry.activityId)
                  const elapsed = Date.now() - parseISODateTime(openEntry.start).getTime()
                  return (
                    <>
                      <div className="now-card__status">
                        <span
                          className="now-card__dot"
                          style={{ background: activity ? colorVar(activity.colorSlot) : undefined }}
                        />
                        <span className="now-card__text">
                          Stai facendo <strong>{activity ? `${activity.emoji} ${activity.name}` : '—'}</strong>
                          {' · '}
                          da {formatTime(parseISODateTime(openEntry.start))} ({formatDuration(elapsed)})
                        </span>
                      </div>
                      <button type="button" onClick={() => setPickerOpen((v) => !v)}>
                        Cambia attività
                      </button>
                    </>
                  )
                })()
              ) : (
                <>
                  <p className="now-card__prompt">Cosa stai facendo ora?</p>
                  <button type="button" onClick={() => setPickerOpen((v) => !v)}>
                    Scegli attività
                  </button>
                </>
              )}
              {pickerOpen && <ActivityGrid activities={activities} onPick={handleStart} />}
            </div>
          )}

          {items.length === 0 && !isToday && (
            <p className="empty-state">Nessun blocco registrato in questo giorno.</p>
          )}

          <ul className="timeline">
            {items.map(({ entry, clippedStart, clippedEnd, isOpen }) => {
              const activity = activityFor(activities, entry.activityId)
              const expanded = expandedId === entry.id
              return (
                <li key={entry.id} className="timeline__item">
                  <button
                    type="button"
                    className="timeline__row"
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                  >
                    <span
                      className="timeline__swatch"
                      style={{ background: activity ? colorVar(activity.colorSlot) : 'var(--gap)' }}
                    />
                    <span className="timeline__info">
                      <span className="timeline__name">
                        {activity ? `${activity.emoji} ${activity.name}` : 'Attività eliminata'}
                      </span>
                      <span className="timeline__time">
                        {formatTime(clippedStart)} – {isOpen ? 'ora' : formatTime(clippedEnd)}
                      </span>
                    </span>
                    <span className="timeline__duration">
                      {formatDuration(clippedEnd - clippedStart)}
                    </span>
                  </button>
                  {expanded && (
                    <EntryEditor
                      entry={entry}
                      activities={activities}
                      dayDate={cursor}
                      onSave={(patch) => handleSaveEdit(entry.id, patch)}
                      onDelete={() => handleDelete(entry.id)}
                      onCancel={() => setExpandedId(null)}
                      onCloseNow={() => handleSaveEdit(entry.id, { end: nowISODateTime() })}
                    />
                  )}
                </li>
              )
            })}
          </ul>

          {!isToday && (
            <div className="add-block">
              {addingManual ? (
                <ManualAddForm
                  activities={activities}
                  dayDate={cursor}
                  onAdd={(activityId, start, end) => {
                    onAddManualEntry(activityId, start, end)
                    setAddingManual(false)
                  }}
                  onCancel={() => setAddingManual(false)}
                />
              ) : (
                <button type="button" className="backup-card__secondary" onClick={() => setAddingManual(true)}>
                  + Aggiungi blocco
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ManualAddForm({ activities, dayDate, onAdd, onCancel }) {
  const [activityId, setActivityId] = useState(activities[0]?.id)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  function handleAdd() {
    const dateIso = toISODate(dayDate)
    onAdd(activityId, `${dateIso}T${startTime}:00`, `${dateIso}T${endTime}:00`)
  }

  return (
    <div className="entry-editor">
      <div className="activity-grid activity-grid--compact">
        {activities.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`activity-grid__item ${activityId === a.id ? 'is-selected' : ''}`}
            style={{ '--chip-color': colorVar(a.colorSlot) }}
            onClick={() => setActivityId(a.id)}
          >
            <span className="activity-grid__emoji" aria-hidden="true">
              {a.emoji}
            </span>
            <span className="activity-grid__name">{a.name}</span>
          </button>
        ))}
      </div>
      <div className="entry-editor__times">
        <label>
          <span>Inizio</span>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label>
          <span>Fine</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
      </div>
      <div className="entry-editor__actions">
        <button type="button" onClick={handleAdd}>
          Aggiungi
        </button>
        <button type="button" className="backup-card__secondary" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </div>
  )
}
