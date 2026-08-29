import { useEffect, useState } from 'react'
import { buildDashboardItems } from '../utils/dashboard'
import { formatDuration, formatFullDate, toISODate } from '../utils/date'
import { RATING_COLOR, clusterFor, dayPoints } from '../utils/foodPoints'
import { colorVar } from '../utils/palette'

const TABS = [
  { id: 'behind', label: 'Recuperare' },
  { id: 'met', label: 'Successi' },
  { id: 'failed', label: 'Falliti' },
]

const EMPTY_MESSAGES = {
  behind: 'Niente da recuperare: sei in pace su tutta la linea.',
  met: 'Ancora nessun obiettivo raggiunto per ora.',
  failed: 'Nessun obiettivo fallito questa settimana.',
}

// "Vantaggio"/"Margine" sono buone notizie (sei avanti, hai ancora spazio),
// "Manca"/"Sforo"/"Mancavano" sono cattive notizie (ti serve qualcosa in
// più, o hai già sforato).
const POSITIVE_DIFF_LABELS = new Set(['Vantaggio', 'Margine'])

function StatsRow({ item }) {
  const diffClass = POSITIVE_DIFF_LABELS.has(item.diffStatLabel) ? 'is-good' : 'is-bad'
  return (
    <div className="dash-card__stats">
      <div className={`dash-card__stat dash-card__stat--diff ${diffClass}`}>
        <span className="dash-card__stat-label">{item.diffStatLabel}</span>
        <span className="dash-card__stat-value">{item.diffLabel}</span>
      </div>
      <div className="dash-card__stat dash-card__stat--main">
        <span className="dash-card__stat-label">Come sto</span>
        <span className="dash-card__stat-value">{item.actualLabel}</span>
      </div>
      <div className="dash-card__stat">
        <span className="dash-card__stat-label">Obiettivo</span>
        <span className="dash-card__stat-value">{item.targetLabel}</span>
      </div>
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`dash-card__chevron ${open ? 'is-open' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// Le card partono compatte (nome + valore chiave + barra) e si espandono al
// tap per mostrare le 3 statistiche complete -- con più obiettivi attivi la
// vista compatta si scorre molto più in fretta di 3 numeri ripetuti su ogni
// card.
function CardBody({ item, badge, showBar }) {
  const [expanded, setExpanded] = useState(false)
  const diffClass = POSITIVE_DIFF_LABELS.has(item.diffStatLabel) ? 'is-good' : 'is-bad'
  return (
    <>
      <button
        type="button"
        className="dash-card__header dash-card__header--btn"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="dash-card__swatch" style={{ background: item.swatchColor }} />
        <span className="dash-card__name">{item.label}</span>
        {badge}
        <span className={`dash-card__key ${diffClass}`}>{item.diffLabel}</span>
        <ChevronIcon open={expanded} />
      </button>
      {showBar && (
        <div className="dash-card__bar-track">
          <div className="dash-card__bar-fill" style={{ width: `${item.progressPct}%` }} />
        </div>
      )}
      {expanded && <StatsRow item={item} />}
    </>
  )
}

function BehindCard({ item }) {
  return (
    <div className="dash-card">
      <CardBody item={item} showBar />
    </div>
  )
}

function FailedCard({ item }) {
  return (
    <div className="dash-card dash-card--failed">
      <CardBody item={item} badge={<span className="dash-card__period">Fallito</span>} />
    </div>
  )
}

function MetCard({ item }) {
  return (
    <div className="dash-card dash-card--met">
      <CardBody item={item} />
    </div>
  )
}

const CARD_BY_TAB = { behind: BehindCard, met: MetCard, failed: FailedCard }

// A tile per tracked thing with today's raw value -- unlike il resto della
// Dash (pacing sulla settimana verso un obiettivo), qui non serve nessun
// obiettivo impostato: mostra sempre cosa è stato segnato oggi, o un
// trattino se ancora niente.
function buildTodayTiles({ activities, durations, checklist, cigarettes, outputs, food, now }) {
  const todayIso = toISODate(now)
  const tiles = []

  for (const activity of activities) {
    const color = colorVar(activity.colorSlot)
    if (activity.mode === 'checklist') {
      const done = checklist.some((c) => c.activityId === activity.id && c.date === todayIso)
      tiles.push({ key: activity.id, label: activity.name, color, value: done ? '✓ Fatto' : '—', muted: !done })
    } else {
      const minutes = durations
        .filter((d) => d.activityId === activity.id && d.date === todayIso)
        .reduce((sum, d) => sum + d.minutes, 0)
      tiles.push({
        key: activity.id,
        label: activity.name,
        color,
        value: minutes > 0 ? formatDuration(minutes * 60000) : '—',
        muted: minutes === 0,
      })
    }
  }

  const cigToday = cigarettes.find((c) => c.date === todayIso)
  tiles.push({
    key: 'cigarettes',
    label: 'Sigarette',
    color: 'var(--series-6)',
    value: cigToday ? String(cigToday.count) : '—',
    muted: !cigToday,
  })

  const outputsToday = outputs.filter((o) => o.date === todayIso).length
  tiles.push({
    key: 'outputs',
    label: 'Uscite',
    color: 'var(--accent)',
    value: outputsToday > 0 ? String(outputsToday) : '—',
    muted: outputsToday === 0,
  })

  const foodToday = food.find((f) => f.date === todayIso)
  const points = dayPoints(foodToday)
  const cluster = points === null ? null : clusterFor(points)
  tiles.push({
    key: 'food',
    label: 'Cibo',
    color: cluster ? RATING_COLOR[cluster.key] : 'var(--text-muted)',
    value: points === null ? '—' : String(points),
    unit: points === null ? null : '/ 12 punti',
    colorValue: points !== null,
    muted: points === null,
  })

  return tiles
}

function TodayStrip({ tiles }) {
  return (
    <>
      <p className="today-head">Oggi</p>
      <div className="today-row">
        {tiles.map((t) => (
          <div key={t.key} className="today-tile">
            <span className="today-tile__label">
              <span className="today-tile__dot" style={{ background: t.color }} />
              {t.label}
            </span>
            <span className={`today-tile__value ${t.muted ? 'is-muted' : ''}`} style={t.colorValue ? { color: t.color } : undefined}>
              {t.value}
              {t.unit && <span className="today-tile__unit"> {t.unit}</span>}
            </span>
          </div>
        ))}
      </div>
      <hr className="report-divider" />
    </>
  )
}

export default function DashboardView({
  activities,
  durations,
  checklist,
  cigarettes,
  outputs,
  food,
  goals,
  now: nowProp,
  onPeriodLabel,
}) {
  // `now` defaults to "the moment this view first mounted" rather than a
  // fresh `new Date()` on every render -- a new Date object every render
  // would change on every render, which the effect below depends on, which
  // would set off an infinite render loop (component re-renders -> new
  // `now` -> effect re-fires -> setState in the parent -> re-render -> ...).
  const [defaultNow] = useState(() => new Date())
  const now = nowProp ?? defaultNow
  const { behind, failed, onTrack } = buildDashboardItems({
    activities,
    durations,
    checklist,
    cigarettes,
    outputs,
    food,
    goals,
    now,
  })
  const [tab, setTab] = useState('behind')

  useEffect(() => {
    if (!onPeriodLabel) return
    onPeriodLabel({ label: `Today · ${formatFullDate(now)}` })
    return () => onPeriodLabel(null)
  }, [now, onPeriodLabel])

  const todayTiles = buildTodayTiles({ activities, durations, checklist, cigarettes, outputs, food, now })

  if (behind.length === 0 && failed.length === 0 && onTrack.length === 0) {
    return (
      <div className="view">
        <TodayStrip tiles={todayTiles} />
        <p className="empty-state">
          Imposta degli obiettivi in Impostazioni per vedere qui il tuo andamento della settimana.
        </p>
      </div>
    )
  }

  const itemsByTab = { behind, met: onTrack, failed }
  const activeItems = itemsByTab[tab]
  const Card = CARD_BY_TAB[tab]

  return (
    <div className="view">
      <TodayStrip tiles={todayTiles} />
      <div className="segmented-wrap">
        <div className="segmented">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`segmented__item ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeItems.length === 0 ? (
        <p className="empty-state">{EMPTY_MESSAGES[tab]}</p>
      ) : (
        activeItems.map((item) => <Card key={item.key} item={item} />)
      )}
    </div>
  )
}
