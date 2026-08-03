import { useEffect, useState } from 'react'
import { buildDashboardItems, dashboardMotivation } from '../utils/dashboard'
import { shouldShowBackupReminder } from '../utils/backupReminder'
import { formatFullDate } from '../utils/date'

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
      <div className="dash-card__stat">
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

function MonthReminder({ onOpenSettings }) {
  return (
    <div className="dash-reminder">
      <span>È il primo del mese: rivedi e aggiorna i tuoi obiettivi.</span>
      <button type="button" className="text-btn" onClick={onOpenSettings}>
        Vai a Impostazioni
      </button>
    </div>
  )
}

function BackupReminder({ onOpenSettings }) {
  return (
    <div className="dash-reminder dash-reminder--danger">
      <span>Non fai un backup da un po': esportalo per non rischiare di perdere i dati.</span>
      <button type="button" className="text-btn" onClick={() => onOpenSettings('setup')}>
        Vai a Setup
      </button>
    </div>
  )
}

export default function DashboardView({
  activities,
  entries,
  cigarettes,
  outputs,
  food,
  goals,
  now = new Date(),
  onOpenSettings,
  onPeriodLabel,
}) {
  const { behind, failed, onTrack } = buildDashboardItems({ activities, entries, cigarettes, outputs, food, goals, now })
  const [tab, setTab] = useState('behind')
  const isFirstOfMonth = now.getDate() === 1
  const showBackupReminder = activities.length > 0 && shouldShowBackupReminder(now)

  useEffect(() => {
    if (!onPeriodLabel) return
    onPeriodLabel(`Today · ${formatFullDate(now)}`)
    return () => onPeriodLabel(null)
  }, [now, onPeriodLabel])

  if (behind.length === 0 && failed.length === 0 && onTrack.length === 0) {
    return (
      <div className="view">
        {isFirstOfMonth && <MonthReminder onOpenSettings={onOpenSettings} />}
        {showBackupReminder && <BackupReminder onOpenSettings={onOpenSettings} />}
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
      {isFirstOfMonth && <MonthReminder onOpenSettings={onOpenSettings} />}
      {showBackupReminder && <BackupReminder onOpenSettings={onOpenSettings} />}
      <p className="dash-motivation">{dashboardMotivation({ behind, failed, onTrack })}</p>

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
