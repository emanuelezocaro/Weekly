import { useState } from 'react'
import { clusterFor } from '../utils/foodPoints'

// One report line: name on the left, a compact result on the right; tap it
// to open the full detail right underneath, inside the same list.
export default function ReportRow({ label, color, summary, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="list-item">
      <button
        type="button"
        className="list-row report-row"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="list-row__label">
          {color && <span className="list-row__dot" style={{ background: color }} />}
          <span className="list-row__name">{label}</span>
        </span>
        <span className="report-row__summary">{summary}</span>
        <span className={`report-row__chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="report-detail">{children}</div>}
    </div>
  )
}

// Points summary: a small three-zone bar with a pointer, then the score in
// its zone's color. Zones sit at 1/3 and 3/4 of the max, same as the full
// gauge inside the detail.
export function ScoreSummary({ value, max }) {
  if (value === null) return <span className="report-row__empty">—</span>
  const cluster = clusterFor(value, max)
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <>
      <span className="mini-gauge" aria-hidden="true">
        <span className="mini-gauge__pointer" style={{ left: `${pct}%` }} />
      </span>
      <span className={`report-row__value is-${cluster.key}`}>{value.toFixed(1)}</span>
      <span className="report-row__unit">/{max}</span>
    </>
  )
}
