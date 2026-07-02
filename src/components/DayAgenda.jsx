import { useEffect, useState } from 'react'
import {
  addDays,
  formatDuration,
  formatFullDate,
  formatTime,
  formatTimeRounded,
  isFuture,
  isSameDay,
  nowISODateTime,
  parseISODateTime,
  startOfDay,
  toISODate,
  toISODateTime,
} from '../utils/date'
import { DAY_MS, entriesForDay, findGapsForDay, getOpenEntry } from '../utils/entries'
import { colorVar } from '../utils/palette'

const QUARTER_HOUR_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0')
  const m = String((i % 4) * 15).padStart(2, '0')
  return `${h}:${m}`
})

function QuarterHourSelect({ value, onChange }) {
  return (
    <select className="quarter-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {QUARTER_HOUR_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  )
}

function ActivitySelect({ activities, value, onChange }) {
  return (
    <select className="quarter-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {activities.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  )
}

function activityFor(activities, id) {
  return activities.find((a) => a.id === id)
}

function ActivityPicker({ activities, onPick }) {
  return (
    <select
      className="quarter-select"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value)
      }}
    >
      <option value="" disabled>
        Scegli attività…
      </option>
      {activities.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  )
}

function EntryEditor({ entry, activities, dayDate, onSave, onDelete, onCancel, onCloseNow }) {
  const isOpen = entry.end === null
  const startDate = parseISODateTime(entry.start)
  const endDate = entry.end ? parseISODateTime(entry.end) : null
  const crossesMidnight =
    !isSameDay(startDate, dayDate) || (endDate && !isSameDay(endDate, dayDate))

  const [activityId, setActivityId] = useState(entry.activityId)
  const [startTime, setStartTime] = useState(formatTimeRounded(startDate))
  const [endTime, setEndTime] = useState(endDate ? formatTimeRounded(endDate) : '')

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
      <label className="entry-editor__field">
        <span>Attività</span>
        <ActivitySelect activities={activities} value={activityId} onChange={setActivityId} />
      </label>

      <div className="entry-editor__times">
        <label>
          <span>Inizio</span>
          <QuarterHourSelect value={startTime} onChange={setStartTime} />
        </label>
        {isOpen ? (
          <button type="button" className="backup-card__secondary" onClick={onCloseNow}>
            Termina ora
          </button>
        ) : (
          <label>
            <span>Fine</span>
            <QuarterHourSelect value={endTime} onChange={setEndTime} />
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
        <button type="button" className="text-btn text-btn--danger" onClick={onDelete}>
          Elimina
        </button>
      </div>
    </div>
  )
}

function GapRow({ gap, activities, expanded, onToggle, onPick }) {
  return (
    <li className="timeline__item">
      <button type="button" className="timeline__gap" onClick={onToggle}>
        <span className="timeline__gap-text">
          Buco · {formatTime(gap.start)}–{formatTime(gap.end)} · {formatDuration(gap.end - gap.start)}
        </span>
        <span className="timeline__gap-action">{expanded ? 'Chiudi' : 'Cosa hai fatto?'}</span>
      </button>
      {expanded && <ActivityPicker activities={activities} onPick={onPick} />}
    </li>
  )
}

export default function DayAgenda({
  activities,
  entries,
  onStartActivity,
  onEditEntry,
  onRemoveEntry,
  onAddManualEntry,
}) {
  const [cursor, onCursorChange] = useState(() => new Date())
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
  const [expandedGap, setExpandedGap] = useState(null)
  const [addingManual, setAddingManual] = useState(false)

  const now = new Date()
  const openEntry = getOpenEntry(entries)
  const items = entriesForDay(entries, cursor, now)
  const gaps = findGapsForDay(entries, cursor, now)
  const dayElapsedMs = isToday ? Math.max(1, now - startOfDay(cursor)) : DAY_MS

  const rows = [
    ...items.map((it) => ({ type: 'entry', sortKey: it.clippedStart, ...it })),
    ...gaps.map((g) => ({ type: 'gap', sortKey: g.start, gap: g })),
  ].sort((a, b) => a.sortKey - b.sortKey)

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

  function handleFillGap(gap, activityId) {
    onAddManualEntry(activityId, toISODateTime(gap.start), toISODateTime(gap.end))
    setExpandedGap(null)
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
                          Stai facendo <strong>{activity ? activity.name : '—'}</strong>
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
              {pickerOpen && <ActivityPicker activities={activities} onPick={handleStart} />}
            </div>
          )}

          {rows.length === 0 && !isToday && (
            <p className="empty-state">Nessun blocco registrato in questo giorno.</p>
          )}

          <ul className="timeline">
            {rows.map((row) => {
              if (row.type === 'gap') {
                const key = toISODateTime(row.gap.start)
                return (
                  <GapRow
                    key={key}
                    gap={row.gap}
                    activities={activities}
                    expanded={expandedGap === key}
                    onToggle={() => setExpandedGap(expandedGap === key ? null : key)}
                    onPick={(activityId) => handleFillGap(row.gap, activityId)}
                  />
                )
              }

              const { entry, clippedStart, clippedEnd, isOpen } = row
              const activity = activityFor(activities, entry.activityId)
              const expanded = expandedId === entry.id
              const pct = Math.round(((clippedEnd - clippedStart) / dayElapsedMs) * 100)
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
                        {activity ? activity.name : 'Attività eliminata'}
                      </span>
                      <span className="timeline__pill-row">
                        <span
                          className="timeline__pill"
                          style={{ '--pill-color': activity ? colorVar(activity.colorSlot) : 'var(--gap)' }}
                        >
                          {formatTime(clippedStart)} → {isOpen ? 'ora' : formatTime(clippedEnd)}
                        </span>
                        <span className="timeline__duration">
                          {formatDuration(clippedEnd - clippedStart)}
                        </span>
                        <span className="timeline__pct">{pct}%</span>
                      </span>
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

function ManualAddForm({ activities, dayDate, onAdd, onCancel, initialStart = '09:00', initialEnd = '10:00' }) {
  const [activityId, setActivityId] = useState(activities[0]?.id)
  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(initialEnd)

  function handleAdd() {
    const dateIso = toISODate(dayDate)
    onAdd(activityId, `${dateIso}T${startTime}:00`, `${dateIso}T${endTime}:00`)
  }

  return (
    <div className="entry-editor">
      <label className="entry-editor__field">
        <span>Attività</span>
        <ActivitySelect activities={activities} value={activityId} onChange={setActivityId} />
      </label>
      <div className="entry-editor__times">
        <label>
          <span>Inizio</span>
          <QuarterHourSelect value={startTime} onChange={setStartTime} />
        </label>
        <label>
          <span>Fine</span>
          <QuarterHourSelect value={endTime} onChange={setEndTime} />
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
