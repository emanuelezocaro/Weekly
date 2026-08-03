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
import { buildClockSegments, buildDayBreakdown } from '../utils/dayClock'
import { useSwipeNav } from '../hooks/useSwipeNav'
import CigarettesCard from './CigarettesCard'
import DayBreakdownChart from './DayBreakdownChart'
import DayClock from './DayClock'
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

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Minute ranges (from midnight) already claimed by other blocks that day --
// so the picker can only offer times that are actually free, instead of a
// time that would just get silently trimmed by the overlap resolver.
function coveredRanges(items, dayStart, excludeEntryId) {
  return items
    .filter((it) => it.entry.id !== excludeEntryId)
    .map((it) => [
      Math.round((it.clippedStart.getTime() - dayStart.getTime()) / 60000),
      Math.round((it.clippedEnd.getTime() - dayStart.getTime()) / 60000),
    ])
}

function isMinuteCovered(minute, ranges) {
  return ranges.some(([s, e]) => minute >= s && minute < e)
}

function availableTimeOptions(options, ranges) {
  return options.filter((t) => !isMinuteCovered(timeToMinutes(t), ranges))
}

// A day that's "done" is locked 48h after it ends, so old history can't be
// edited by accident. What counts as "done" depends on the tab: no gaps for
// Calendario, a record for Sigarette, all fields for Cibo, at least one
// output (or a confirmed "niente") for Uscite.
const LOCK_AFTER_MS = 48 * 60 * 60 * 1000

function isDayLocked(isToday, complete, cursor, now) {
  return !isToday && complete && now - endOfDay(cursor) >= LOCK_AFTER_MS
}

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

