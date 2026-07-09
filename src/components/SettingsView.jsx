import { useRef, useState } from 'react'
import { shareOrDownloadText } from '../utils/shareFile'
import { colorVar, PALETTE_SIZE } from '../utils/palette'

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

const SYNC_LABELS = {
  idle: 'Non ancora sincronizzato',
  syncing: 'Sincronizzazione…',
  synced: 'Sincronizzato',
  error: 'Errore di sincronizzazione',
}

function formatSyncTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SettingsView({
  activities,
  onAdd,
  onRename,
  onDelete,
  onExport,
  onImport,
  settings,
  setSettings,
  syncStatus,
  onSyncNow,
}) {
  const [name, setName] = useState('')
  const [colorSlot, setColorSlot] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColorSlot, setEditColorSlot] = useState(0)
  const [backupMessage, setBackupMessage] = useState('')
  const [sheetUrlDraft, setSheetUrlDraft] = useState(settings.sheetUrl)
  const [tokenDraft, setTokenDraft] = useState(settings.token)
  const fileInputRef = useRef(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name, colorSlot)
    setName('')
    setColorSlot((s) => (s + 1) % 8)
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

  function saveSyncSettings(e) {
    e.preventDefault()
    setSettings({ sheetUrl: sheetUrlDraft.trim(), token: tokenDraft.trim() })
  }

  return (
    <div className="view">
      <section className="settings-card">
        <h2 className="settings-card__title">Nuova attività</h2>
        <form className="add-activity" onSubmit={handleAdd}>
          <div className="add-activity__row">
            <input
              type="text"
              placeholder="Nuova attività (es. Meditazione)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit">Aggiungi</button>
          </div>
          <ColorPicker value={colorSlot} onChange={setColorSlot} />
        </form>

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

      <section className="settings-card">
        <h2 className="settings-card__title">Sincronizzazione Google Sheet</h2>
        <p className="settings-card__hint">
          Incolla qui l'URL del tuo Google Apps Script Web App (vedi istruzioni in{' '}
          <code>google-apps-script/README.md</code>) e un token a tua scelta: i dati verranno
          salvati sul tuo Google Sheet e disponibili su ogni dispositivo.
        </p>
        <form className="settings-form" onSubmit={saveSyncSettings}>
          <label className="settings-form__field">
            <span>URL Web App</span>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={sheetUrlDraft}
              onChange={(e) => setSheetUrlDraft(e.target.value)}
            />
          </label>
          <label className="settings-form__field">
            <span>Token</span>
            <input
              type="text"
              placeholder="una password a tua scelta"
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
            />
          </label>
          <button type="submit">Salva</button>
        </form>
        {settings.sheetUrl && (
          <div className="sync-status">
            <span className={`sync-status__dot sync-status__dot--${syncStatus.state}`} />
            <span>{SYNC_LABELS[syncStatus.state] || syncStatus.state}</span>
            {syncStatus.lastSyncedAt && (
              <span className="sync-status__time">{formatSyncTime(syncStatus.lastSyncedAt)}</span>
            )}
            <button type="button" className="backup-card__secondary" onClick={onSyncNow}>
              Sincronizza ora
            </button>
          </div>
        )}
        {syncStatus.state === 'error' && <p className="settings-card__error">{syncStatus.error}</p>}
      </section>

      <section className="settings-card">
        <h2 className="settings-card__title">Backup manuale</h2>
        <p className="settings-card__hint">
          Esporta un file con tutte le tue attività e lo storico come rete di sicurezza extra oltre
          al Google Sheet.
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
    </div>
  )
}
