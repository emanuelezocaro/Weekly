import { useState } from 'react'

// One freeform note per day, editable in place -- unlike Uscite (a growing
// list), writing again just replaces the same day's note.
export default function DiaryCard({ text: savedText, onSave, locked }) {
  const [text, setText] = useState(savedText)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    onSave(text)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Diary</h2>
      {!locked ? (
        <form
          className="outputs-add-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <textarea
            placeholder="Com'è andata oggi?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
          />
          <button type="submit" disabled={text === savedText}>
            Salva
          </button>
        </form>
      ) : (
        <>
          <p className="diary-note">{text}</p>
          <p className="settings-card__hint">Non più modificabile.</p>
        </>
      )}
      {saved && <p className="backup-card__message">Salvato ✓</p>}
      <p className="settings-card__hint">
        - Cosa è partito da me oggi? (l'ho iniziato io, nessuno me l'aveva chiesto)
        <br />
        - Cosa ho fatto solo perché è arrivato da fuori? (mail, telefonate, richieste degli altri)
        <br />
        - Cosa ho rimandato, e perché?
        <br />
        <br />
        Chiudi sempre con una riga:
        <br />
        SCALPELLO DI DOMANI → la cosa che riprende in mano la giornata. Una sola. Poi mettila
        subito in calendario con lo slot.
      </p>
    </section>
  )
}
