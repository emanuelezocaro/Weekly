import { useEffect, useState } from 'react'
import { addDays, APP_START_DATE, endOfDay, formatDuration, formatFullDate, isFuture, isSameDay, toISODate } from '../utils/date'
import { useSwipeNav } from '../hooks/useSwipeNav'
import { colorVar } from '../utils/palette'
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

// Checklist activities are a single yes/no tap, so unlike the other modes
// they don't need a full-width row -- a compact square/rectangular tile
// lets three fit per line, cutting a long stack of near-identical rows down
// to a grid. Today's still-untouched tiles turn red (not just neutral) --
// every one of them needs an explicit done/not-done by end of day, so an
// unmarked tile is a real gap to close, not a quiet default. Past days
// don't get this: whatever they ended up as is just history now, nothing
// left to nag about.
function ChecklistActivityTile({ activity, done, missing, onToggle }) {
  return (
    <button
      type="button"
      className={`day-activity-tile ${done ? 'is-done' : ''} ${missing ? 'is-missing' : ''}`}
      onClick={onToggle}
    >
      <span className="day-activity-tile__swatch" style={{ background: colorVar(activity.colorSlot) }} />
      <span className="day-activity-tile__name">{activity.name}</span>
      {done && <span className="day-activity-tile__check-state">Fatto ✓</span>}
    </button>
  )
}

// A single Bad/Medium/Good tap per day -- same input shape as Food's rating
// buttons, just one field instead of six. Each button carries its own
// threshold (only known for Sleep and Put off) right inside it, instead of
// a separate legend line, since there's no number entry here to make it
// obvious otherwise.
function RatingActivityRow({ activity, value, onSet }) {
  return (
    <div className="day-activity-row">
      <div className="day-activity-row__header">
        <span className="day-activity-row__swatch" style={{ background: colorVar(activity.colorSlot) }} />
        <span className="day-activity-row__name">{activity.name}</span>
      </div>
      <div className="rating-seg">
        {RATING_OPTIONS.map((opt) => {
          const hint = thresholdHint(activity.name, opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              className={`${opt.cls} ${value === opt.value ? 'is-selected' : ''}`}
              onClick={() => onSet(opt.value)}
            >
              <span className="rating-seg__label">{opt.label}</span>
              {hint && <span className="rating-seg__hint">{hint}</span>}
            </button>
          )
        })}
      </div>
    </div>
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

  return (
    <div className="panel" {...swipeHandlers}>
      {showUnlockButton && (
        <button type="button" className="text-btn" style={{ marginBottom: 12 }} onClick={() => setForceUnlock(true)}>
          Sblocca per modificare
        </button>
      )}

      <div className="activity-day-list">
        {activities.length === 0 ? (
          <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
        ) : (
          <>
            {activities
              .filter((a) => a.mode !== 'checklist')
              .map((a) =>
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
            {activities.some((a) => a.mode === 'checklist') && (
              <div className="day-activity-grid">
                {activities
                  .filter((a) => a.mode === 'checklist')
                  .map((a) => (
                    <ChecklistActivityTile
                      key={a.id}
                      activity={a}
                      done={dayChecklistDone.has(a.id)}
                      missing={isToday && !dayChecklistDone.has(a.id)}
                      onToggle={() => onToggleChecklist(a.id, dayIso)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
        <FoodCard
          food={dayFoodRecord}
          onChange={(field, value) => onSetFoodField(dayIso, field, value)}
          locked={foodLocked}
        />
      </div>
    </div>
  )
}
