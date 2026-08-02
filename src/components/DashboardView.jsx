import { formatFullDate } from '../utils/date'
import { buildDashboardItems } from '../utils/dashboard'

const PERIOD_LABELS = { day: 'Oggi', week: 'Settimana' }

function BehindCard({ item }) {
  return (
    <div className="dash-card">
      <div className="dash-card__header">
        <span className="dash-card__swatch" style={{ background: item.swatchColor }} />
        <span className="dash-card__name">{item.label}</span>
        <span className="dash-card__period">{PERIOD_LABELS[item.period]}</span>
      </div>
      <p className="dash-card__gap">{item.gapText}</p>
      <div className="dash-card__bar-track">
        <div className="dash-card__bar-fill" style={{ width: `${item.progressPct}%` }} />
      </div>
    </div>
  )
}

function OnTrackPill({ item }) {
  return (
    <span className="dash-good-pill">
      <span className="swatch" style={{ background: item.swatchColor }} />
      {item.label} <span className="check">✓</span>
    </span>
  )
}

export default function DashboardView({ activities, entries, cigarettes, outputs, food, goals, now = new Date() }) {
  const { behind, onTrack } = buildDashboardItems({ activities, entries, cigarettes, outputs, food, goals, now })

  if (behind.length === 0 && onTrack.length === 0) {
    return (
      <div className="view">
        <p className="dash-date">{formatFullDate(now)}</p>
        <p className="empty-state">
          Imposta degli obiettivi in Impostazioni per vedere qui il tuo andamento del giorno.
        </p>
      </div>
    )
  }

  return (
    <div className="view">
      <p className="dash-date">{formatFullDate(now)}</p>

      {behind.length > 0 && (
        <>
          <div className="dash-section-title">
            <span className="dash-section-title__dot dash-section-title__dot--bad" />
            Da recuperare
          </div>
          {behind.map((item) => (
            <BehindCard key={item.key} item={item} />
          ))}
        </>
      )}

      {onTrack.length > 0 && (
        <>
          <div className="dash-section-title">
            <span className="dash-section-title__dot dash-section-title__dot--good" />
            In pace
          </div>
          <div className="dash-good-list">
            {onTrack.map((item) => (
              <OnTrackPill key={item.key} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
