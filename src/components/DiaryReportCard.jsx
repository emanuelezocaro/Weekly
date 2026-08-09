import { useState } from 'react'
import { dayLabel, formatFullDate, groupDaysByWeek, toISODate } from '../utils/date'
import { copyOrShareText } from '../utils/shareFile'

// Mirrors ActivityTrendChart/FoodReportCard's sparse-axis logic: spell out
// each weekday for a week, otherwise just the date range (too many days to
// label individually).
function axisLegend(days) {
  if (days.length <= 7) return days.map((d) => dayLabel(d)).join(' · ')
  return `${String(days[0].getDate())} – ${String(days[days.length - 1].getDate())}`
}

const COPY_MESSAGES = {
  copied: 'Elenco copiato ✓',
  shared: 'Elenco condiviso ✓',
  downloaded: 'Elenco scaricato ✓',
  cancelled: '',
}

function diaryByDay(diary, days) {
  return days
    .map((date) => {
      const iso = toISODate(date)
      const rec = diary.find((d) => d.date === iso && d.text.trim())
      return rec ? { date, text: rec.text } : null
    })
    .filter(Boolean)
}

function buildDiaryListText(grouped) {
  return grouped.map((d) => `${formatFullDate(d.date)}\n${d.text}`).join('\n\n')
}

// One dot per day (or, for a quarter, one dot per week) -- filled if a note
// was written, empty if not. Sits in the same trend-chart__row/yaxis/
// bars-wrap scaffolding Uscite's bar chart uses (empty yaxis, since there's
// no number scale here) rather than Alimentazione's mini-row -- otherwise
// the day columns end up a different width than Uscite's, since mini-row
// reserves an 84px label gutter meant for "Colazione"/"Pranzo" text that
// Diary doesn't have.
function DotsRow({ isOnByKey }) {
  return (
    <div className="trend-chart__row">
      <div className="mini-row__gutter" />
      <div className="trend-chart__bars-wrap">
        <div className="mini-row__dots">
          {isOnByKey.map(({ key, isOn }) => (
            <span key={key} className={isOn ? 'is-on' : ''} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Day labels aligned under each dot, only meaningful for a week view (7
// columns) -- same scaffolding as DotsRow, so the labels line up under it.
function WeekAxisRow({ days }) {
  return (
    <div className="trend-chart__row">
      <div className="mini-row__gutter" />
      <div className="trend-chart__bars-wrap">
        <div className="mini-row__axis">
          {days.map((d) => (
            <span key={toISODate(d)}>{dayLabel(d)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Unlike the other Report cards, Diary is never tracked as a goal -- this
// just says whether a note exists per day, with the same "expand for the
// dated list, then copy" pattern as Uscite, minus the chart.
export default function DiaryReportCard({ diary, days, period }) {
  const [expanded, setExpanded] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  const grouped = diaryByDay(diary, days)
  const notedIsoSet = new Set(grouped.map((d) => toISODate(d.date)))

  async function handleCopyList() {
    const result = await copyOrShareText(buildDiaryListText(grouped), 'diary.txt')
    setCopyMessage(COPY_MESSAGES[result] ?? '')
    if (result !== 'failed') setTimeout(() => setCopyMessage(''), 2500)
  }

  const dotsRow =
    period === 'quarter' ? (
      <DotsRow
        isOnByKey={groupDaysByWeek(days).map((w) => ({
          key: toISODate(w.weekStart),
          isOn: w.days.some((d) => notedIsoSet.has(toISODate(d))),
        }))}
      />
    ) : (
      <DotsRow isOnByKey={days.map((d) => ({ key: toISODate(d), isOn: notedIsoSet.has(toISODate(d)) }))} />
    )

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Diary</h2>
      <p className="trend-chart__caption">
        {grouped.length}/{days.length} giorni con una nota
      </p>
      {dotsRow}
      {days.length <= 7 && period !== 'quarter' ? (
        <WeekAxisRow days={days} />
      ) : (
        <p className="trend-chart__caption" style={{ marginTop: 4 }}>
          {period === 'quarter' ? `${axisLegend(days)} · un pallino per settimana` : axisLegend(days)}
        </p>
      )}
      <button
        type="button"
        className="trend-chart__toggle"
        onClick={() => setExpanded((e) => !e)}
        disabled={grouped.length === 0}
      >
        <span className="trend-chart__toggle-hint">
          {expanded ? '▴ Nascondi elenco giornaliero' : "▾ Tocca per l'elenco giornaliero"}
        </span>
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
              <p className="diary-note">{d.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
