// The diary is written elsewhere (carta, altra app) -- qui si segna solo se
// quel giorno è stato scritto o no, stesso done/not-done di un'attività a
// checklist.
export default function DiaryCard({ done, onToggle, locked }) {
  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Diary</h2>
      <button
        type="button"
        className={`day-activity-row day-activity-row--checklist ${done ? 'is-done' : ''}`}
        onClick={onToggle}
        disabled={locked}
      >
        <span className="day-activity-row__header">
          <span className="day-activity-row__name">Diario scritto oggi</span>
          <span className="day-activity-row__check-state">{done ? 'Fatto ✓' : 'Non fatto'}</span>
        </span>
      </button>
      {locked && <p className="settings-card__hint">Non più modificabile.</p>}
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
