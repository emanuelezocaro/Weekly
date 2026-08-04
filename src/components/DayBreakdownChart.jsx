import { colorVar } from '../utils/palette'

function Row({ name, colorSlot, pct, isNotDone }) {
  return (
    <li className={`day-breakdown__row ${isNotDone ? 'is-notdone' : ''}`}>
      <span className="day-breakdown__swatch" style={{ background: isNotDone ? 'var(--gap)' : colorVar(colorSlot) }} />
      <span className="day-breakdown__name">{name}</span>
      <div className="day-breakdown__bar-track">
        <div
          className="day-breakdown__bar-fill"
          style={{ width: `${pct}%`, background: isNotDone ? 'var(--gap)' : colorVar(colorSlot) }}
        />
      </div>
      <span className="day-breakdown__pct">{pct}%</span>
    </li>
  )
}

// One row per activity actually logged that day -- ten separate "Work"
// blocks fold into a single percentage here, unlike the clock face above
// which still shows every individual block. Whatever wasn't logged always
// comes last, regardless of its own share of the day.
export default function DayBreakdownChart({ rows, notDoneMs, accountedMs, zeroActivities = [] }) {
  const pct = (ms) => (accountedMs > 0 ? Math.round((ms / accountedMs) * 100) : 0)

  if (rows.length === 0 && notDoneMs <= 0) return null

  return (
    <>
      <ul className="day-breakdown">
        {rows.map((r) => (
          <Row key={r.id} name={r.name} colorSlot={r.colorSlot} pct={pct(r.totalMs)} />
        ))}
        {notDoneMs > 0 && <Row name="Non fatto" pct={pct(notDoneMs)} isNotDone />}
      </ul>
      {zeroActivities.length > 0 && (
        <p className="day-donut__zero">A zero: {zeroActivities.map((a) => a.name).join(', ')}</p>
      )}
    </>
  )
}
