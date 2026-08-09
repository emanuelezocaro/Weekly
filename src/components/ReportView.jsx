import { useEffect, useState } from 'react'
import {
  addDays,
  addMonths,
  APP_START_DATE,
  formatDateRange,
  formatMonthLabel,
  isFuture,
  startOfMonth,
  startOfWeek,
} from '../utils/date'
import { useSwipeNav } from '../hooks/useSwipeNav'
import { buildMonthSummaryText } from '../utils/monthSummary'
import { copyOrShareText } from '../utils/shareFile'
import ActivityStatsSummary from './ActivityStatsSummary'
import OutputsWeekCard from './OutputsWeekCard'
import CigarettesReportCard from './CigarettesReportCard'
import FoodReportCard from './FoodReportCard'
import DiaryReportCard from './DiaryReportCard'

const SUMMARY_MESSAGES = {
  copied: 'Riepilogo copiato ✓',
  shared: 'Riepilogo condiviso ✓',
  downloaded: 'Riepilogo scaricato ✓',
  cancelled: '',
}

const PERIODS = [
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
  { id: 'quarter', label: 'Trimestre' },
]

function startOfQuarter(date) {
  const qMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), qMonth, 1)
}

function shiftCursor(period, cursor, direction) {
  if (period === 'week') return addDays(cursor, direction * 7)
  if (period === 'month') return addMonths(cursor, direction)
  return addMonths(cursor, direction * 3)
}

function periodRange(period, cursor) {
  let start, end
  if (period === 'week') {
    start = startOfWeek(cursor)
    end = addDays(start, 7)
  } else if (period === 'month') {
    start = startOfMonth(cursor)
    end = startOfMonth(addMonths(cursor, 1))
  } else {
    start = startOfQuarter(cursor)
    end = startOfQuarter(addMonths(cursor, 3))
  }
  return [start < APP_START_DATE ? APP_START_DATE : start, end]
}

function periodDays(period, cursor) {
  const [start, end] = periodRange(period, cursor)
  const days = []
  let d = start
  while (d < end) {
    days.push(d)
    d = addDays(d, 1)
  }
  return days
}

function periodHeaderLabel(period, cursor) {
  if (period === 'month') return formatMonthLabel(startOfMonth(cursor))
  const [start, end] = periodRange(period, cursor)
  const label = formatDateRange(start, end)
  const isCurrentWeek = period === 'week' && startOfWeek(cursor).getTime() === startOfWeek(new Date()).getTime()
  return isCurrentWeek ? `Current week · ${label}` : label
}

function isNextDisabled(period, cursor) {
  const next = shiftCursor(period, cursor, 1)
  if (period === 'week') return isFuture(startOfWeek(next))
  if (period === 'month') return isFuture(startOfMonth(next))
  return isFuture(startOfQuarter(next))
}

function isPrevDisabled(period, cursor) {
  if (period === 'week') return startOfWeek(cursor) <= startOfWeek(APP_START_DATE)
  if (period === 'month') return startOfMonth(cursor) <= startOfMonth(APP_START_DATE)
  return startOfQuarter(cursor) <= startOfQuarter(APP_START_DATE)
}

export default function ReportView({ activities, entries, outputs, cigarettes, food, diary, goals, onPeriodLabel }) {
  const [period, setPeriod] = useState('week')
  const [cursor, setCursor] = useState(() => new Date())
  const [summaryMessage, setSummaryMessage] = useState('')

  const [rangeStart, rangeEnd] = periodRange(period, cursor)
  const [prevRangeStart, prevRangeEnd] = periodRange(period, shiftCursor(period, cursor, -1))
  const nextDisabled = isNextDisabled(period, cursor)
  const prevDisabled = isPrevDisabled(period, cursor)
  const days = periodDays(period, cursor)
  const prevDays = periodDays(period, shiftCursor(period, cursor, -1))
  const swipeHandlers = useSwipeNav({
    onPrev: () => setCursor((c) => shiftCursor(period, c, -1)),
    onNext: () => setCursor((c) => shiftCursor(period, c, 1)),
    prevDisabled,
    nextDisabled,
  })

  // Reports the current period up to the app header, which shows it in
  // place of the day-switcher (removed in favor of the swipe gesture below).
  // prevAvailable/nextAvailable let the header show which swipe directions
  // actually work right now, one arrow flanking each side of the label.
  useEffect(() => {
    if (!onPeriodLabel) return
    const label = periodHeaderLabel(period, cursor)
    onPeriodLabel({ label, prevAvailable: !prevDisabled, nextAvailable: !nextDisabled })
    return () => onPeriodLabel(null)
  }, [period, cursor, onPeriodLabel, prevDisabled, nextDisabled])

  async function handleCopySummary() {
    const text = buildMonthSummaryText(cursor, { activities, entries, outputs, cigarettes, food, goals })
    const result = await copyOrShareText(text, `riepilogo-${formatMonthLabel(cursor)}.txt`)
    setSummaryMessage(SUMMARY_MESSAGES[result] ?? '')
    if (result !== 'failed') setTimeout(() => setSummaryMessage(''), 2500)
  }

  return (
    <div className="view" {...swipeHandlers}>
      <div className="segmented-sticky-wrap">
        <div className="segmented">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`segmented__item ${period === p.id ? 'is-active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <>
        {period === 'month' && startOfMonth(cursor) < startOfMonth(new Date()) && (
          <div className="month-summary">
            <div className="backup-card__actions">
              <button type="button" className="backup-card__secondary" onClick={handleCopySummary}>
                Copia riepilogo del mese
              </button>
            </div>
            {summaryMessage && <p className="backup-card__message">{summaryMessage}</p>}
          </div>
        )}

        <OutputsWeekCard outputs={outputs} days={days} prevDays={prevDays} period={period} goals={goals} />
        <CigarettesReportCard cigarettes={cigarettes} days={days} prevDays={prevDays} period={period} goals={goals} />
        <FoodReportCard food={food} days={days} prevDays={prevDays} period={period} goals={goals} />
        <DiaryReportCard diary={diary} days={days} />

        <hr className="report-divider" />

        <ActivityStatsSummary
          activities={activities}
          entries={entries}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          prevRangeStart={prevRangeStart}
          prevRangeEnd={prevRangeEnd}
          days={days}
          period={period}
          goals={goals}
        />
      </>
    </div>
  )
}
