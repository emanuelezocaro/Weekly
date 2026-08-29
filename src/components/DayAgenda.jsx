import { useEffect, useState } from 'react'
import { addDays, APP_START_DATE, endOfDay, formatDuration, formatFullDate, isFuture, isSameDay, toISODate } from '../utils/date'
import { useSwipeNav } from '../hooks/useSwipeNav'
import { colorVar } from '../utils/palette'
import CigarettesCard from './CigarettesCard'
import FoodCard from './FoodCard'
import DiaryCard from './DiaryCard'

const DAY_TABS = [
  { id: 'calendar', label: 'Act' },
  { id: 'outputs', label: 'Exit' },
  { id: 'cigarettes', label: 'Cig' },
  { id: 'food', label: 'Food' },
  { id: 'diary', label: 'Diary' },
]

const FOOD_FIELD_KEYS = ['colazione', 'pranzo', 'cena', 'alcol', 'dolci', 'extra']

// A day that's "done" is locked 48h after it ends, so old history can't be
// edited by accident. What counts as "done" depends on the tab: a record for
// Sigarette, all fields for Cibo, at least one output (or a confirmed
// "niente") for Uscite. Attività has no such notion anymore -- logging a
// duration or ticking a checklist item is never "complete" or "incomplete",
// so that tab is never locked on its own; the shared unlock button below
// still applies to whichever OTHER tab is locked for that day.
const LOCK_AFTER_MS = 48 * 60 * 60 * 1000

function isDayLocked(isToday, complete, cursor, now) {
  return !isToday && complete && now - endOfDay(cursor) >= LOCK_AFTER_MS
}