function EntryEditor({ entry, activities, dayDate, items, onSave, onDelete, onCancel, onCloseNow }) {
  const isOpen = entry.end === null
  const startDate = parseISODateTime(entry.start)
  const endDate = entry.end ? parseISODateTime(entry.end) : null
  const isStartDay = isSameDay(startDate, dayDate)
  const isEndDay = endDate ? isSameDay(endDate, dayDate) : false

  // Times already claimed by other blocks that day are hidden from both
  // pickers -- this entry's own current slot stays selectable (excluded by
  // id), everyone else's doesn't, so you can't pick a time that would just
  // get silently trimmed by the overlap resolver.
  const ranges = coveredRanges(items, startOfDay(dayDate), entry.id)
  const startOptions = availableTimeOptions(HALF_HOUR_OPTIONS, ranges)
  const endOptions = availableTimeOptions(END_TIME_OPTIONS, ranges)

  const [activityId, setActivityId] = useState(entry.activityId)
  const [startTime, setStartTime] = useState(formatTimeRounded(startDate))
  // A block ending exactly at midnight of the next day must display as
  // "24:00", the picker's dedicated end-of-day option -- not "00:00", which
  // means minute zero of THIS day and gets filtered out of the options
  // whenever something else (e.g. Sleep) starts right at midnight, leaving
  // the select with no matching option and silently falling back to the
  // first one in the list.
  const initialEndTime = endDate ? formatTimeRounded(endDate) : ''
  const [endTime, setEndTime] = useState(
    isStartDay && !isEndDay && initialEndTime === '00:00' ? '24:00' : initialEndTime,
  )
  // The picker only offers half-hour steps, so its initial value is a
  // rounded display of the real start/end -- if the field is never touched,
  // save must keep the exact original timestamp rather than the rounding.
  const [startTouched, setStartTouched] = useState(false)
  const [endTouched, setEndTouched] = useState(false)

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
    const patch = {
      activityId,
      start: startTouched ? `${startDateIso}T${startTime}:00` : entry.start,
    }
    if (!isOpen) {
      const endDateIso = endsNextDay ? toISODate(addDays(dayDate, 1)) : dateIso
      const normalizedEndTime = endTime === '24:00' ? '00:00' : endTime
      patch.end = endTouched ? `${endDateIso}T${normalizedEndTime}:00` : entry.end
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
          <HalfHourSelect
            value={startTime}
            onChange={(t) => {
              setStartTime(t)
              setStartTouched(true)
            }}
            options={startOptions}
          />
        </label>
        {isOpen ? (
          <button type="button" className="backup-card__secondary" onClick={onCloseNow}>
            Termina ora
          </button>
        ) : (
          <label>
            <span>Fine{endsNextDay ? ' (giorno dopo)' : ''}</span>
            <HalfHourSelect
              value={endTime}
              onChange={(t) => {
                setEndTime(t)
                setEndTouched(true)
              }}
              options={endOptions}
            />
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

function OutputsCard({ dayOutputs, onAdd, onRemove, isToday, isSkipped, onConfirmNoOutputs, onUndoNoOutputs, locked }) {
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
      {!locked && (
        <form className="outputs-add-form" onSubmit={handleSubmit}>
          <textarea
            placeholder="Es. Fattura inviata a..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <button type="submit">Aggiungi</button>
        </form>
      )}
      {locked && <p className="settings-card__hint">Non più modificabile.</p>}
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
              <button
                type="button"
                className="text-btn text-btn--danger"
                onClick={() => onRemove(o.id)}
                disabled={locked}
              >
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
  onPeriodLabel,
}) {
  const [cursor, onCursorChange] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState('calendar')
  const isToday = isSameDay(cursor, new Date())
  const nextDisabled = isFuture(addDays(cursor, 1))
  const prevDisabled = toISODate(cursor) <= toISODate(APP_START_DATE)
  const swipeHandlers = useSwipeNav({
    onPrev: () => onCursorChange(addDays(cursor, -1)),
    onNext: () => onCursorChange(addDays(cursor, 1)),
    prevDisabled,
    nextDisabled,
  })

  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => forceTick((n) => n + 1), 60000)
    return () => clearInterval(id)
  }, [isToday])

  // Reports the current day up to the app header, which shows it in place
  // of the day-switcher (removed in favor of the swipe gesture below).
  useEffect(() => {
    if (!onPeriodLabel) return
    onPeriodLabel(isToday ? `Today · ${formatFullDate(cursor)}` : formatFullDate(cursor))
    return () => onPeriodLabel(null)
  }, [isToday, cursor, onPeriodLabel])

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
  const isLocked = isDayLocked(isToday, gaps.length === 0, cursor, now)
  const outputsLocked = isDayLocked(isToday, dayOutputs.length > 0 || dayOutputsSkipped, cursor, now)
  const cigarettesLocked = isDayLocked(isToday, !!dayCigaretteRecord, cursor, now)
  const foodLocked = isDayLocked(isToday, FOOD_FIELD_KEYS.every((k) => !!dayFoodRecord?.[k]), cursor, now)

  // Only today can be "missing" data -- past days are either filled in or
  // already gone, and there's nothing to fill in for the future. Uscite also
  // clears once the day is confirmed to have had none.
  const missingByTab = {
    calendar: isToday && gaps.length > 0,
    outputs: isToday && dayOutputs.length === 0 && !dayOutputsSkipped,
    cigarettes: isToday && !dayCigaretteRecord,
    food: isToday && FOOD_FIELD_KEYS.some((k) => !dayFoodRecord?.[k]),
  }

  const dayStart = startOfDay(cursor)
  const clockSegments = buildClockSegments(items, activities, dayStart)
  const dayBreakdown = buildDayBreakdown(items, activities, dayElapsedMs)
  const nowFrac = isToday ? (now.getTime() - dayStart.getTime()) / DAY_MS : null
  const sortedGaps = [...gaps].sort((a, b) => a.start - b.start)

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
    <div className="panel" {...swipeHandlers}>
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

      <>
        {activeTab === 'outputs' && (
          <OutputsCard
            dayOutputs={dayOutputs}
            onAdd={(text) => onAddOutput(dayIso, text)}
            onRemove={onRemoveOutput}
            isToday={isToday}
            isSkipped={dayOutputsSkipped}
            onConfirmNoOutputs={() => onConfirmNoOutputs(dayIso)}
            onUndoNoOutputs={() => onUndoNoOutputs(dayIso)}
            locked={outputsLocked}
          />
        )}

        {activeTab === 'cigarettes' && (
          <CigarettesCard
            count={dayCigaretteRecord ? dayCigaretteRecord.count : null}
            onSet={(count) => onSetCigarettes(dayIso, count)}
            locked={cigarettesLocked}
          />
        )}

        {activeTab === 'food' && (
          <FoodCard
            food={dayFoodRecord}
            onChange={(field, value) => onSetFoodField(dayIso, field, value)}
            locked={foodLocked}
          />
        )}

        {activeTab === 'calendar' &&
          (activities.length === 0 ? (
            <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
          ) : (
            <>
              {items.length === 0 && !isToday && (
                <p className="empty-state">Nessun blocco registrato in questo giorno.</p>
              )}

              {!isToday && gaps.length === 0 && (
                <p className="day-status day-status--complete">
                  Giornata già completa, dalle 00:00 alle 24:00.
                  {isLocked && ' Non più modificabile.'}
                </p>
              )}

              {/* "Aggiungi blocco" and the gap-fill prompt are alternatives: a
                  gap already means there's a specific hole to fill, so it
                  takes over the top slot instead of the generic add button. */}
              {!isLocked && gaps.length > 0 && (
                <ul className="timeline">
                  {sortedGaps.map((gap) => {
                    const key = toISODateTime(gap.start)
                    return (
                      <GapRow
                        key={key}
                        gap={gap}
                        activities={activities}
                        expanded={expandedGap === key}
                        onToggle={() => setExpandedGap(expandedGap === key ? null : key)}
                        onPick={(activityId) => handleFillGap(gap, activityId)}
                      />
                    )
                  })}
                </ul>
              )}

              {!isLocked && gaps.length === 0 && isToday && (
                <div className="add-block">
                  {addingManual ? (
                    <ManualAddForm
                      activities={activities}
                      dayDate={cursor}
                      items={items}
                      initialStart={addBlockDefaults.start}
                      initialEnd={addBlockDefaults.end}
                      onAdd={(activityId, start, end) => {
                        onAddManualEntry(activityId, start, end)
                        setAddingManual(false)
                      }}
                      onCancel={() => setAddingManual(false)}
                    />
                  ) : (
                    <button type="button" className="add-block__cta" onClick={() => setAddingManual(true)}>
                      <span className="add-block__cta-icon">+</span>
                      Aggiungi blocco
                    </button>
                  )}
                </div>
              )}

              {items.length > 0 && (
                <>
                  <DayClock
                    segments={clockSegments}
                    nowFrac={nowFrac}
                    selectedId={expandedId}
                    onSelect={isLocked ? () => {} : setExpandedId}
                  />
                  {expandedId &&
                    (() => {
                      const row = items.find((it) => it.entry.id === expandedId)
                      if (!row) return null
                      return (
                        <EntryEditor
                          entry={row.entry}
                          activities={activities}
                          dayDate={cursor}
                          items={items}
                          onSave={(patch) => handleSaveEdit(row.entry.id, patch)}
                          onDelete={() => handleDelete(row.entry.id)}
                          onCancel={() => setExpandedId(null)}
                          onCloseNow={() => handleSaveEdit(row.entry.id, { end: nowISODateTime() })}
                        />
                      )
                    })()}
                  <DayBreakdownChart
                    rows={dayBreakdown.rows}
                    notDoneMs={dayBreakdown.notDoneMs}
                    accountedMs={dayElapsedMs}
                  />
                </>
              )}
            </>
          ))}
      </>
    </div>
  )
}

function ManualAddForm({ activities, dayDate, items, onAdd, onCancel, initialStart = '09:00', initialEnd = '10:00' }) {
  const [activityId, setActivityId] = useState(activities[0]?.id)
  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(initialEnd)

  // Only actually-free times are offered -- times already covered by another
  // block that day would just get silently trimmed away by the overlap
  // resolver, which reads as a bug rather than "obviously that time is taken".
  const ranges = coveredRanges(items, startOfDay(dayDate), null)
  const startOptions = availableTimeOptions(HALF_HOUR_OPTIONS, ranges)
  const endOptions = availableTimeOptions(END_TIME_OPTIONS, ranges)

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
          <HalfHourSelect value={startTime} onChange={setStartTime} options={startOptions} />
        </label>
        <label>
          <span>Fine</span>
          <HalfHourSelect value={endTime} onChange={setEndTime} options={endOptions} />
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
