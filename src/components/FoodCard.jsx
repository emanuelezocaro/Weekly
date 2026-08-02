const RATING_OPTIONS = [
  { value: 'bad', label: 'Male', cls: 'sel-bad' },
  { value: 'mid', label: 'Medio', cls: 'sel-mid' },
  { value: 'good', label: 'Buono', cls: 'sel-good' },
]

const EXTRA_OPTIONS = [
  { value: 'no', label: 'No', cls: 'sel-no' },
  { value: 'yes', label: 'Sì', cls: 'sel-yes' },
]

function RatingRow({ label, value, options, onChange }) {
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
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FoodCard({ food, onChange }) {
  const { pasti = null, alcol = null, dolci = null, extra = null } = food || {}
  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Alimentazione</h2>
      <RatingRow label="Pasti" value={pasti} options={RATING_OPTIONS} onChange={(v) => onChange('pasti', v)} />
      <RatingRow label="Alcol" value={alcol} options={RATING_OPTIONS} onChange={(v) => onChange('alcol', v)} />
      <RatingRow label="Dolci" value={dolci} options={RATING_OPTIONS} onChange={(v) => onChange('dolci', v)} />
      <RatingRow label="Extra" value={extra} options={EXTRA_OPTIONS} onChange={(v) => onChange('extra', v)} />
    </section>
  )
}
