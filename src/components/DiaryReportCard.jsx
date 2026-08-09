import { useState } from 'react'
import { formatFullDate, toISODate } from '../utils/date'
import { copyOrShareText } from '../utils/shareFile'

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

// Unlike the other Report cards, Diary is never tracked as a goal -- this
// just says whether a note exists per day, with the same "expand for the
// dated list, then copy" pattern as Uscite, minus the chart.
export default function DiaryReportCard({ diary, days }) {
  const [expanded, setExpanded] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  const grouped = diaryByDay(diary, days)

  async function handleCopyList() {
    const result = await copyOrShareText(buildDiaryListText(grouped), 'diary.txt')
    setCopyMessage(COPY_MESSAGES[result] ?? '')
    if (result !== 'failed') setTimeout(() => setCopyMessage(''), 2500)
  }

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Diary</h2>
      <p className="trend-chart__caption">
        {grouped.length}/{days.length} giorni con una nota
      </p>
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
