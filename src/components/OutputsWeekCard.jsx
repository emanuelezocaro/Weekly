import { useState } from 'react'
import { dayLabel, formatFullDate, formatShortDate, groupDaysByWeek, toISODate, toMonthISO } from '../utils/date'
import { goalForMonth, goalTargetForDays } from '../utils/goals'
import { OUTPUT_TYPES, outputType } from '../utils/outputTypes'
import { clipPrevDays, deltaPct } from '../utils/periodDelta'
import { copyOrShareText } from '../utils/shareFile'
import GoalLine from './GoalLine'
import GoalTrendIndicator from './GoalTrendIndicator'
import TrendChartYAxis from './TrendChartYAxis'

const COPY_MESSAGES = {
  copied: 'Elenco copiato ✓',
  shared: 'Elenco condiviso ✓',
  downloaded: 'Elenco scaricato ✓',
  cancelled: '',
}

// Sparse x-axis labels: every day for a week, every ~5th (plus first/last) for
// a month — mirrors ActivityTrendChart's axis logic.
function shouldLabel(index, total) {
  if (total <= 7) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}

function axisLabel(date, days) {
  return days.length <= 7 ? dayLabel(date) : String(date.getDate())
}

// The weekly goal (and the trend chart tied to it) only counts "consegna" --
// contatto/commerciale outputs don't count towards it.
function outputCountsForDays(outputs, days, type) {
  return days.map((date) => {
    const iso = toISODate(date)
    const dayOutputs = outputs.filter((o) => o.date === iso)
    const count = type ? dayOutputs.filter((o) => outputType(o) === type).length : dayOutputs.length
    return { date, count }
  })
}

function countsByType(outputs, days) {
  const isoDays = new Set(days.map(toISODate))
  const counts = { contatto: 0, commerciale: 0, consegna: 0 }
  for (const o of outputs) {
    if (!isoDays.has(o.date)) continue
    counts[outputType(o)] += 1
  }
  return counts
}

function outputsByDay(outputs, days) {
  return days
    .map((date) => ({ date, items: outputs.filter((o) => o.date === toISODate(date)) }))
    .filter((d) => d.items.length > 0)
}

function buildOutputsListText(grouped) {
  return grouped
    .map((d) => `${formatFullDate(d.date)}\n${d.items.map((o) => `- ${o.text}`).join('\n')}`)
    .join('\n\n')
}

export default function OutputsWeekCard({ outputs, days, prevDays, period, goals }) {
  const [expanded, setExpanded] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const counts = outputCountsForDays(outputs, days, 'consegna')
  const daysWithOutputs = counts.filter((c) => c.count > 0).length
  const typeCounts = countsByType(outputs, days)

  // Trimestre: troppi giorni per una barra a testa, si aggrega per settimana.
  const bars =
    period === 'quarter'
      ? groupDaysByWeek(days).map((w, i, weeks) => {
          const weekTotal = outputCountsForDays(outputs, w.days, 'consegna').reduce((sum, c) => sum + c.count, 0)
          return {
            key: toISODate(w.weekStart),
            label: shouldLabel(i, weeks.length) ? formatShortDate(w.weekStart) : '',
            value: weekTotal,
          }
        })
      : counts.map((c, i) => ({
          key: toISODate(c.date),
          label: shouldLabel(i, counts.length) ? axisLabel(c.date, days) : '',
          value: c.count,
        }))
  const maxValue = Math.max(1, ...bars.map((b) => b.value))
  const total = counts.reduce((sum, c) => sum + c.count, 0)
  const goal = goalForMonth(goals, 'outputs', toMonthISO(days[days.length - 1]))
  const target = goalTargetForDays(goal, days.length)

  const prevTotal = outputCountsForDays(outputs, clipPrevDays(days, prevDays), 'consegna').reduce(
    (sum, c) => sum + c.count,
    0,
  )
  const delta = deltaPct(total, prevTotal)
  const grouped = outputsByDay(outputs, days)

  async function handleCopyList() {
    const result = await copyOrShareText(buildOutputsListText(grouped), 'uscite.txt')
    setCopyMessage(COPY_MESSAGES[result] ?? '')
    if (result !== 'failed') setTimeout(() => setCopyMessage(''), 2500)
  }

  return (
    <section className="settings-card">
      <div className="settings-card__title-row">
        <h2 className="settings-card__title">Uscite</h2>
        <GoalTrendIndicator goal={goal} actual={total} target={target} />
      </div>
      <p className="trend-chart__caption">
        {OUTPUT_TYPES.map((t) => `${t.label}: ${typeCounts[t.id]}`).join(' · ')}
      </p>
      <p className="trend-chart__caption">
        {daysWithOutputs}/{days.length} giorni con almeno una consegna
      </p>
      {delta !== null && (
        <p className="report-card__delta" style={{ textAlign: 'center' }}>
          {delta > 0 ? '+' : ''}
          {delta}% rispetto al periodo precedente
        </p>
      )}
      <button
        type="button"
        className="trend-chart__toggle"
        onClick={() => setExpanded((e) => !e)}
        disabled={grouped.length === 0}
      >
        <div className="trend-chart__row">
          <TrendChartYAxis maxValue={maxValue} formatValue={(v) => String(v)} />
          <div className="trend-chart__bars-wrap">
            <GoalLine
              goals={goals}
              itemKey="outputs"
              monthIso={toMonthISO(days[days.length - 1])}
              barGranularity={period === 'quarter' ? 'week' : 'day'}
              maxValue={maxValue}
              formatValue={(v) => String(v)}
            />
            <div className="trend-chart__bars">
              {bars.map((b) => {
                const heightPct = Math.max(2, (b.value / maxValue) * 100)
                return (
                  <div key={b.key} className="trend-chart__col">
                    <span className="trend-chart__bar-track">
                      <span className="outputs-chart__bar" style={{ height: `${heightPct}%` }} />
                    </span>
                    <span className="trend-chart__label">{b.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {grouped.length > 0 && (
          <span className="trend-chart__toggle-hint">
            {expanded ? '▴ Nascondi elenco giornaliero' : '▾ Tocca per l\'elenco giornaliero'}
          </span>
        )}
      </button>

      {expanded && grouped.length > 0 && (
        <div className="outputs-detail">
          <div className="backup-card__actions">
            <button type="button" className="backup-card__secondary" onClick={handleCopyList}>
              Copia elenco
            </button>
          </div>
          {copyMessage && <p className="backup-card__message">{copyMessage}</p>}
          {grouped.map((d) => (
            <div key={toISODate(d.date)} className="outputs-detail__day">
              <p className="outputs-detail__date">{formatFullDate(d.date)}</p>
              <ul className="outputs-detail__list">
                {d.items.map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
