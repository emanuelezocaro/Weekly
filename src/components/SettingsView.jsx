import { useRef, useState } from 'react'
import { shareOrDownloadText } from '../utils/shareFile'
import { colorVar } from '../utils/palette'

const EMOJI_CHOICES = ['✅', '📖', '🏃', '🇬🇧', '💼', '🧘', '🎸', '💧', '🥗', '😴', '💻', '🎨']

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
  onReorder,
  onExport,
  onImport,
  settings,
  setSettings,
  syncStatus,
  onSyncNow,
  notifications,
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const [sheetUrlDraft, setSheetUrlDraft] = useState(settings.sheetUrl)
  const [tokenDraft, setTokenDraft] = useState(settings.token)
  const fileInputRef = useRef(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name, emoji)
    setName('')
    setEmoji(EMOJI_CHOICES[0])
  }

  function startEdit(activity) {
    setEditingId(activity.id)
    setEditName(activity.name)
    setEditEmoji(activity.emoji)
  }

  function saveEdit(id) {
    onRename(id, editName, editEmoji)
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
          <div className="add-activity__emoji-picker">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                className={`emoji-choice ${emoji === e ? 'is-selected' : ''}`}
                onClick={() => setEmoji(e)}
                aria-label={`Scegli emoji ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="add-activity__row">
            <input
              type="text"
              placeholder="Nuova attività (es. Meditazione)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit">Aggiungi</button>
          </div>
        </form>

        <ul className="activity-manage-list">
          {activities.map((activity, index) => (
            <li key={activity.id} className="activity-manage-row">
              {editingId === activity.id ? (
                <>
                  <div className="add-activity__emoji-picker">
                    {EMOJI_CHOICES.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className={`emoji-choice ${editEmoji === e ? 'is-selected' : ''}`}
                        onClick={() => setEditEmoji(e)}
                        aria-label={`Scegli emoji ${e}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
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
                </>
              ) : (
                <>
                  <span
                    className="activity-manage-row__swatch"
                    style={{ background: colorVar(activity.colorSlot) }}
                  />
                  <span className="activity-manage-row__emoji" aria-hidden="true">
                    {activity.emoji}
                  </span>
                  <span className="activity-manage-row__name">{activity.name}</span>
                  <div className="activity-manage-row__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onReorder(index, index - 1)}
                      disabled={index === 0}
                      aria-label="Sposta su"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onReorder(index, index + 1)}
                      disabled={index === activities.length - 1}
                      aria-label="Sposta giù"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => startEdit(activity)}
                      aria-label="Modifica"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => {
                        if (confirm(`Eliminare "${activity.name}"? Verrà rimosso anche lo storico.`)) {
                          onDelete(activity.id)
                        }
                      }}
                      aria-label="Elimina"
                    >
                      🗑
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
        <h2 className="settings-card__title">Notifiche</h2>
        <p className="settings-card__hint">
          Promemoria giornaliero mentre l'app è aperta o poco dopo. Su iPhone le notifiche in vero
          background richiedono un server push dedicato: qui riceverai il promemoria quando apri
          l'app intorno all'orario scelto.
        </p>
        {!notifications.supported ? (
          <p className="settings-card__hint">Le notifiche non sono supportate su questo dispositivo/browser.</p>
        ) : (
          <div className="settings-form">
            <label className="settings-form__field settings-form__field--row">
              <span>Promemoria attivo</span>
              <input
                type="checkbox"
                checked={settings.notifEnabled}
                onChange={async (e) => {
                  const checked = e.target.checked
                  if (checked && notifications.permission !== 'granted') {
                    const result = await notifications.requestPermission()
                    if (result !== 'granted') return
                  }
                  setSettings({ notifEnabled: checked })
                }}
              />
            </label>
            <label className="settings-form__field">
              <span>Orario</span>
              <input
                type="time"
                value={settings.notifTime}
                onChange={(e) => setSettings({ notifTime: e.target.value })}
              />
            </label>
          </div>
        )}
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
