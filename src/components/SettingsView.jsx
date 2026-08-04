import { useRef, useState } from 'react'
import { copyOrShareText, shareOrDownloadText } from '../utils/shareFile'
import { colorVar, PALETTE_SIZE } from '../utils/palette'
import { toMonthISO } from '../utils/date'
import { markBackupDone } from '../utils/backupReminder'
import GoalsCard from './GoalsCard'

function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      {Array.from({ length: PALETTE_SIZE }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`color-picker__swatch ${value === i ? 'is-selected' : ''}`}
          style={{ background: colorVar(i) }}
          aria-label={`Colore ${i + 1}`}
          onClick={() => onChange(i)}
        />
      ))}
    </div>
  )
}

const APP_URL = 'https://emanuelezocaro.github.io/Weekly/'

const COPY_LINK_MESSAGES = {
  copied: 'Copiato ✓',
  shared: 'Condiviso ✓',
  downloaded: 'Scaricato ✓',
  cancelled: '',
}

function CopyRow({ label, value }) {
  const [message, setMessage] = useState('')

  async function handleCopy() {
    const result = await copyOrShareText(value)
    setMessage(COPY_LINK_MESSAGES[result] ?? '')
    if (result !== 'failed') setTimeout(() => setMessage(''), 2000)
  }

  return (
    <div className="copy-row">
      <div className="copy-row__text">
        <span className="copy-row__label">{label}</span>
        <code className="copy-row__value">{value}</code>
      </div>
      <button type="button" className="text-btn" onClick={handleCopy}>
        {message || 'Copia'}
      </button>
    </div>
  )
}

const SETTINGS_TABS = [
  { id: 'goals', label: 'Obiettivi' },
  { id: 'activities', label: 'Attività' },
  { id: 'setup', label: 'Setup' },
]

export default function SettingsView({
  activities,
  onAdd,
  onRename,
  onDelete,
  onExport,
  onImport,
  goals,
  onSetGoal,
  initialTab,
}) {
  const [tab, setTab] = useState(initialTab || 'goals')
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [colorSlot, setColorSlot] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColorSlot, setEditColorSlot] = useState(0)
  const [backupMessage, setBackupMessage] = useState('')
  const fileInputRef = useRef(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name, colorSlot)
    setName('')
    setColorSlot((s) => (s + 1) % PALETTE_SIZE)
    setAddOpen(false)
  }

  function handleCancelAdd() {
    setAddOpen(false)
    setName('')
  }

  function startEdit(activity) {
    setEditingId(activity.id)
    setEditName(activity.name)
    setEditColorSlot(activity.colorSlot)
  }

  function saveEdit(id) {
    onRename(id, editName, editColorSlot)
    setEditingId(null)
  }

  async function handleExport() {
    const today = new Date().toISOString().slice(0, 10)
    const shared = await shareOrDownloadText(`weekly-backup-${today}.json`, onExport())
    if (shared) markBackupDone()
    setBackupMessage(shared ? 'Backup esportato ✓' : '')
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        onImport(String(reader.result))
        setBackupMessage('Backup importato ✓')
      } catch {
        setBackupMessage('File di backup non valido')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="view">
      <div className="segmented-sticky-wrap">
        <div className="segmented">
          {SETTINGS_TABS.map((t) => (
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

      {tab === 'goals' && (
        <GoalsCard activities={activities} goals={goals} monthIso={toMonthISO(new Date())} onSetGoal={onSetGoal} />
      )}

      {tab === 'activities' && (
        <section className="settings-card">
          <h2 className="settings-card__title">Nuova attività</h2>
          {!addOpen ? (
            <button type="button" className="add-activity__toggle" onClick={() => setAddOpen(true)}>
              <span className="add-activity__toggle-icon">+</span>
              Aggiungi attività
            </button>
          ) : (
            <form className="add-activity" onSubmit={handleAdd}>
              <div className="add-activity__row">
                <input
                  type="text"
                  placeholder="Nuova attività (es. Meditazione)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <ColorPicker value={colorSlot} onChange={setColorSlot} />
              <div className="add-activity__actions">
                <button type="submit">Salva</button>
                <button type="button" onClick={handleCancelAdd}>
                  Annulla
                </button>
              </div>
            </form>
          )}

          <ul className="activity-manage-list">
            {activities.map((activity) => (
              <li key={activity.id} className="activity-manage-row">
                {editingId === activity.id ? (
                  <div className="activity-manage-row__edit">
                    <div className="add-activity__row">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <button type="button" onClick={() => saveEdit(activity.id)}>
                        Salva
                      </button>
                    </div>
                    <ColorPicker value={editColorSlot} onChange={setEditColorSlot} />
                  </div>
                ) : (
                  <>
                    <span
                      className="activity-manage-row__swatch"
                      style={{ background: colorVar(activity.colorSlot) }}
                    />
                    <span className="activity-manage-row__name">{activity.name}</span>
                    <div className="activity-manage-row__actions">
                      <button type="button" className="text-btn" onClick={() => startEdit(activity)}>
                        Modifica
                      </button>
                      <button
                        type="button"
                        className="text-btn text-btn--danger"
                        onClick={() => {
                          if (confirm(`Eliminare "${activity.name}"? Verrà rimosso anche lo storico.`)) {
                            onDelete(activity.id)
                          }
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'setup' && (
        <>
          <section className="settings-card">
            <h2 className="settings-card__title">Backup</h2>
            <p className="settings-card__hint">
              Esporta un file con tutte le tue attività e lo storico, da tenere come copia di sicurezza
              e da usare per riportare i dati su un nuovo telefono.
            </p>
            <div className="backup-card__actions">
              <button type="button" onClick={handleExport}>
                Esporta backup
              </button>
              <button type="button" className="backup-card__secondary" onClick={handleImportClick}>
                Importa backup
              </button>
            </div>
            {backupMessage && <p className="backup-card__message">{backupMessage}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              hidden
            />
          </section>

          <section className="settings-card">
            <h2 className="settings-card__title">Se cambi telefono</h2>
            <ol className="setup-steps">
              <li>Sul telefono vecchio tocca "Esporta backup" qui sopra e invia il file al telefono nuovo (email, WhatsApp, Drive...).</li>
              <li>Sul telefono nuovo apri il link dell'app qui sotto e aggiungila alla schermata Home.</li>
              <li>Vai su Impostazioni → Setup, tocca "Importa backup" e scegli il file ricevuto.</li>
            </ol>
            <div className="copy-row-list">
              <CopyRow label="URL dell'app" value={APP_URL} />
            </div>
          </section>

          <section className="settings-card settings-card--warning">
            <h2 className="settings-card__title">⚠️ Attenzione su iPhone</h2>
            <p className="settings-card__hint">
              Se cancelli l'icona dell'app dalla schermata Home e poi la aggiungi di nuovo (es. per
              aggiornare l'icona), iOS crea una copia completamente nuova e <strong>cancella tutti i
              dati salvati</strong>. Prima di cancellare l'icona, fai sempre "Esporta backup" qui sopra.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
