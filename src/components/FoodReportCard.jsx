import { dayLabel, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'
import {
  GAUGE_MAX,
  GAUGE_ZONES,
  POINT_VALUE,
  RATING_COLOR,
  averageDayPoints,
  clusterFor,
  dayPoints,
} from '../utils/foodPoints'
import { goalDirection, goalForMonth, goalTargetForDays, isGoalMet } from '../utils/goals'
import TrendChartYAxis from './TrendChartYAxis'

const RATING_LABELS = { bad: 'Male', mid: 'Medio', good: 'Buono' }
const EXTRA_LABELS = { yes: 'Sì', no: 'No' }
const FOOD_GOAL_KEYS = {
  colazione: 'food_colazione',
  pranzo: 'food_pranzo',
  cena: 'food_cena',
  alcol: 'food_alcol',
  dolci: 'food_dolci',
}

// Mirrors ActivityTrendChart's sparse-axis logic for month view.
function axisLegend(days) {
  if (days.length <= 7) return days.map((d) => dayLabel(d)).join(' · ')
  return `${String(days[0].getDate())} – ${String(days[days.length - 1].getDate())}`
}

// A "3 colazioni buone" goal is set per day or per week; scale it to a
// target for however many days the report is currently showing.
function goalTarget(goal, daysCount) {
  const target = goalTargetForDays(goal, daysCount)
  return target === null ? null : Math.round(target)
}

// Each field can take at most one rating a day, so a day only still counts
// as a chance to catch up if it's today-or-later AND not already rated --
// a day already logged (good or not) has used its one slot. Once what's
// missing exceeds how many such chances are left, that's not "short"
// anymore, it's already lost for this period.
function fieldStatus(goal, count, target, days, values, now) {
  if (isGoalMet(goal, count, target)) return 'met'
  if (goalDirection(goal) !== 'higher_is_better') return 'short'
  const todayIso = toISODate(now)
  let remainingDays = 0
  days.forEach((d, i) => {
    if (toISODate(d) >= todayIso && !values[i]) remainingDays += 1
  })
  return target - count > remainingDays ? 'failed' : 'short'
}

function GoalBadge({ goal, target, count, days, values, now }) {
  if (target === null) return null
  const status = fieldStatus(goal, count, target, days, values, now)
  return (
    <span className={`mini-row__goal ${status === 'met' ? 'is-met' : status === 'failed' ? 'is-failed' : 'is-short'}`}>
      {count}/{target}
      {status === 'met' ? ' ✓' : ''}
    </span>
  )
}

function RatingMiniRow({ label, values, goalBadge }) {
  return (
    <div className="mini-row">
      <span className="mini-row__label">
        {label}
        {goalBadge}
      </span>
      <div className="mini-row__bars">
        {values.map((v, i) => (
          <span
            key={i}
            style={{ height: v ? '100%' : '4px', background: v ? RATING_COLOR[v] : 'var(--border)' }}
          />
        ))}
      </div>
    </div>
  )
}

function ExtraMiniRow({ values, goalBadge }) {
  return (
    <div className="mini-row">
      <span className="mini-row__label">
        Extra
        {goalBadge}
      </span>
      <div className="mini-row__bars">
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              height: v ? '100%' : '4px',
              background: v === 'yes' ? RATING_COLOR.bad : v === 'no' ? RATING_COLOR.good : 'var(--border)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Anno: troppi giorni per una barra a testa, si aggrega per mese contando
// quante valutazioni buone/medie/male ci sono state, invece di mostrare il
// singolo giorno. A differenza di Sonno/Sigarette/Uscite, qui non serve una
// media giornaliera: ogni barra è già una proporzione (quota di buono/medio/
// male su quel mese), non una somma che un mese più lungo gonfierebbe.
function RatingMiniRowGrouped({ label, groupedCounts, goalBadge }) {
  return (
    <div className="mini-row">
      <span className="mini-row__label">
        {label}
        {goalBadge}
      </span>
      <div className="mini-row__bars">
        {groupedCounts.map((counts, i) => {
          const total = counts.good + counts.mid + counts.bad
          return (
            <div key={i} className="mini-row__stack">
              {total === 0 ? (
                <span style={{ height: '100%', background: 'var(--border)' }} />
              ) : (
                <>
                  <span style={{ height: `${(counts.good / total) * 100}%`, background: RATING_COLOR.good }} />
                  <span style={{ height: `${(counts.mid / total) * 100}%`, background: RATING_COLOR.mid }} />
                  <span style={{ height: `${(counts.bad / total) * 100}%`, background: RATING_COLOR.bad }} />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FoodGauge({ value }) {
  if (value === null) return <p className="trend-chart__caption">Nessun dato per questo periodo</p>
  const cluster = clusterFor(value)
  const pct = Math.min(100, Math.max(0, (value / GAUGE_MAX) * 100))

  return (
    <>
      <div className="gauge-head">
        <span className={`gauge-head__value is-${cluster.key}`}>{value.toFixed(1)}</span>
        <span className="gauge-head__unit">/ 12 punti al giorno</span>
      </div>
      <p className={`gauge-cluster is-${cluster.key}`}>{cluster.label}</p>
      <div className="gauge-track">
        {GAUGE_ZONES.map((z, i) => (
          <span
            key={z.key}
            className={`gauge-zone gauge-zone--${z.key}`}
            style={{ width: `${((z.upTo - (GAUGE_ZONES[i - 1]?.upTo ?? 0)) / GAUGE_MAX) * 100}%` }}
          />
        ))}
        <span className="gauge-pointer" style={{ left: `${pct}%` }} />
      </div>
      <div className="gauge-scale">
        {GAUGE_ZONES.map((z, i) => (
          <span key={`prev-${z.key}`} style={{ left: `${((GAUGE_ZONES[i - 1]?.upTo ?? 0) / GAUGE_MAX) * 100}%` }}>
            {GAUGE_ZONES[i - 1]?.upTo ?? 0}
          </span>
        ))}
        <span style={{ left: '100%' }}>{GAUGE_MAX}</span>
      </div>
    </>
  )
}

// Sfondo a 3 fasce dietro le barre, come lo sfondo buono/cattivo degli
// altri grafici con obiettivo -- solo che qui le fasce sono 3 (in base ai
// punti) invece di 2 (in base all'obiettivo).
const BAD_BOUNDARY_PCT = (GAUGE_ZONES[0].upTo / GAUGE_MAX) * 100
const MID_BOUNDARY_PCT = (GAUGE_ZONES[1].upTo / GAUGE_MAX) * 100

function PointZoneBackground() {
  return (
    <>
      <div className="goal-zone goal-zone--bad" style={{ bottom: 0, top: `${100 - BAD_BOUNDARY_PCT}%` }} />
      <div className="goal-zone goal-zone--mid" style={{ bottom: `${BAD_BOUNDARY_PCT}%`, top: `${100 - MID_BOUNDARY_PCT}%` }} />
      <div className="goal-zone goal-zone--good" style={{ bottom: `${MID_BOUNDARY_PCT}%`, top: 0 }} />
      <div className="goal-line" style={{ bottom: `${MID_BOUNDARY_PCT}%` }}>
        <span className="goal-line__tag">Buono</span>
      </div>
      <div className="goal-line" style={{ bottom: `${BAD_BOUNDARY_PCT}%` }}>
        <span className="goal-line__tag">Medio</span>
      </div>
    </>
  )
}

// Settimana e mese: sparse labels sotto le barre oltre i 7 giorni, stessa
// logica di CigarettesReportCard (solo primo/ultimo/ogni 5° in un mese,
// altrimenti si accavallano).
function shouldLabelDay(index, total) {
  if (total <= 7) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}

function dailyAxisLabel(d, days) {
  return days.length <= 7 ? dayLabel(d) : String(d.getDate())
}

// Settimana e mese: una barra per giorno con il punteggio 0-12 di quel
// giorno (non una media), colorata in base alla fascia in cui cade, cosi si
// vede subito quale giorno ha tirato su o giù la media mostrata nel gauge
// qui sopra. Le due righe tratteggiate segnano gli stessi confini del gauge.
function FoodDailyChart({ days, records }) {
  return (
    <div className="trend-chart__row">
      <TrendChartYAxis maxValue={GAUGE_MAX} formatValue={(v) => `${v}`} />
      <div className="trend-chart__bars-wrap">
        <PointZoneBackground />
        <div className="trend-chart__bars">
          {days.map((d, i) => {
            const points = dayPoints(records[i])
            const heightPct = points === null ? 2 : Math.max(2, (points / GAUGE_MAX) * 100)
            const color = points === null ? 'var(--border)' : RATING_COLOR[clusterFor(points).key]
            return (
              <div key={toISODate(d)} className="trend-chart__col">
                <span className="trend-chart__bar-track">
                  <span className="cigarettes-chart__bar" style={{ height: `${heightPct}%`, background: color }} />
                </span>
                <span className="trend-chart__label">{shouldLabelDay(i, days.length) ? dailyAxisLabel(d, days) : ''}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Anno: troppi giorni per una barra a testa, si aggrega per mese mostrando
// la media punti (solo giorni tracciati) di quel mese -- stessa scala 0-12,
// stesso sfondo a fasce del grafico giornaliero qui sopra.
function FoodMonthlyChart({ months, food }) {
  return (
    <div className="trend-chart__row">
      <TrendChartYAxis maxValue={GAUGE_MAX} formatValue={(v) => `${v}`} />
      <div className="trend-chart__bars-wrap">
        <PointZoneBackground />
        <div className="trend-chart__bars">
          {months.map((m) => {
            const monthRecords = m.days.map((d) => food.find((f) => f.date === toISODate(d)) || null)
            const avg = averageDayPoints(monthRecords)
            const heightPct = avg === null ? 2 : Math.max(2, (avg / GAUGE_MAX) * 100)
            const color = avg === null ? 'var(--border)' : RATING_COLOR[clusterFor(avg).key]
            return (
              <div key={toMonthISO(m.monthStart)} className="trend-chart__col">
                <span className="trend-chart__bar-track">
                  <span className="cigarettes-chart__bar" style={{ height: `${heightPct}%`, background: color }} />
                </span>
                <span className="trend-chart__label">{formatMonthShort(toMonthISO(m.monthStart))}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Sempre visibile (non solo in settimana): non "quando", ma "quale delle 6
// cose" -- a differenza del grafico giornaliero qui sopra (colonne verticali
// nel tempo), qui le 6 categorie sono un elenco verticale e ogni barra è
// orizzontale, colorata in base alla propria fascia. La media conta solo i
// giorni in cui quella categoria è stata segnata: un giorno mai segnato
// (es. prima di aver iniziato a tracciare) non entra nel calcolo.
const CATEGORY_FIELDS = [
  { key: 'colazione', label: 'Breakfast' },
  { key: 'pranzo', label: 'Lunch' },
  { key: 'cena', label: 'Dinner' },
  { key: 'alcol', label: 'Alcohol' },
  { key: 'dolci', label: 'Sweets' },
  { key: 'extra', label: 'Extra' },
]
const CATEGORY_MAX = 2
// L'asse mostra la scala "a settimana" (7 giorni x 2 punti) invece di 0-2,
// cosi il numero in cima coincide con quello di cui parliamo di solito
// (7 colazioni x 2 punti = 14) anche se qui è una media, non una somma.
const CATEGORY_WEEK_MAX = 14
const CATEGORY_TICKS = [0, 2, 4, 6, 8, 10, 12, 14]

function categoryAverage(records, key) {
  let total = 0
  let tracked = 0
  for (const r of records) {
    if (!r) continue
    if (key === 'extra') {
      if (!r.extra) continue
      total += r.extra === 'no' ? 2 : 0
      tracked += 1
    } else if (r[key]) {
      total += POINT_VALUE[r[key]]
      tracked += 1
    }
  }
  return tracked > 0 ? total / tracked : null
}

function FoodCategoryChart({ records }) {
  return (
    <div className="food-hbars">
      <div className="food-hbars__labels">
        {CATEGORY_FIELDS.map((f) => (
          <span key={f.key}>{f.label}</span>
        ))}
      </div>
      <div className="food-hbars__col">
        <div className="food-hbars__rows">
          {CATEGORY_TICKS.map((t) => (
            <div key={t} className="food-hbars__gridline" style={{ left: `${(t / CATEGORY_WEEK_MAX) * 100}%` }} />
          ))}
          <div className="food-hbars__vline" style={{ left: `${BAD_BOUNDARY_PCT}%` }}>
            <span className="food-hbars__vline-tag">Medio</span>
          </div>
          <div className="food-hbars__vline" style={{ left: `${MID_BOUNDARY_PCT}%` }}>
            <span className="food-hbars__vline-tag">Buono</span>
          </div>
          {CATEGORY_FIELDS.map((f) => {
            const avg = categoryAverage(records, f.key)
            const widthPct = avg === null ? 0 : Math.max(2, (avg / CATEGORY_MAX) * 100)
            const color = avg === null ? 'var(--border)' : RATING_COLOR[clusterFor(avg, CATEGORY_MAX).key]
            return (
              <span key={f.key} className="food-hbars__track">
                <span className="food-hbars__fill" style={{ width: `${widthPct}%`, background: color }} />
              </span>
            )
          })}
        </div>
        <div className="food-hbars__axis">
          {CATEGORY_TICKS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Day labels aligned under each bar column, instead of a single centered
// string that drifts out of sync with the columns above it.
function WeekAxisRow({ days }) {
  return (
    <div className="mini-row">
      <span className="mini-row__label" />
      <div className="mini-row__axis">
        {days.map((d) => (
          <span key={toISODate(d)}>{dayLabel(d)}</span>
        ))}
      </div>
    </div>
  )
}

function ExtraMiniRowGrouped({ groupedExtra, goalBadge }) {
  return (
    <div className="mini-row">
      <span className="mini-row__label">
        Extra
        {goalBadge}
      </span>
      <div className="mini-row__bars">
        {groupedExtra.map(({ yes, total }, i) => {
          const pct = total > 0 ? (yes / total) * 100 : 0
          return (
            <span
              key={i}
              style={{
                height: total > 0 ? `${Math.max(4, pct)}%` : '4px',
                background: total > 0 ? RATING_COLOR.bad : 'var(--border)',
                opacity: total > 0 ? 0.35 + (pct / 100) * 0.65 : 1,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function FoodReportCard({ food, days, period, goals, now = new Date() }) {
  const records = days.map((date) => {
    const iso = toISODate(date)
    return food.find((f) => f.date === iso) || null
  })

  if (days.length === 1) {
    const rec = records[0]
    return (
      <section className="settings-card">
        <h2 className="settings-card__title">Food</h2>
        {!rec ? (
          <p className="trend-chart__caption">Nessun dato per questo giorno</p>
        ) : (
          <>
            <p className="field-readout">
              Breakfast: <strong>{RATING_LABELS[rec.colazione] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Lunch: <strong>{RATING_LABELS[rec.pranzo] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Dinner: <strong>{RATING_LABELS[rec.cena] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Alcohol: <strong>{RATING_LABELS[rec.alcol] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Sweets: <strong>{RATING_LABELS[rec.dolci] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Extra: <strong>{EXTRA_LABELS[rec.extra] ?? '—'}</strong>
            </p>
          </>
        )}
      </section>
    )
  }

  const monthIso = toMonthISO(days[days.length - 1])
  const gaugeValue = averageDayPoints(records)

  const fieldBadge = (field) => {
    const goal = goalForMonth(goals, FOOD_GOAL_KEYS[field], monthIso)
    const target = goalTarget(goal, days.length)
    const values = records.map((r) => r?.[field] ?? null)
    const count = values.filter((v) => v === 'good').length
    return <GoalBadge goal={goal} target={target} count={count} days={days} values={values} now={now} />
  }
  const extraBadge = (() => {
    const goal = goalForMonth(goals, 'food_extra', monthIso)
    const target = goalTarget(goal, days.length)
    const values = records.map((r) => r?.extra ?? null)
    const count = values.filter((v) => v === 'no').length
    return <GoalBadge goal={goal} target={target} count={count} days={days} values={values} now={now} />
  })()

  if (period === 'year') {
    const months = groupDaysByMonth(days)
    const monthlyRecordsByField = (field) =>
      months.map((m) => {
        const counts = { good: 0, mid: 0, bad: 0 }
        for (const d of m.days) {
          const rec = food.find((f) => f.date === toISODate(d))
          if (rec && rec[field]) counts[rec[field]] += 1
        }
        return counts
      })
    const monthlyExtra = months.map((m) => {
      let yes = 0
      let total = 0
      for (const d of m.days) {
        const rec = food.find((f) => f.date === toISODate(d))
        if (rec && rec.extra) {
          total += 1
          if (rec.extra === 'yes') yes += 1
        }
      }
      return { yes, total }
    })
    return (
      <section className="settings-card">
        <h2 className="settings-card__title">Food</h2>
        <FoodGauge value={gaugeValue} />
        <p className="trend-chart__caption">Media punti di ogni mese (0-12)</p>
        <FoodMonthlyChart months={months} food={food} />
        <hr className="report-divider" />
        <RatingMiniRowGrouped label="Breakfast" groupedCounts={monthlyRecordsByField('colazione')} goalBadge={fieldBadge('colazione')} />
        <RatingMiniRowGrouped label="Lunch" groupedCounts={monthlyRecordsByField('pranzo')} goalBadge={fieldBadge('pranzo')} />
        <RatingMiniRowGrouped label="Dinner" groupedCounts={monthlyRecordsByField('cena')} goalBadge={fieldBadge('cena')} />
        <RatingMiniRowGrouped label="Alcohol" groupedCounts={monthlyRecordsByField('alcol')} goalBadge={fieldBadge('alcol')} />
        <RatingMiniRowGrouped label="Sweets" groupedCounts={monthlyRecordsByField('dolci')} goalBadge={fieldBadge('dolci')} />
        <ExtraMiniRowGrouped groupedExtra={monthlyExtra} goalBadge={extraBadge} />
        <div className="mini-row">
          <span className="mini-row__label" />
          <div className="mini-row__axis">
            {months.map((m) => (
              <span key={toMonthISO(m.monthStart)}>{formatMonthShort(toMonthISO(m.monthStart))}</span>
            ))}
          </div>
        </div>
        <hr className="report-divider" />
        <p className="trend-chart__caption">Media punti (0-2) sui giorni segnati per categoria, su scala 0-14 a settimana</p>
        <FoodCategoryChart records={records} />
      </section>
    )
  }

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Food</h2>
      <FoodGauge value={gaugeValue} />
      {(period === 'week' || period === 'month') && (
        <>
          <p className="trend-chart__caption">Punteggio di ogni giorno (0-12)</p>
          <FoodDailyChart days={days} records={records} />
        </>
      )}
      <hr className="report-divider" />
      <RatingMiniRow label="Breakfast" values={records.map((r) => r?.colazione ?? null)} goalBadge={fieldBadge('colazione')} />
      <RatingMiniRow label="Lunch" values={records.map((r) => r?.pranzo ?? null)} goalBadge={fieldBadge('pranzo')} />
      <RatingMiniRow label="Dinner" values={records.map((r) => r?.cena ?? null)} goalBadge={fieldBadge('cena')} />
      <RatingMiniRow label="Alcohol" values={records.map((r) => r?.alcol ?? null)} goalBadge={fieldBadge('alcol')} />
      <RatingMiniRow label="Sweets" values={records.map((r) => r?.dolci ?? null)} goalBadge={fieldBadge('dolci')} />
      <ExtraMiniRow values={records.map((r) => r?.extra ?? null)} goalBadge={extraBadge} />
      {days.length <= 7 ? (
        <WeekAxisRow days={days} />
      ) : (
        <p className="trend-chart__caption" style={{ marginTop: 4 }}>
          {axisLegend(days)}
        </p>
      )}
      <hr className="report-divider" />
      <p className="trend-chart__caption">Media punti (0-2) sui giorni segnati per categoria, su scala 0-14 a settimana</p>
      <FoodCategoryChart records={records} />
    </section>
  )
}
