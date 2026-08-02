import { useEffect, useState } from 'react'
import {
  addDays,
  APP_START_DATE,
  endOfDay,
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
import { DAY_MS, entriesForDay, findGapsForDay } from '../utils/entries'
import { colorVar } from '../utils/palette'
import CigarettesCard from './CigarettesCard'
import FoodCard from './FoodCard'

const DAY_TABS = [
  { id: 'calendar', label: 'Calendario' },
  { id: 'outputs', label: 'Uscite' },
  { id: 'cigarettes', label: 'Sigarette' },
  { id: 'food', label: 'Cibo' },
]

const FOOD_FIELD_KEYS = ['colazione', 'pranzo', 'cena', 'alcol', 'dolci', 'extra']

const HALF_HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = String((i % 2) * 30).padStart(2, '0')
  return `${h}:${m}`
})
// End-time pickers also offer midnight as the very last option, so closing
// out the day doesn't mean scrolling all the way back up to "00:00".
const END_TIME_OPTIONS = [...HALF_HOUR_OPTIONS, '24:00']

function HalfHourSelect({ value, onChange, options = HALF_HOUR_OPTIONS }) {
  return (
    <select className="quarter-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  )
}

function sortByName(activities) {
  return [...activities].sort((a, b) => a.name.localeCompare(b.name, 'it'))
}

function ActivitySelect({ activities, value, onChange }) {
  return (
    <select className="quarter-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {sortByName(activities).map((a) => (
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

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// A day that's fully accounted for (no gaps) is locked 48h after it ends,
// so old history can't be edited by accident.
const LOCK_AFTER_MS = 48 * 60 * 60 * 1000

// Default the manual "add block" form to continue right where the last
// recorded block for that day left off, instead of always suggesting 09:00.
const DAY_END_CAP_MS = 23 * 60 * 60 * 1000 + 45 * 60 * 1000
function defaultAddTimes(items, dayDate) {
  const dayStart = startOfDay(dayDate)
  const lastEndMs =
    items.length > 0 ? Math.max(...items.map((it) => it.clippedEnd.getTime())) : dayStart.getTime()
  const cappedStartMs = Math.min(lastEndMs, dayStart.getTime() + DAY_END_CAP_MS)
  const endMs = Math.min(cappedStartMs + 60 * 60 * 1000, dayStart.getTime() + DAY_END_CAP_MS)
  return { start: formatTimeRounded(new Date(cappedStartMs)), end: formatTimeRounded(new Date(endMs)) }
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
      {sortByName(activities).map((a) => (
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
  const isStartDay = isSameDay(startDate, dayDate)
  const isEndDay = endDate ? isSameDay(endDate, dayDate) : false

  const [activityId, setActivityId] = useState(entry.activityId)
  const [startTime, setStartTime] = useState(formatTimeRounded(startDate))
  const [endTime, setEndTime] = useState(endDate ? formatTimeRounded(endDate) : '')

  if (!isStartDay && !isEndDay) {
    return (
      <div className="entry-editor">
        <p className="entry-editor__hint">
          Questo blocco è iniziato il giorno prima: modificalo da {formatFullDate(startDate)}.
        </p>
        <div className="entry-editor__actions">
          <button type="button" className="backup-card__secondary" onClick={onCancel}>
            Chiudi
          </button>
        </div>
      </div>
    )
  }

  // Whichever field belongs to the viewed day is anchored to it; the other
  // field's calendar day is inferred from whether the times wrap around
  // midnight (e.g. viewed from the start day, 23:00 -> 07:00 means the end
  // is the next day; viewed from the end day, 07:00 <- 23:00 means the
  // start is the day before).
  const endsNextDay =
    !isOpen && isStartDay && (endTime === '24:00' || timeToMinutes(endTime) <= timeToMinutes(startTime))
  const startsPrevDay = !isStartDay && isEndDay && timeToMinutes(startTime) >= timeToMinutes(endTime)

  function handleSave() {
    const dateIso = toISODate(dayDate)
    const startDateIso = startsPrevDay ? toISODate(addDays(dayDate, -1)) : dateIso
    const patch = { activityId, start: `${startDateIso}T${startTime}:00` }
    if (!isOpen) {
      const endDateIso = endsNextDay ? toISODate(addDays(dayDate, 1)) : dateIso
      const normalizedEndTime = endTime === '24:00' ? '00:00' : endTime
      patch.end = `${endDateIso}T${normalizedEndTime}:00`
    }
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
          <span>Inizio{startsPrevDay ? ' (giorno prima)' : ''}</span>
          <HalfHourSelect value={startTime} onChange={setStartTime} />
        </label>
        {isOpen ? (
          <button type="button" className="backup-card__secondary" onClick={onCloseNow}>
            Termina ora
          </button>
        ) : (
          <label>
            <span>Fine{endsNextDay ? ' (giorno dopo)' : ''}</span>
            <HalfHourSelect value={endTime} onChange={setEndTime} options={END_TIME_OPTIONS} />
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

function OutputsCard({ dayOutputs, onAdd, onRemove, isToday, isSkipped, onConfirmNoOutputs, onUndoNoOutputs }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Uscite</h2>
      <form className="outputs-add-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="Es. Fattura inviata a..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <button type="submit">Aggiungi</button>
      </form>
      {isToday && dayOutputs.length === 0 && (
        <p className="outputs-skip">
          {isSkipped ? (
            <>
              Segnato: nessuna uscita oggi.{' '}
              <button type="button" className="text-btn" onClick={onUndoNoOutputs}>
                Annulla
              </button>
            </>
          ) : (
            <button type="button" className="backup-card__secondary" onClick={onConfirmNoOutputs}>
              Niente da segnalare oggi
            </button>
          )}
        </p>
      )}
      <p className="settings-card__hint">
        Cose uscite dalle mie mani oggi.
        <br />
        <br />
        Vale solo se è arrivato a qualcun altro ed è irreversibile: fattura inviata, preventivo
        mandato, lavoro consegnato, data comunicata, decisione detta al cliente, sollecito
        partito.
        <br />
        <br />
        Non vale: averci lavorato, averci pensato, "quasi pronto", aver parlato con qualcuno senza
        che ne sia uscito un documento o una data.
        <br />
        <br />
        Test: qualcun altro sa che è successo? Se no, non è un'uscita.
      </p>
      {dayOutputs.length > 0 && (
        <ul className="outputs-list">
          {dayOutputs.map((o) => (
            <li key={o.id} className="outputs-list__item">
              <span className="outputs-list__text">{o.text}</span>
              <button type="button" className="text-btn text-btn--danger" onClick={() => onRemove(o.id)}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function DayAgenda({
  activities,
  entries,
  outputs,
  outputsSkipped,
  cigarettes,
  food,
  onEditEntry,
  onRemoveEntry,
  onAddManualEntry,
  onAddOutput,
  onRemoveOutput,
  onConfirmNoOutputs,
  onUndoNoOutputs,
  onSetCigarettes,
  onSetFoodField,
}) {
  const [cursor, onCursorChange] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState('calendar')
  const isToday = isSameDay(cursor, new Date())
  const nextDisabled = isFuture(addDays(cursor, 1))
  const prevDisabled = toISODate(cursor) <= toISODate(APP_START_DATE)

  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => forceTick((n) => n + 1), 60000)
    return () => clearInterval(id)
  }, [isToday])

  const [expandedId, setExpandedId] = useState(null)
  const [expandedGap, setExpandedGap] = useState(null)
  const [addingManual, setAddingManual] = useState(false)

  const now = new Date()
  const items = entriesForDay(entries, cursor, now)
  const gaps = findGapsForDay(entries, cursor, now)
  const dayElapsedMs = isToday ? Math.max(1, now - startOfDay(cursor)) : DAY_MS
  const addBlockDefaults = defaultAddTimes(items, cursor)
  const dayIso = toISODate(cursor)
  const dayOutputs = outputs.filter((o) => o.date === dayIso)
  const dayOutputsSkipped = outputsSkipped.some((o) => o.date === dayIso)
  const dayCigaretteRecord = cigarettes.find((c) => c.date === dayIso)
  const dayFoodRecord = food.find((f) => f.date === dayIso)
  const isLocked = !isToday && gaps.length === 0 && now - endOfDay(cursor) >= LOCK_AFTER_MS

  // Only today can be "missing" data -- past days are either filled in or
  // already gone, and there's nothing to fill in for the future. Uscite also
  // clears once the day is confirmed to have had none.
  const missingByTab = {
    calendar: isToday && gaps.length > 0,
    outputs: isToday && dayOutputs.length === 0 && !dayOutputsSkipped,
    cigarettes: isToday && !dayCigaretteRecord,
    food: isToday && FOOD_FIELD_KEYS.some((k) => !dayFoodRecord?.[k]),
  }

  const rows = [
    ...items.map((it) => ({ type: 'entry', sortKey: it.clippedStart, ...it })),
    ...gaps.map((g) => ({ type: 'gap', sortKey: g.start, gap: g })),
  ].sort((a, b) => a.sortKey - b.sortKey)

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
          disabled={prevDisabled}
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

      <div className="segmented">
        {DAY_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`segmented__item ${activeTab === t.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {missingByTab[t.id] && <span className="segmented__dot" aria-label="Dati mancanti" />}
          </button>
        ))}
      </div>

      {activeTab === 'outputs' && (
        <OutputsCard
          dayOutputs={dayOutputs}
          onAdd={(text) => onAddOutput(dayIso, text)}
          onRemove={onRemoveOutput}
          isToday={isToday}
          isSkipped={dayOutputsSkipped}
          onConfirmNoOutputs={() => onConfirmNoOutputs(dayIso)}
          onUndoNoOutputs={() => onUndoNoOutputs(dayIso)}
        />
      )}

      {activeTab === 'cigarettes' && (
        <CigarettesCard
          count={dayCigaretteRecord ? dayCigaretteRecord.count : null}
          onSet={(count) => onSetCigarettes(dayIso, count)}
        />
      )}

      {activeTab === 'food' && (
        <FoodCard food={dayFoodRecord} onChange={(field, value) => onSetFoodField(dayIso, field, value)} />
      )}

      {activeTab === 'calendar' &&
        (activities.length === 0 ? (
          <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
        ) : (
          <>
            {rows.length === 0 && !isToday && (
              <p className="empty-state">Nessun blocco registrato in questo giorno.</p>
            )}

            {!isToday && gaps.length === 0 && (
              <p className="day-status day-status--complete">
                Giornata già completa, dalle 00:00 alle 24:00.
                {isLocked && ' Non più modificabile.'}
              </p>
            )}

            {gaps.length > 0 && (
              <p className="day-status day-status--incomplete">
                Mancano {formatDuration(gaps.reduce((sum, g) => sum + (g.end - g.start), 0))} da questo giorno.
              </p>
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
                      disabled={isLocked}
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

            {!isLocked && (
              <div className="add-block">
                {addingManual ? (
                  <ManualAddForm
                    activities={activities}
                    dayDate={cursor}
                    initialStart={addBlockDefaults.start}
                    initialEnd={addBlockDefaults.end}
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
        ))}
    </div>
  )
}

function ManualAddForm({ activities, dayDate, onAdd, onCancel, initialStart = '09:00', initialEnd = '10:00' }) {
  const [activityId, setActivityId] = useState(activities[0]?.id)
  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(initialEnd)

  function handleAdd() {
    const dateIso = toISODate(dayDate)
    const endDateIso = endTime === '24:00' ? toISODate(addDays(dayDate, 1)) : dateIso
    const normalizedEndTime = endTime === '24:00' ? '00:00' : endTime
    onAdd(activityId, `${dateIso}T${startTime}:00`, `${endDateIso}T${normalizedEndTime}:00`)
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
          <HalfHourSelect value={startTime} onChange={setStartTime} />
        </label>
        <label>
          <span>Fine</span>
          <HalfHourSelect value={endTime} onChange={setEndTime} options={END_TIME_OPTIONS} />
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
