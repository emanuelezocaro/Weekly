const RATING_OPTIONS = [
  { value: 'bad', label: 'Bad', cls: 'sel-bad' },
  { value: 'mid', label: 'Medium', cls: 'sel-mid' },
  { value: 'good', label: 'Good', cls: 'sel-good' },
]

const EXTRA_OPTIONS = [
  { value: 'yes', label: 'Yes', cls: 'sel-yes' },
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
      <h2 className="settings-card__title">Food</h2>
      <RatingRow
        label="Breakfast"
        value={colazione}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('colazione', v)}
        locked={locked}
      />
      <RatingRow
        label="Lunch"
        value={pranzo}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('pranzo', v)}
        locked={locked}
      />
      <RatingRow
        label="Dinner"
        value={cena}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('cena', v)}
        locked={locked}
      />
      <RatingRow
        label="Alcohol"
        value={alcol}
        options={RATING_OPTIONS}
        onChange={(v) => onChange('alcol', v)}
        locked={locked}
      />
      <RatingRow
        label="Sweets"
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
      {locked && <p className="settings-card__hint">No longer editable.</p>}
    </section>
  )
}
