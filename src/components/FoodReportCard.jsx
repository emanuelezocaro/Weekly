import { dayLabel, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'
import { goalDirection, goalForMonth, goalTargetForDays, isGoalMet } from '../utils/goals'
import TrendChartYAxis from './TrendChartYAxis'

const RATING_LABELS = { bad: 'Male', mid: 'Medio', good: 'Buono' }
const RATING_COLOR = { bad: 'var(--series-6)', mid: 'var(--series-3)', good: 'var(--series-2)' }
const EXTRA_LABELS = { yes: 'Sì', no: 'No' }
const RATING_FIELDS = ['colazione', 'pranzo', 'cena', 'alcol', 'dolci']
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

// Sistema a punti per "come sto andando" a colpo d'occhio, senza bisogno di
// un obiettivo: buono = 2 punti, medio = 1, male = 0 (extra: no = 2 -- averlo
// evitato è il risultato buono --, sì = 0). Un giorno con tutte e 6 le
// valutazioni "buono" vale 12, tutte "male" vale 0. La card mostra la media
// del periodo su questa scala 0-12, e in quale delle tre fasce cade: male
// 0-4, medio 5-8, buono 9-12.
const POINT_VALUE = { bad: 0, mid: 1, good: 2 }
const GAUGE_MAX = 12
const GAUGE_ZONES = [
  { key: 'bad', label: 'Male', upTo: 4 },
  { key: 'mid', label: 'Medio', upTo: 9 },
  { key: 'good', label: 'Buono', upTo: GAUGE_MAX },
]

function dayPoints(record) {
  if (!record) return null
  let sum = 0
  let rated = false
  for (const field of RATING_FIELDS) {
    if (record[field]) {
      sum += POINT_VALUE[record[field]]
      rated = true
    }
  }
  if (record.extra) {
    sum += record.extra === 'no' ? 2 : 0
    rated = true
  }
  return rated ? sum : null
}

// Media solo sui giorni con almeno una valutazione, come per Sonno/Sigarette
// -- un giorno senza dati non abbassa la media, semplicemente non conta.
function averageDayPoints(records) {
  let total = 0
  let trackedDays = 0
  for (const r of records) {
    const p = dayPoints(r)
    if (p === null) continue
    total += p
    trackedDays += 1
  }
  return trackedDays > 0 ? total / trackedDays : null
}

// Male fino a 1/3 della scala, buono da 3/4 in su, medio la fascia in mezzo
// -- stessi confini proporzionali del gauge (4 e 9 su una scala 0-12).
function clusterFor(value, max = GAUGE_MAX) {
  if (value <= max * (4 / 12)) return GAUGE_ZONES[0]
  if (value < max * (9 / 12)) return GAUGE_ZONES[1]
  return GAUGE_ZONES[2]
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

// Solo per la settimana: una barra per giorno con il punteggio 0-12 di quel
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
                <span className="trend-chart__label">{dayLabel(d)}</span>
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
  { key: 'colazione', label: 'Colazione' },
  { key: 'pranzo', label: 'Pranzo' },
  { key: 'cena', label: 'Cena' },
  { key: 'alcol', label: 'Alcol' },
  { key: 'dolci', label: 'Dolci' },
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
        <h2 className="settings-card__title">Alimentazione</h2>
        {!rec ? (
          <p className="trend-chart__caption">Nessun dato per questo giorno</p>
        ) : (
          <>
            <p className="field-readout">
              Colazione: <strong>{RATING_LABELS[rec.colazione] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Pranzo: <strong>{RATING_LABELS[rec.pranzo] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Cena: <strong>{RATING_LABELS[rec.cena] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Alcol: <strong>{RATING_LABELS[rec.alcol] ?? '—'}</strong>
            </p>
            <p className="field-readout">
              Dolci: <strong>{RATING_LABELS[rec.dolci] ?? '—'}</strong>
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
        <h2 className="settings-card__title">Alimentazione</h2>
        <FoodGauge value={gaugeValue} />
        <hr className="report-divider" />
        <RatingMiniRowGrouped label="Colazione" groupedCounts={monthlyRecordsByField('colazione')} goalBadge={fieldBadge('colazione')} />
        <RatingMiniRowGrouped label="Pranzo" groupedCounts={monthlyRecordsByField('pranzo')} goalBadge={fieldBadge('pranzo')} />
        <RatingMiniRowGrouped label="Cena" groupedCounts={monthlyRecordsByField('cena')} goalBadge={fieldBadge('cena')} />
        <RatingMiniRowGrouped label="Alcol" groupedCounts={monthlyRecordsByField('alcol')} goalBadge={fieldBadge('alcol')} />
        <RatingMiniRowGrouped label="Dolci" groupedCounts={monthlyRecordsByField('dolci')} goalBadge={fieldBadge('dolci')} />
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
        <FoodCategoryChart records={records} />
      </section>
    )
  }

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Alimentazione</h2>
      <FoodGauge value={gaugeValue} />
      {period === 'week' && <FoodDailyChart days={days} records={records} />}
      <hr className="report-divider" />
      <RatingMiniRow label="Colazione" values={records.map((r) => r?.colazione ?? null)} goalBadge={fieldBadge('colazione')} />
      <RatingMiniRow label="Pranzo" values={records.map((r) => r?.pranzo ?? null)} goalBadge={fieldBadge('pranzo')} />
      <RatingMiniRow label="Cena" values={records.map((r) => r?.cena ?? null)} goalBadge={fieldBadge('cena')} />
      <RatingMiniRow label="Alcol" values={records.map((r) => r?.alcol ?? null)} goalBadge={fieldBadge('alcol')} />
      <RatingMiniRow label="Dolci" values={records.map((r) => r?.dolci ?? null)} goalBadge={fieldBadge('dolci')} />
      <ExtraMiniRow values={records.map((r) => r?.extra ?? null)} goalBadge={extraBadge} />
      {days.length <= 7 ? (
        <WeekAxisRow days={days} />
      ) : (
        <p className="trend-chart__caption" style={{ marginTop: 4 }}>
          {axisLegend(days)}
        </p>
      )}
      <hr className="report-divider" />
      <FoodCategoryChart records={records} />
    </section>
  )
}
