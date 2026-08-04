import { formatDuration, formatTime } from '../utils/date'
import { colorVar } from '../utils/palette'

const SIZE = 300
const CENTER = SIZE / 2
// The activity pie is deliberately smaller than the canvas (rather than
// edge-to-edge) so the 24 hour labels around it have real room to breathe
// instead of getting clipped by the SVG viewBox at the top/left/right/bottom.
const RADIUS = 100
// Kept only as a geometry reference for the day-part band/ticks/numbers
// further out -- the activity wedges themselves are filled all the way to
// the center now, not a ring, so nothing draws with this as a stroke width.
const STROKE = 30
// Below this share of the day, a wedge doesn't have enough arc length to
// hold two readable lines of text (name + duration) without truncating or
// overlapping its neighbors -- forcing it in looks worse than not trying.
// It's still fully drawn and tappable; a small dot marks it instead, and
// the caption below the clock shows its details on tap.
const LABEL_MIN_FRACTION = 150 / (24 * 60)

function wedgePath(startFrac, endFrac, r) {
  // A full day as one entry needs special-casing: an SVG arc can't have
  // identical start/end points, so a single 360° slice is split into two.
  if (endFrac - startFrac >= 0.999) {
    const p0 = pointAt(startFrac, r)
    const pMid = pointAt(startFrac + 0.5, r)
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 1 1 ${pMid.x} ${pMid.y} A ${r} ${r} 0 1 1 ${p0.x} ${p0.y} Z`
  }
  const start = pointAt(startFrac, r)
  const end = pointAt(endFrac, r)
  const largeArc = endFrac - startFrac > 0.5 ? 1 : 0
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

// The day-part band sits just outside the ring, underneath the hour ticks
// and numbers -- notte (22-06) / mattina (06-13) / pomeriggio (13-18) /
// sera (18-22) as four clearly distinct colors, each a flat plateau with a
// short blend only right at the boundary, so it reads as four moments of
// the day rather than a slow continuous drift. The activity ring itself
// stays a plain neutral track so logged blocks are what stands out there.
const NOTTE = [35, 41, 74]
const MATTINA = [201, 143, 69]
const POMERIGGIO = [70, 133, 168]
const SERA = [151, 74, 99]
const RAMP = 0.35 // hours of blend on each side of a boundary -- keeps plateaus mostly flat
const DAYPART_STOPS = [
  { h: 0, rgb: NOTTE },
  { h: 6 - RAMP, rgb: NOTTE },
  { h: 6 + RAMP, rgb: MATTINA },
  { h: 13 - RAMP, rgb: MATTINA },
  { h: 13 + RAMP, rgb: POMERIGGIO },
  { h: 18 - RAMP, rgb: POMERIGGIO },
  { h: 18 + RAMP, rgb: SERA },
  { h: 22 - RAMP, rgb: SERA },
  { h: 22 + RAMP, rgb: NOTTE },
  { h: 24, rgb: NOTTE },
]

function daypartColorAt(hour) {
  const h = ((hour % 24) + 24) % 24
  for (let i = 0; i < DAYPART_STOPS.length - 1; i++) {
    const a = DAYPART_STOPS[i]
    const b = DAYPART_STOPS[i + 1]
    if (h >= a.h && h <= b.h) {
      const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h)
      const [r, g, bl] = a.rgb.map((c, idx) => Math.round(c + (b.rgb[idx] - c) * t))
      return `rgb(${r}, ${g}, ${bl})`
    }
  }
  return `rgb(${DAYPART_STOPS[0].rgb.join(', ')})`
}

const DAYPART_SEGMENTS = 96 // 15-minute resolution -- enough to read the boundary blends as smooth
const BAND_INNER = RADIUS + STROKE / 2 + 2
const BAND_OUTER = RADIUS + STROKE / 2 + 29
const BAND_RADIUS = (BAND_INNER + BAND_OUTER) / 2
const BAND_WIDTH = BAND_OUTER - BAND_INNER
const BAND_CIRCUMFERENCE = 2 * Math.PI * BAND_RADIUS

function DaypartBand() {
  const wedges = []
  for (let i = 0; i < DAYPART_SEGMENTS; i++) {
    const startFrac = i / DAYPART_SEGMENTS
    const midHour = ((i + 0.5) / DAYPART_SEGMENTS) * 24
    const len = BAND_CIRCUMFERENCE / DAYPART_SEGMENTS + 0.6 // tiny overlap so wedges don't leave hairline seams
    wedges.push(
      <circle
        key={`daypart-${i}`}
        cx={CENTER}
        cy={CENTER}
        r={BAND_RADIUS}
        fill="none"
        stroke={daypartColorAt(midHour)}
        strokeWidth={BAND_WIDTH}
        strokeDasharray={`${len} ${BAND_CIRCUMFERENCE - len}`}
        strokeDashoffset={-(startFrac * BAND_CIRCUMFERENCE)}
      />,
    )
  }
  return <>{wedges}</>
}

function angleFor(frac) {
  return frac * 2 * Math.PI - Math.PI / 2
}

function pointAt(frac, radius) {
  const a = angleFor(frac)
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) }
}

// Ticks and numbers sit on top of the colored day-part band, so they use a
// fixed white-on-dark-outline treatment instead of the theme's text color --
// that stays legible against all four band colors, in both light and dark
// mode, instead of only against the plain app background.
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
        stroke="#fff"
        strokeWidth={isMajor ? 1.8 : 1.2}
        opacity={isMajor ? 0.9 : 0.55}
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
        fill="#fff"
        opacity={isMajor ? 1 : 0.85}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2.5"
        paintOrder="stroke"
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
      <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke="#fff" strokeWidth="4" opacity="0.9" />
      <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke="var(--danger)" strokeWidth="2" />
      <circle cx={tip.x} cy={tip.y} r="4" fill="#fff" opacity="0.9" />
      <circle cx={tip.x} cy={tip.y} r="3.5" fill="var(--danger)" />
    </>
  )
}

function captionFor(seg) {
  if (!seg) return ''
  const range = `${formatTime(seg.start)} – ${seg.isOpen ? 'ora' : formatTime(seg.end)}`
  return `${seg.name} · ${range} · ${formatDuration(seg.durationMs)}`
}

export default function DayClock({ segments, nowFrac, selectedId, onSelect }) {
  const selected = segments.find((s) => s.id === selectedId) || null

  return (
    <div className="day-clock">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="day-clock__svg" role="img" aria-label="Blocchi della giornata">
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          <DaypartBand />
        </g>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="var(--surface-2)" />
        {segments.map((seg) => {
          const isSelected = seg.id === selectedId
          // A selected slice pushes out a few px past the plain disc, like a
          // pulled pie slice, instead of just changing its own opacity.
          const r = isSelected ? RADIUS + 6 : RADIUS
          return (
            <path
              key={seg.id}
              d={wedgePath(seg.startFrac, seg.endFrac, r)}
              fill={seg.colorSlot != null ? colorVar(seg.colorSlot) : 'var(--gap)'}
              stroke="var(--bg)"
              strokeWidth="2"
              strokeLinejoin="round"
              opacity={selectedId && !isSelected ? 0.45 : 1}
              className="day-clock__segment"
              onClick={() => onSelect(isSelected ? null : seg.id)}
            />
          )
        })}
        <HourMarks />
        {nowFrac != null && <NowHand frac={nowFrac} />}
        {segments
          .filter((seg) => seg.endFrac - seg.startFrac < LABEL_MIN_FRACTION)
          .map((seg) => {
            const midFrac = (seg.startFrac + seg.endFrac) / 2
            const pt = pointAt(midFrac, RADIUS - 10)
            return <circle key={`dot-${seg.id}`} cx={pt.x} cy={pt.y} r="2.5" fill="#fff" opacity="0.85" pointerEvents="none" />
          })}
        {segments
          .filter((seg) => seg.endFrac - seg.startFrac >= LABEL_MIN_FRACTION)
          .map((seg) => {
            const midFrac = (seg.startFrac + seg.endFrac) / 2
            const pt = pointAt(midFrac, RADIUS * 0.62)
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
