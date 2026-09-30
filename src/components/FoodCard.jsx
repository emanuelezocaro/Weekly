import ChoiceRow from './ChoiceRow'
import { RATING_OPTIONS } from '../utils/timeRatings'

const EXTRA_OPTIONS = [
  { value: 'yes', label: 'Yes', tone: 'bad' },
  { value: 'no', label: 'No', tone: 'good' },
]

const FIELDS = [
  { key: 'colazione', label: 'Breakfast', options: RATING_OPTIONS },
  { key: 'pranzo', label: 'Lunch', options: RATING_OPTIONS },
  { key: 'cena', label: 'Dinner', options: RATING_OPTIONS },
  { key: 'alcol', label: 'Alcohol', options: RATING_OPTIONS },
  { key: 'dolci', label: 'Sweets', options: RATING_OPTIONS },
  { key: 'extra', label: 'Extra', options: EXTRA_OPTIONS },
]

export default function FoodCard({ food, onChange, locked }) {
  return (
    <section className="add-section">
      <h2 className="add-section__title">Food</h2>
      <div className="add-list">
        {FIELDS.map((f) => (
          <ChoiceRow
            key={f.key}
            label={f.label}
            options={f.options}
            value={food?.[f.key] ?? null}
            onChange={(v) => onChange(f.key, v)}
            disabled={locked}
          />
        ))}
      </div>
      {locked && <p className="add-section__hint">No longer editable.</p>}
    </section>
  )
}
