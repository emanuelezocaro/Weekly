import { dayLabel, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'
import { goalDirection, goalForMonth, goalTargetForDays, isGoalMet } from '../utils/goals'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import TrendChartYAxis from './TrendChartYAxis'

// A regular space collapses to zero height when it's a block element's only
// content -- this reserves the delta row's height even with nothing to say,
// so swiping between periods doesn't shift the chart below it.
const NBSP = String.fromCharCode(160)

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

// Aggregate counts across all rating rows, so the reader doesn't have to
// count colored bars by eye.
function ratingSummary(records) {
  const counts = { good: 0, mid: 0, bad: 0 }
  let extraYes = 0
  for (const r of records) {
    if (!r) continue
    for (const field of RATING_FIELDS) {
      if (r[field]) counts[r[field]] += 1
    }
    if (r.extra === 'yes') extraYes += 1
  }
  return { ...counts, extraYes }
}

// "Come sto andando" a colpo d'occhio, invece di dover leggere 6 righe di
// barrette colorate: un conteggio buono/valutati per i 3 pasti principali
// (unica cifra che risponde davvero a "come mangio"), e uno separato per
// Alcol/Dolci (stessa scala buono/medio/male dei pasti, ma tenuti a parte
// perché sono "da evitare", non "da fare bene") ed Extra (un sì/no, quindi
// un conteggio di quante volte è successo, non un buono/male).
function goodRatioAcrossFields(records, fields) {
  let good = 0
  let total = 0
  for (const r of records) {
    if (!r) continue
    for (const field of fields) {
      if (!r[field]) continue
      total += 1
      if (r[field] === 'good') good += 1
    }
  }
  return { good, total }
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

// Sparse x-axis labels: every day for a week, every ~5th (plus first/last)
// for a month -- mirrors CigarettesReportCard's axis logic.
function shouldLabel(index, total) {
  if (total <= 7) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}

function RatingLegend() {
  return (
    <div className="rating-legend">
      {['good', 'mid', 'bad'].map((k) => (
        <span key={k} className="rating-legend__item">
          <span className="rating-legend__swatch" style={{ background: RATING_COLOR[k] }} />
          {RATING_LABELS[k]}
        </span>
      ))}
    </div>
  )
}

// "Come sto andando" a colpo d'occhio: un grafico solo, non 6 righe da
// decifrare -- una barra per giorno (o per mese, in Anno) con la quota di
// pasti buoni/medi/male impilata, cosi il trend si vede a occhio (più verde
// = meglio) invece di dover leggere numeri.
function MealTrendChart({ bars }) {
  return (
    <>
      <RatingLegend />
      <div className="trend-chart__row">
        <TrendChartYAxis maxValue={1} formatValue={(v) => `${Math.round(v * 100)}%`} />
        <div className="trend-chart__bars-wrap">
          <div className="trend-chart__bars">
            {bars.map((b) => {
              const total = b.good + b.mid + b.bad
              return (
                <div key={b.key} className="trend-chart__col">
                  <span className="trend-chart__bar-track">
                    <div className="mini-row__stack">
                      {total === 0 ? (
                        <span style={{ height: '100%', background: 'var(--border)' }} />
                      ) : (
                        <>
                          <span style={{ height: `${(b.good / total) * 100}%`, background: RATING_COLOR.good }} />
                          <span style={{ height: `${(b.mid / total) * 100}%`, background: RATING_COLOR.mid }} />
                          <span style={{ height: `${(b.bad / total) * 100}%`, background: RATING_COLOR.bad }} />
                        </>
                      )}
                    </div>
                  </span>
                  <span className="trend-chart__label">{b.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
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

export default function FoodReportCard({ food, days, prevDays, period, goals, now = new Date() }) {
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

  const summary = ratingSummary(records)
  const monthIso = toMonthISO(days[days.length - 1])

  const prevRecords = clipPrevDays(days, prevDays).map((date) => {
    const iso = toISODate(date)
    return food.find((f) => f.date === iso) || null
  })
  const meals = goodRatioAcrossFields(records, ['colazione', 'pranzo', 'cena'])
  const alcol = goodRatioAcrossFields(records, ['alcol'])
  const dolci = goodRatioAcrossFields(records, ['dolci'])
  const prevMeals = goodRatioAcrossFields(prevRecords, ['colazione', 'pranzo', 'cena'])
  const delta = deltaPct(meals.good, prevMeals.good)

  const caption = (
    <>
      <div className="dash-card__stats">
        <div className="dash-card__stat">
          <span className="dash-card__stat-label">Pasti</span>
          <span className="dash-card__stat-value">
            {meals.good}/{meals.total}
          </span>
        </div>
        <div className="dash-card__stat">
          <span className="dash-card__stat-label">Alcol</span>
          <span className="dash-card__stat-value">
            {alcol.good}/{alcol.total}
          </span>
        </div>
        <div className="dash-card__stat">
          <span className="dash-card__stat-label">Dolci</span>
          <span className="dash-card__stat-value">
            {dolci.good}/{dolci.total}
          </span>
        </div>
        <div className="dash-card__stat">
          <span className="dash-card__stat-label">Extra</span>
          <span className="dash-card__stat-value">
            {summary.extraYes}/{days.length}
          </span>
        </div>
      </div>
      <p className="report-card__delta" style={{ textAlign: 'center' }}>
        {delta !== null ? `${delta > 0 ? '+' : ''}${delta}% pasti buoni rispetto al periodo precedente` : NBSP}
      </p>
    </>
  )

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
    const mealBars = months.map((m) => {
      const counts = { good: 0, mid: 0, bad: 0 }
      for (const d of m.days) {
        const rec = food.find((f) => f.date === toISODate(d))
        if (!rec) continue
        for (const field of ['colazione', 'pranzo', 'cena']) {
          if (rec[field]) counts[rec[field]] += 1
        }
      }
      return { key: toMonthISO(m.monthStart), label: formatMonthShort(toMonthISO(m.monthStart)), ...counts }
    })

    return (
      <section className="settings-card">
        <h2 className="settings-card__title">Alimentazione</h2>
        {caption}
        <MealTrendChart bars={mealBars} />
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
      </section>
    )
  }

  const mealBars = days.map((d, i) => {
    const r = records[i]
    const counts = { good: 0, mid: 0, bad: 0 }
    if (r) {
      for (const field of ['colazione', 'pranzo', 'cena']) {
        if (r[field]) counts[r[field]] += 1
      }
    }
    return {
      key: toISODate(d),
      label: shouldLabel(i, days.length) ? (days.length <= 7 ? dayLabel(d) : String(d.getDate())) : '',
      ...counts,
    }
  })

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Alimentazione</h2>
      {caption}
      <MealTrendChart bars={mealBars} />
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
    </section>
  )
}
