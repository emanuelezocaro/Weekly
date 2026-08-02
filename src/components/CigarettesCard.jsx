const CIGARETTE_OPTIONS = [0, 5, 10, 15, 20]

export default function CigarettesCard({ count, onSet, locked }) {
  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Sigarette</h2>
      <div className="chip-row">
        {CIGARETTE_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={`chip ${count === n ? 'is-selected' : ''}`}
            onClick={() => onSet(n)}
            disabled={locked}
          >
            {n}
          </button>
        ))}
      </div>
      {count !== null && (
        <p className="field-readout">
          <strong>{count} sigarette</strong> (indicativo)
        </p>
      )}
      {locked && <p className="settings-card__hint">Non più modificabile.</p>}
    </section>
  )
}
