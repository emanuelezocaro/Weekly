import { dayLabel, formatMonthShort, groupDaysByMonth, toISODate, toMonthISO } from '../utils/date'

// Mirrors ActivityTrendChart/FoodReportCard's sparse-axis logic: spell out
// each weekday for a week, otherwise just the date range (too many days to
// label individually).
function axisLegend(days) {
  if (days.length <= 7) return days.map((d) => dayLabel(d)).join(' · ')
  return `${String(days[0].getDate())} – ${String(days[days.length - 1].getDate())}`
}

function writtenIsoSet(diary, days) {
  return new Set(
    days.map((d) => toISODate(d)).filter((iso) => diary.some((entry) => entry.date === iso)),
  )
}

// One dot per day (or, for a year, one dot per month) -- filled if the
// diary was marked written that day, empty if not. Same scaffolding as
// ActivityChecklistReportCard's DotsRow, minus a per-activity color (Diary
// isn't an activity).
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

// Anno: un pallino per mese direbbe poco -- scrivere anche solo ogni tanto lo
// terrebbe quasi sempre acceso, stesso problema già visto per Lavoro. Al
// posto del sì/no, il numero grezzo di giorni segnati quel mese: niente
// obiettivo da disegnare (Diary non ne ha mai avuti), solo un conteggio.
function MonthBars({ months, writtenIsoSet }) {
  const bars = months.map((m) => ({
    key: toMonthISO(m.monthStart),
    label: formatMonthShort(toMonthISO(m.monthStart)),
    value: m.days.filter((d) => writtenIsoSet.has(toISODate(d))).length,
  }))
  const maxValue = Math.max(1, ...bars.map((b) => b.value))

  return (
    <div className="trend-chart__row">
      <div className="trend-chart__bars-wrap">
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
  )
}

// Unlike the other Report cards, Diary is never tracked as a goal -- this
// just says whether the diary was marked written per day, same shape as
// ActivityChecklistReportCard but without a goal comparison.
export default function DiaryReportCard({ diary, days, period }) {
  const writtenSet = writtenIsoSet(diary, days)
  const writtenCount = days.filter((d) => writtenSet.has(toISODate(d))).length

  const months = period === 'year' ? groupDaysByMonth(days) : null

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Diary</h2>
      <p className="trend-chart__caption">
        {writtenCount}/{days.length} giorni scritti
      </p>
      {months ? (
        <MonthBars months={months} writtenIsoSet={writtenSet} />
      ) : (
        <>
          <DotsRow isOnByKey={days.map((d) => ({ key: toISODate(d), isOn: writtenSet.has(toISODate(d)) }))} />
          {days.length <= 7 ? (
            <WeekAxisRow days={days} />
          ) : (
            <p className="trend-chart__caption" style={{ marginTop: 4 }}>
              {axisLegend(days)}
            </p>
          )}
        </>
      )}
    </section>
  )
}
