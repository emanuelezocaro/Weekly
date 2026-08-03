import { formatDuration, formatTime } from '../utils/date'
import { colorVar } from '../utils/palette'

const SIZE = 300
const CENTER = SIZE / 2
// The ring is deliberately smaller than the canvas (rather than edge-to-edge)
// so the 24 hour labels around it have real room to breathe instead of
// getting clipped by the SVG viewBox at the top/left/right/bottom.
const RADIUS = 100
const STROKE = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// Below this share of the day, a wedge is too thin to hold a readable label
// on the face itself -- it's still drawn and still tappable, it just relies
// on the caption instead of a permanent label.
const LABEL_MIN_FRACTION = 90 / (24 * 60)

function angleFor(frac) {
  return frac * 2 * Math.PI - Math.PI / 2
}

function pointAt(frac, radius) {
  const a = angleFor(frac)
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) }
}

function HourMarks() {
  const marks = []
  for (let h = 0; h < 24; h++) {
    const frac = h / 24
    const isMajor = h % 3 === 0
    const inner = pointAt(frac, RADIUS + STROKE / 2 + 3)
    const outer = pointAt(frac, RADIUS + STROKE / 2 + (isMajor ? 8 : 5))
    marks.push(
      <line
        key={`tick-${h}`}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke="var(--text-muted)"
        strokeWidth={isMajor ? 1.6 : 1}
        opacity={isMajor ? 0.75 : 0.4}
      />,
    )
    const labelPt = pointAt(frac, RADIUS + STROKE / 2 + (isMajor ? 20 : 17))
    marks.push(
      <text
        key={`label-${h}`}
        x={labelPt.x}
        y={labelPt.y}
        fontSize={isMajor ? '12' : '8.5'}
        fontWeight={isMajor ? '800' : '600'}
        fill={isMajor ? 'var(--text)' : 'var(--text-muted)'}
        opacity={isMajor ? 1 : 0.8}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {h}
      </text>,
    )
  }
  return <>{marks}</>
}

function NowHand({ frac }) {
  const tip = pointAt(frac, RADIUS + STROKE / 2 + 14)
  const base = pointAt(frac, RADIUS - STROKE / 2 - 6)
  return (
    <>
      <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke="var(--danger)" strokeWidth="2" />
      <circle cx={tip.x} cy={tip.y} r="3.5" fill="var(--danger)" />
    </>
  )
}

function captionFor(seg) {
  if (!seg) return 'Tocca un blocco per i dettagli'
  const range = `${formatTime(seg.start)} – ${seg.isOpen ? 'ora' : formatTime(seg.end)}`
  return `${seg.name} · ${range} · ${formatDuration(seg.durationMs)}`
}

export default function DayClock({ segments, nowFrac, selectedId, onSelect }) {
  const selected = segments.find((s) => s.id === selectedId) || null

  return (
    <div className="day-clock">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="day-clock__svg" role="img" aria-label="Blocchi della giornata">
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
        <HourMarks />
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          {segments.map((seg) => {
            const frac = seg.endFrac - seg.startFrac
            const rawLen = frac * CIRCUMFERENCE
            const gap = segments.length > 1 ? 2 : 0
            const len = Math.max(0, rawLen - gap)
            const dashoffset = -(seg.startFrac * CIRCUMFERENCE)
            const isSelected = seg.id === selectedId
            return (
              <circle
                key={seg.id}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={seg.colorSlot != null ? colorVar(seg.colorSlot) : 'var(--gap)'}
                strokeWidth={isSelected ? STROKE + 6 : STROKE}
                strokeDasharray={`${len} ${CIRCUMFERENCE - len}`}
                strokeDashoffset={dashoffset}
                opacity={selectedId && !isSelected ? 0.45 : 1}
                className="day-clock__segment"
                onClick={() => onSelect(isSelected ? null : seg.id)}
              />
            )
          })}
        </g>
        {nowFrac != null && <NowHand frac={nowFrac} />}
        {segments
          .filter((seg) => seg.endFrac - seg.startFrac >= LABEL_MIN_FRACTION)
          .map((seg) => {
            const midFrac = (seg.startFrac + seg.endFrac) / 2
            const pt = pointAt(midFrac, RADIUS)
            return (
              <text
                key={`lbl-${seg.id}`}
                x={pt.x}
                y={pt.y - 5}
                fontSize="10.5"
                fontWeight="700"
                fill="#fff"
                textAnchor="middle"
                pointerEvents="none"
              >
                <tspan x={pt.x} dy="0">
                  {seg.name}
                </tspan>
                <tspan x={pt.x} dy="12">
                  {formatDuration(seg.durationMs)}
                </tspan>
              </text>
            )
          })}
      </svg>
      <p className="day-clock__caption">{captionFor(selected)}</p>
    </div>
  )
}
