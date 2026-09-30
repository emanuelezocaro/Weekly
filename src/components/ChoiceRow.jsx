// One list row: label on the left, a compact segmented choice on the right.
// Shared by every Bad/Medium/Good (and Yes/No) input on the Add screen so
// they all look and behave the same. Color only appears on the chosen
// option -- at rest the row stays neutral.
export default function ChoiceRow({ label, color, options, value, onChange, disabled }) {
  return (
    <div className="list-row">
      <span className="list-row__label">
        {color && <span className="list-row__dot" style={{ background: color }} />}
        <span className="list-row__name">{label}</span>
      </span>
      <div className="choice" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={`choice__opt is-${opt.tone} ${value === opt.value ? 'is-selected' : ''}`}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
          >
            <span>{opt.label}</span>
            {opt.hint && <span className="choice__hint">{opt.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
