import { useEffect, useState } from 'react'
import { addDays, APP_START_DATE, endOfDay, formatDuration, formatFullDate, isFuture, isSameDay, toISODate } from '../utils/date'
import { useSwipeNav } from '../hooks/useSwipeNav'
import { colorVar } from '../utils/palette'
import ChoiceRow from './ChoiceRow'
import FoodCard from './FoodCard'
import { RATING_OPTIONS, thresholdHint } from '../utils/timeRatings'

const FOOD_FIELD_KEYS = ['colazione', 'pranzo', 'cena', 'alcol', 'dolci', 'extra']

// A day that's "done" is locked 48h after it ends, so old history can't be
// edited by accident. Only Cibo (all fields filled in) has such a notion --
// Attività never counts as "complete" or "incomplete", so logging a
// duration, ticking a checklist item, or tapping a rating never locks on
// its own; the shared unlock button below still applies to Cibo even while
// looking at the rest of the day.
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
    <div className="list-item">
      <div className="list-row">
        <span className="list-row__label">
          <span className="list-row__dot" style={{ background: colorVar(activity.colorSlot) }} />
          <span className="list-row__text">
            <span className="list-row__name">{activity.name}</span>
            {totalMinutes > 0 && <span className="list-row__meta">{formatDuration(totalMinutes * 60000)}</span>}
          </span>
        </span>
        <form
          className="time-entry"
          onSubmit={(e) => {
            e.preventDefault()
            addCustom()
          }}
        >
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            aria-label="Ore"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <span className="time-entry__unit">h</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            aria-label="Minuti"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <span className="time-entry__unit">m</span>
          <button type="submit" className="time-entry__add" aria-label="Aggiungi">
            +
          </button>
        </form>
      </div>
      {logs.length > 0 && (
        <div className="time-logs">
          {logs.map((d) => (
            <span key={d.id} className="time-log">
              {formatDuration(d.minutes * 60000)}
              <button type="button" aria-label="Elimina" onClick={() => onRemove(d.id)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Checklist activities are a single yes/no tap: a compact tile, four per
// line. Today's still-untouched tiles turn red -- every one needs an
// explicit done/not-done by end of day. Past days don't get this: whatever
// they ended up as is just history now.
function ChecklistActivityTile({ activity, done, missing, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={done}
      className={`check-tile ${done ? 'is-done' : ''} ${missing ? 'is-missing' : ''}`}
      onClick={onToggle}
    >
      <span className="check-tile__mark" aria-hidden="true">
        {done ? '✓' : ''}
      </span>
      <span className="check-tile__name">{activity.name}</span>
    </button>
  )
}

// The threshold for each option (only known for Sleep and Put off) sits
// inside the option itself, since there's no number entry to explain it.
function RatingActivityRow({ activity, value, onSet }) {
  const options = RATING_OPTIONS.map((opt) => ({ ...opt, hint: thresholdHint(activity.name, opt.value) }))
  return (
    <ChoiceRow
      label={activity.name}
      color={colorVar(activity.colorSlot)}
      options={options}
      value={value}
      onChange={onSet}
    />
  )
}

export default function DayAgenda({
  activities,
  durations,
  checklist,
  food,
  ratings,
  onAddDuration,
  onRemoveDuration,
  onToggleChecklist,
  onSetFoodField,
  onSetRating,
  onPeriodLabel,
}) {
  const [cursor, onCursorChange] = useState(() => new Date())
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
  const dayRatingByActivity = new Map(ratings.filter((r) => r.date === dayIso).map((r) => [r.activityId, r.value]))
  const dayFoodRecord = food.find((f) => f.date === dayIso)
  const foodLocked =
    isDayLocked(isToday, FOOD_FIELD_KEYS.every((k) => !!dayFoodRecord?.[k]), cursor, now) && !forceUnlock
  const showUnlockButton = !forceUnlock && !isToday && foodLocked
  const listActivities = activities.filter((a) => a.mode !== 'checklist')
  const checklistActivities = activities.filter((a) => a.mode === 'checklist')

  return (
    <div className="panel list-view" {...swipeHandlers}>
      {showUnlockButton && (
        <button type="button" className="text-btn add-view__unlock" onClick={() => setForceUnlock(true)}>
          Sblocca per modificare
        </button>
      )}

      {activities.length === 0 && (
        <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
      )}

      {listActivities.length > 0 && (
        <section className="list-section">
          <h2 className="list-section__title">Activities</h2>
          <div className="list-card">
            {listActivities.map((a) =>
              a.mode === 'rating' ? (
                <RatingActivityRow
                  key={a.id}
                  activity={a}
                  value={dayRatingByActivity.get(a.id) ?? null}
                  onSet={(value) => onSetRating(a.id, dayIso, value)}
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
        </section>
      )}

      {checklistActivities.length > 0 && (
        <section className="list-section">
          <h2 className="list-section__title">Checklist</h2>
          <div className="check-grid">
            {checklistActivities.map((a) => (
              <ChecklistActivityTile
                key={a.id}
                activity={a}
                done={dayChecklistDone.has(a.id)}
                missing={isToday && !dayChecklistDone.has(a.id)}
                onToggle={() => onToggleChecklist(a.id, dayIso)}
              />
            ))}
          </div>
        </section>
      )}

      <FoodCard
        food={dayFoodRecord}
        onChange={(field, value) => onSetFoodField(dayIso, field, value)}
        locked={foodLocked}
      />
    </div>
  )
}
