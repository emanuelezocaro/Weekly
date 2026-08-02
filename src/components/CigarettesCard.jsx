const CIGARETTE_OPTIONS = [0, 5, 10, 15, 20]

export default function CigarettesCard({ count, onSet }) {
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
    </section>
  )
}
