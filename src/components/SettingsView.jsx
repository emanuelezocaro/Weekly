import { useRef, useState } from 'react'
import { copyOrShareText, shareOrDownloadText } from '../utils/shareFile'
import { colorVar, PALETTE_SIZE } from '../utils/palette'
import { toMonthISO } from '../utils/date'
import { markBackupDone } from '../utils/backupReminder'
import GoalsCard from './GoalsCard'

const MODE_OPTIONS = [
  { id: 'time', label: 'A tempo' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'rating', label: 'Bad/Medio/Buono' },
]

function modeLabel(mode) {
  return MODE_OPTIONS.find((m) => m.id === mode)?.label ?? 'A tempo'
}

function ModeChoice({ value, onChange }) {
  return (
    <div className="choice choice--full" role="radiogroup" aria-label="Tipo">
      {MODE_OPTIONS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          className={`choice__opt is-neutral ${value === m.id ? 'is-selected' : ''}`}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

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
    <div className="list-row">
      <span className="list-row__label">
        <span className="list-row__text">
          <span className="list-row__meta">{label}</span>
          <code className="copy-row__value">{value}</code>
        </span>
      </span>
      <button type="button" className="row-btn" onClick={handleCopy}>
        {message || 'Copia'}
      </button>
    </div>
  )
}

// Inline editor for a new or existing activity -- opens in place of the row.
function ActivityEditor({ name, onName, mode, onMode, colorSlot, onColor, onSave, onCancel, onDelete }) {
  return (
    <form
      className="list-item activity-editor"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <input
        className="field-input"
        type="text"
        placeholder="Nome (es. Meditazione)"
        value={name}
        onChange={(e) => onName(e.target.value)}
        autoFocus
      />
      <ModeChoice value={mode} onChange={onMode} />
      <ColorPicker value={colorSlot} onChange={onColor} />
      <div className="activity-editor__actions">
        {onDelete && (
          <button type="button" className="row-btn is-danger" onClick={onDelete}>
            Elimina
          </button>
        )}
        <button type="button" className="row-btn is-muted" onClick={onCancel}>
          Annulla
        </button>
        <button type="submit" className="row-btn is-primary">
          Salva
        </button>
      </div>
    </form>
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
  onSetMode,
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
  const [mode, setMode] = useState('time')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColorSlot, setEditColorSlot] = useState(0)
  const [editMode, setEditMode] = useState('time')
  const [backupMessage, setBackupMessage] = useState('')
  const fileInputRef = useRef(null)

  function handleAdd() {
    if (!name.trim()) return
    onAdd(name, colorSlot, mode)
    setName('')
    setColorSlot((s) => (s + 1) % PALETTE_SIZE)
    setMode('time')
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
    setEditMode(activity.mode)
  }

  function saveEdit(id) {
    onRename(id, editName, editColorSlot)
    if (editMode !== activities.find((a) => a.id === id)?.mode) onSetMode(id, editMode)
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
    <div className="view list-view">
      <div className="segmented-wrap">
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
        <section className="list-section">
          <h2 className="list-section__title">Le tue attività</h2>
          <div className="list-card">
            {activities.map((activity) =>
              editingId === activity.id ? (
                <ActivityEditor
                  key={activity.id}
                  name={editName}
                  onName={setEditName}
                  mode={editMode}
                  onMode={setEditMode}
                  colorSlot={editColorSlot}
                  onColor={setEditColorSlot}
                  onSave={() => saveEdit(activity.id)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => {
                    if (confirm(`Eliminare "${activity.name}"? Verrà rimosso anche lo storico.`)) {
                      onDelete(activity.id)
                      setEditingId(null)
                    }
                  }}
                />
              ) : (
                <button
                  key={activity.id}
                  type="button"
                  className="list-row report-row"
                  onClick={() => startEdit(activity)}
                >
                  <span className="list-row__label">
                    <span className="list-row__dot" style={{ background: colorVar(activity.colorSlot) }} />
                    <span className="list-row__name">{activity.name}</span>
                  </span>
                  <span className="report-row__unit">{modeLabel(activity.mode)}</span>
                  <span className="report-row__chevron" aria-hidden="true" />
                </button>
              ),
            )}
            {addOpen ? (
              <ActivityEditor
                name={name}
                onName={setName}
                mode={mode}
                onMode={setMode}
                colorSlot={colorSlot}
                onColor={setColorSlot}
                onSave={handleAdd}
                onCancel={handleCancelAdd}
              />
            ) : (
              <button type="button" className="list-row list-action" onClick={() => setAddOpen(true)}>
                + Aggiungi attività
              </button>
            )}
          </div>
        </section>
      )}

      {tab === 'setup' && (
        <>
          <section className="list-section">
            <h2 className="list-section__title">Backup</h2>
            <div className="list-card">
              <button type="button" className="list-row list-action" onClick={handleExport}>
                Esporta backup
              </button>
              <button type="button" className="list-row list-action is-secondary" onClick={handleImportClick}>
                Importa backup
              </button>
            </div>
            <p className="list-section__hint">
              {backupMessage ||
                'Un file con tutte le attività e lo storico: copia di sicurezza, e il modo per portare i dati su un nuovo telefono.'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              hidden
            />
          </section>

          <section className="list-section">
            <h2 className="list-section__title">Se cambi telefono</h2>
            <div className="list-card">
              <div className="list-item list-item--text">
                <ol className="setup-steps">
                  <li>Sul telefono vecchio tocca "Esporta backup" qui sopra e invia il file al telefono nuovo (email, WhatsApp, Drive...).</li>
                  <li>Sul telefono nuovo apri il link dell'app qui sotto e aggiungila alla schermata Home.</li>
                  <li>Vai su Set → Setup, tocca "Importa backup" e scegli il file ricevuto.</li>
                </ol>
              </div>
              <CopyRow label="URL dell'app" value={APP_URL} />
            </div>
          </section>

          <section className="list-section">
            <h2 className="list-section__title is-danger">Attenzione su iPhone</h2>
            <div className="list-card">
              <p className="list-item list-item--text">
                Se cancelli l'icona dell'app dalla schermata Home e poi la aggiungi di nuovo, iOS crea una copia
                nuova e <strong>cancella tutti i dati salvati</strong>. Prima di cancellare l'icona, fai sempre
                "Esporta backup".
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