function DurationActivityRow({ activity, logs, onAdd, onRemove }) {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const totalMinutes = logs.reduce((sum, d) => sum + d.minutes, 0)

  function addCustom() {
    const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0)
    if (total <= 0) return
    onAdd(total)
    setHours('')
    setMinutes('')
  }

  return (
    <div className="day-activity-row">
      <div className="day-activity-row__header">
        <span className="day-activity-row__swatch" style={{ background: colorVar(activity.colorSlot) }} />
        <span className="day-activity-row__name">{activity.name}</span>
        {totalMinutes > 0 && (
          <span className="day-activity-row__total">{formatDuration(totalMinutes * 60000)}</span>
        )}
      </div>
      <div className="day-activity-row__custom">
        <input
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="h"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <input
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="min"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <button type="button" onClick={addCustom}>
          Aggiungi
        </button>
      </div>
      {logs.length > 0 && (
        <ul className="outputs-list">
          {logs.map((d) => (
            <li key={d.id} className="outputs-list__item">
              <span className="outputs-list__text">{formatDuration(d.minutes * 60000)}</span>
              <button type="button" className="text-btn text-btn--danger" onClick={() => onRemove(d.id)}>
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChecklistActivityRow({ activity, done, onToggle }) {
  return (
    <button type="button" className={`day-activity-row day-activity-row--checklist ${done ? 'is-done' : ''}`} onClick={onToggle}>
      <span className="day-activity-row__header">
        <span className="day-activity-row__swatch" style={{ background: colorVar(activity.colorSlot) }} />
        <span className="day-activity-row__name">{activity.name}</span>
        <span className="day-activity-row__check-state">{done ? 'Fatto ✓' : 'Non fatto'}</span>
      </span>
    </button>
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
  durations,
  checklist,
  outputs,
  outputsSkipped,
  cigarettes,
  food,
  diary,
  onAddDuration,
  onRemoveDuration,
  onToggleChecklist,
  onAddOutput,
  onRemoveOutput,
  onConfirmNoOutputs,
  onUndoNoOutputs,
  onSetCigarettes,
  onSetFoodField,
  onSetDiaryEntry,
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

  // Reports the current day up to the app header, which shows it in place
  // of the day-switcher (removed in favor of the swipe gesture below).
  // prevAvailable/nextAvailable let the header show which swipe directions
  // actually work right now, one arrow flanking each side of the label.
  useEffect(() => {
    if (!onPeriodLabel) return
    const label = isToday ? `Today · ${formatFullDate(cursor)}` : formatFullDate(cursor)
    onPeriodLabel({ label, prevAvailable: !prevDisabled, nextAvailable: !nextDisabled })
    return () => onPeriodLabel(null)
  }, [isToday, cursor, onPeriodLabel, prevDisabled, nextDisabled])

  // The 48h lock is just a guardrail against editing old history by
  // accident -- an explicit tap on "Sblocca per modificare" overrides it for
  // this one day, across every tab. Resets on every day change so the
  // override never quietly carries over to a different day.
  const [forceUnlock, setForceUnlock] = useState(false)
  useEffect(() => setForceUnlock(false), [cursor])

  const now = new Date()
  const dayIso = toISODate(cursor)
  const dayDurations = durations.filter((d) => d.date === dayIso)
  const dayChecklistDone = new Set(checklist.filter((c) => c.date === dayIso).map((c) => c.activityId))
  const dayOutputs = outputs.filter((o) => o.date === dayIso)
  const dayOutputsSkipped = outputsSkipped.some((o) => o.date === dayIso)
  const dayCigaretteRecord = cigarettes.find((c) => c.date === dayIso)
  const dayFoodRecord = food.find((f) => f.date === dayIso)
  const dayDiaryRecord = diary.find((d) => d.date === dayIso)
  const outputsLocked = isDayLocked(isToday, dayOutputs.length > 0 || dayOutputsSkipped, cursor, now) && !forceUnlock
  const cigarettesLocked = isDayLocked(isToday, !!dayCigaretteRecord, cursor, now) && !forceUnlock
  const foodLocked =
    isDayLocked(isToday, FOOD_FIELD_KEYS.every((k) => !!dayFoodRecord?.[k]), cursor, now) && !forceUnlock
  const diaryLocked = isDayLocked(isToday, !!dayDiaryRecord?.text?.trim(), cursor, now) && !forceUnlock
  const anyOtherTabLocked = !forceUnlock && !isToday && (outputsLocked || cigarettesLocked || foodLocked || diaryLocked)

  // Only today can be "missing" data -- past days are either filled in or
  // already gone, and there's nothing to fill in for the future. Uscite also
  // clears once the day is confirmed to have had none. Attività has no
  // missing-data notion anymore -- there's no full day to account for.
  const missingByTab = {
    outputs: isToday && dayOutputs.length === 0 && !dayOutputsSkipped,
    cigarettes: isToday && !dayCigaretteRecord,
    food: isToday && FOOD_FIELD_KEYS.some((k) => !dayFoodRecord?.[k]),
    diary: isToday && !dayDiaryRecord?.text?.trim(),
  }

  return (
    <div className="panel" {...swipeHandlers}>
      <div className="segmented-wrap">
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
      </div>

      <>
        {anyOtherTabLocked && (
          <button type="button" className="text-btn" style={{ marginBottom: 12 }} onClick={() => setForceUnlock(true)}>
            Sblocca per modificare
          </button>
        )}

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

        {activeTab === 'diary' && (
          <DiaryCard
            key={dayIso}
            text={dayDiaryRecord?.text || ''}
            onSave={(text) => onSetDiaryEntry(dayIso, text)}
            locked={diaryLocked}
          />
        )}

        {activeTab === 'calendar' &&
          (activities.length === 0 ? (
            <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
          ) : (
            <div className="activity-day-list">
              {activities.map((a) =>
                a.mode === 'checklist' ? (
                  <ChecklistActivityRow
                    key={a.id}
                    activity={a}
                    done={dayChecklistDone.has(a.id)}
                    onToggle={() => onToggleChecklist(a.id, dayIso)}
                  />
                ) : (
                  <DurationActivityRow
                    key={a.id}
                    activity={a}
                    logs={dayDurations.filter((d) => d.activityId === a.id)}
                    onAdd={(minutes) => onAddDuration(a.id, dayIso, minutes)}
                    onRemove={onRemoveDuration}
                  />
                ),
              )}
            </div>
          ))}
      </>
    </div>
  )
}
