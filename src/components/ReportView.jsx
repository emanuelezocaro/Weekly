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
  toISODate,
} from '../utils/date'
import { useSwipeNav } from '../hooks/useSwipeNav'
import { buildMonthSummaryText, buildWeekSummaryText } from '../utils/monthSummary'
import { copyOrShareText } from '../utils/shareFile'
import ActivityTimeReportCard from './ActivityTimeReportCard'
import ActivityChecklistReportCard from './ActivityChecklistReportCard'
import OutputsWeekCard from './OutputsWeekCard'
import CigarettesReportCard from './CigarettesReportCard'
import FoodReportCard from './FoodReportCard'
import DiaryReportCard from './DiaryReportCard'

// Fixed reading order for the per-activity report cards, chosen by hand
// rather than alphabetical -- an activity not in this list (renamed, or
// newly added) just falls back after these, in whatever order `activities`
// itself has them.
const ACTIVITY_ORDER = ['Work', 'Growth', 'Sleep', 'Body', 'Free', 'Put off']

function sortByCustomOrder(activities) {
  return [...activities].sort((a, b) => {
    const ia = ACTIVITY_ORDER.indexOf(a.name)
    const ib = ACTIVITY_ORDER.indexOf(b.name)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

const SUMMARY_MESSAGES = {
  copied: 'Riepilogo copiato ✓',
  shared: 'Riepilogo condiviso ✓',
  downloaded: 'Riepilogo scaricato ✓',
  cancelled: '',
}

const PERIODS = [
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
  { id: 'year', label: 'Anno' },
]

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1)
}

function shiftCursor(period, cursor, direction) {
  if (period === 'week') return addDays(cursor, direction * 7)
  if (period === 'month') return addMonths(cursor, direction)
  return new Date(cursor.getFullYear() + direction, 0, 1)
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
    start = startOfYear(cursor)
    end = startOfYear(new Date(cursor.getFullYear() + 1, 0, 1))
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
  if (period === 'year') {
    const year = startOfYear(cursor).getFullYear()
    const isCurrentYear = year === new Date().getFullYear()
    return isCurrentYear ? `Current year · ${year}` : String(year)
  }
  const [start, end] = periodRange(period, cursor)
  const label = formatDateRange(start, end)
  const isCurrentWeek = period === 'week' && startOfWeek(cursor).getTime() === startOfWeek(new Date()).getTime()
  return isCurrentWeek ? `Current week · ${label}` : label
}

function isNextDisabled(period, cursor) {
  const next = shiftCursor(period, cursor, 1)
  if (period === 'week') return isFuture(startOfWeek(next))
  if (period === 'month') return isFuture(startOfMonth(next))
  return isFuture(startOfYear(next))
}

function isPrevDisabled(period, cursor) {
  if (period === 'week') return startOfWeek(cursor) <= startOfWeek(APP_START_DATE)
  if (period === 'month') return startOfMonth(cursor) <= startOfMonth(APP_START_DATE)
  return startOfYear(cursor) <= startOfYear(APP_START_DATE)
}

export default function ReportView({ activities, durations, checklist, outputs, cigarettes, food, diary, goals, onPeriodLabel }) {
  const [period, setPeriod] = useState('week')
  const [cursor, setCursor] = useState(() => new Date())
  const [summaryMessage, setSummaryMessage] = useState('')

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
    const ctx = { activities, durations, checklist, outputs, cigarettes, food, diary, goals }
    const text =
      period === 'week' ? buildWeekSummaryText(startOfWeek(cursor), ctx) : buildMonthSummaryText(cursor, ctx)
    const filename =
      period === 'week' ? `riepilogo-settimana-${toISODate(startOfWeek(cursor))}.txt` : `riepilogo-${formatMonthLabel(cursor)}.txt`
    const result = await copyOrShareText(text, filename)
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
        {((period === 'month' && startOfMonth(cursor) < startOfMonth(new Date())) ||
          (period === 'week' && startOfWeek(cursor) < startOfWeek(new Date()))) && (
          <div className="month-summary">
            <div className="backup-card__actions">
              <button type="button" className="backup-card__secondary" onClick={handleCopySummary}>
                {period === 'week' ? 'Copia riepilogo della settimana' : 'Copia riepilogo del mese'}
              </button>
            </div>
            {summaryMessage && <p className="backup-card__message">{summaryMessage}</p>}
          </div>
        )}

        {activities.length === 0 ? (
          <p className="empty-state">Aggiungi un'attività dalla scheda "Impostazioni" per iniziare.</p>
        ) : (
          sortByCustomOrder(activities).map((activity) =>
            activity.mode === 'checklist' ? (
              <ActivityChecklistReportCard
                key={activity.id}
                activity={activity}
                checklist={checklist}
                days={days}
                prevDays={prevDays}
                period={period}
                goals={goals}
              />
            ) : (
              <ActivityTimeReportCard
                key={activity.id}
                activity={activity}
                durations={durations}
                days={days}
                prevDays={prevDays}
                period={period}
                goals={goals}
              />
            ),
          )
        )}

        <hr className="report-divider" />

        <OutputsWeekCard outputs={outputs} days={days} prevDays={prevDays} period={period} goals={goals} />
        <DiaryReportCard diary={diary} days={days} period={period} />
        <CigarettesReportCard cigarettes={cigarettes} days={days} prevDays={prevDays} period={period} goals={goals} />
        <FoodReportCard food={food} days={days} prevDays={prevDays} period={period} goals={goals} />
      </>
    </div>
  )
}
