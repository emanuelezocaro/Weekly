import { useState } from 'react'
import { formatFullDate } from '../utils/date'
import { buildDashboardItems } from '../utils/dashboard'

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

function StatsRow({ item }) {
  return (
    <div className="dash-card__stats">
      <div className="dash-card__stat">
        <span className="dash-card__stat-label">Obiettivo</span>
        <span className="dash-card__stat-value">{item.targetLabel}</span>
      </div>
      <div className="dash-card__stat">
        <span className="dash-card__stat-label">Come sto</span>
        <span className="dash-card__stat-value">{item.actualLabel}</span>
      </div>
      <div className="dash-card__stat">
        <span className="dash-card__stat-label">Manca/Sforo</span>
        <span className="dash-card__stat-value">{item.diffLabel}</span>
      </div>
    </div>
  )
}

function BehindCard({ item }) {
  return (
    <div className="dash-card">
      <div className="dash-card__header">
        <span className="dash-card__swatch" style={{ background: item.swatchColor }} />
        <span className="dash-card__name">{item.label}</span>
      </div>
      <StatsRow item={item} />
      <div className="dash-card__bar-track">
        <div className="dash-card__bar-fill" style={{ width: `${item.progressPct}%` }} />
      </div>
    </div>
  )
}

function FailedCard({ item }) {
  return (
    <div className="dash-card dash-card--failed">
      <div className="dash-card__header">
        <span className="dash-card__swatch" style={{ background: item.swatchColor }} />
        <span className="dash-card__name">{item.label}</span>
        <span className="dash-card__period">Fallito</span>
      </div>
      <StatsRow item={item} />
    </div>
  )
}

function MetCard({ item }) {
  return (
    <div className="dash-card dash-card--met">
      <div className="dash-card__header">
        <span className="dash-card__swatch" style={{ background: item.swatchColor }} />
        <span className="dash-card__name">{item.label}</span>
      </div>
      <StatsRow item={item} />
    </div>
  )
}

const CARD_BY_TAB = { behind: BehindCard, met: MetCard, failed: FailedCard }

export default function DashboardView({ activities, entries, cigarettes, outputs, food, goals, now = new Date() }) {
  const { behind, failed, onTrack } = buildDashboardItems({ activities, entries, cigarettes, outputs, food, goals, now })
  const [tab, setTab] = useState('behind')

  if (behind.length === 0 && failed.length === 0 && onTrack.length === 0) {
    return (
      <div className="view">
        <p className="dash-date">{formatFullDate(now)}</p>
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
      <p className="dash-date">{formatFullDate(now)}</p>

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

      {activeItems.length === 0 ? (
        <p className="empty-state">{EMPTY_MESSAGES[tab]}</p>
      ) : (
        activeItems.map((item) => <Card key={item.key} item={item} />)
      )}
    </div>
  )
}
