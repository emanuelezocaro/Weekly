const RATING_OPTIONS = [
  { value: 'bad', label: 'Male', cls: 'sel-bad' },
  { value: 'mid', label: 'Medio', cls: 'sel-mid' },
  { value: 'good', label: 'Buono', cls: 'sel-good' },
]

const EXTRA_OPTIONS = [
  { value: 'yes', label: 'Sì', cls: 'sel-yes' },
  { value: 'no', label: 'No', cls: 'sel-no' },
]

function RatingRow({ label, value, options, onChange, locked }) {
  return (
    <div className="rating-field">
      <span className="rating-field__label">{label}</span>
      <div className="rating-seg">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${opt.cls} ${value === opt.value ? 'is-selected' : ''}`}
            onClick={() => onChange(opt.value)}
            disabled={locked}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FoodCard({ food, onChange, locked }) {
  const {
    colazione = null,
    pranzo = null,
    cena = null,
    alcol = null,
    dolci = null,
    extra = null,
  } = food || {}
  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Alimentazione</h2>
      <RatingRow
        label="Colazione"
        value={colazione}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('colazione', v)}
        locked={locked}
      />
      <RatingRow
        label="Pranzo"
        value={pranzo}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('pranzo', v)}
        locked={locked}
      />
      <RatingRow
        label="Cena"
        value={cena}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('cena', v)}
        locked={locked}
      />
      <RatingRow
        label="Alcol"
        value={alcol}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('alcol', v)}
        locked={locked}
      />
      <RatingRow
        label="Dolci"
        value={dolci}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('dolci', v)}
        locked={locked}
      />
      <RatingRow
        label="Extra"
        value={extra}
        options={EXTRA_OPTIONS}
        onChange={(v) => onChange('extra', v)}
        locked={locked}
      />
      {locked && <p className="settings-card__hint">Non più modificabile.</p>}
    </section>
  )
}
