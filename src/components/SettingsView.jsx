import { useRef, useState } from 'react'
import { shareOrDownloadText } from '../utils/shareFile'
import { colorVar, PALETTE_SIZE } from '../utils/palette'
import { toMonthISO } from '../utils/date'
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
const REPO_URL = 'https://github.com/emanuelezocaro/Weekly'

export default function SettingsView({
  activities,
  onAdd,
  onRename,
  onDelete,
  onExport,
  onImport,
  goals,
  onSetGoal,
}) {
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

  return (
    <div className="view">
      <GoalsCard activities={activities} goals={goals} monthIso={toMonthISO(new Date())} onSetGoal={onSetGoal} />

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
        <h2 className="settings-card__title">App e codice</h2>
        <div className="link-list">
          <a href={APP_URL} target="_blank" rel="noreferrer" className="link-list__item">
            Apri l'app (URL pubblico)
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="link-list__item">
            Repository su GitHub
          </a>
        </div>
      </section>
    </div>
  )
}
