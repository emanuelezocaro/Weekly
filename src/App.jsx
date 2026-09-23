import { useEffect, useState } from 'react'
import TopNav from './components/TopNav'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

/* The page scrolls naturally (see App.css/index.css), with the top nav
   pinned via position: sticky instead of living outside a fixed-height
   scroll container. Each view's own segmented tab strip scrolls away with
   the rest of the content -- it isn't pinned, so it doesn't need to know
   the topbar's height the way a sticky element under it would.

   The top nav used to also collapse away on scroll-down to reclaim space,
   but animating that (however tuned) kept producing visible jerks on a
   real device -- a max-height/opacity transition fighting an in-progress
   touch scroll never fully stopped stuttering. Simplest fix that actually
   removes the problem instead of chasing the next timing edge case: the
   top nav just stays put, no animation to get wrong. */

/* Media-player "skip" glyph (triangle + bar) instead of a plain arrow --
   filled with the app icon's own oxblood (#57101f) so it reads as tied to
   the brand, not a generic system icon. Mirrored via scaleX for the "prev"
   direction rather than drawn twice. */
function SkipIcon({ direction }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#57101f"
      aria-hidden="true"
      style={{ transform: direction === 'prev' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M6 5h2.2v14H6z" />
      <path d="M9.6 5.5 19 12 9.6 18.5z" />
    </svg>
  )
}

function App() {
  const [tab, setTab] = useState('calendar')
  const [periodLabel, setPeriodLabel] = useState(null)

  // Switching top-level tab swaps what's rendered in the same scrolling
  // document -- the scroll position itself isn't reset for free, so without
  // this a tab opens wherever the previous one happened to be scrolled to
  // (e.g. landing mid-way down Report right after scrolling Add down to
  // Food), topbar included, instead of at its own top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])
  const {
    activities,
    durations,
    addDuration,
    removeDuration,
    checklist,
    toggleChecklist,
    addActivity,
    renameActivity,
    setActivityMode,
    deleteActivity,
    food,
    setFoodField,
    ratings,
    setRating,
    goals,
    setGoal,
    exportData,
    importData,
  } = useHabitData()

  return (
    <div className="app">
      <div className="app-topbar">
        <TopNav active={tab} onChange={setTab} />

        {periodLabel && (
          <div className="app-period-row">
            <span className="app-header__arrow-slot">
              {periodLabel?.prevAvailable && <SkipIcon direction="prev" />}
            </span>
            <p className="app-header__period">{periodLabel?.label}</p>
            <span className="app-header__arrow-slot">
              {periodLabel?.nextAvailable && <SkipIcon direction="next" />}
            </span>
          </div>
        )}
      </div>

      <main className="app-main">
        {tab === 'calendar' && (
          <DayAgenda
            activities={activities}
            durations={durations}
            checklist={checklist}
            food={food}
            ratings={ratings}
            onAddDuration={addDuration}
            onRemoveDuration={removeDuration}
            onToggleChecklist={toggleChecklist}
            onSetFoodField={setFoodField}
            onSetRating={setRating}
            onPeriodLabel={setPeriodLabel}
          />
        )}
        {tab === 'report' && (
          <ReportView
            activities={activities}
            durations={durations}
            checklist={checklist}
            food={food}
            ratings={ratings}
            goals={goals}
            onPeriodLabel={setPeriodLabel}
          />
        )}
        {tab === 'settings' && (
          <SettingsView
            activities={activities}
            onAdd={addActivity}
            onRename={renameActivity}
            onSetMode={setActivityMode}
            onDelete={deleteActivity}
            onExport={exportData}
            onImport={importData}
            goals={goals}
            onSetGoal={setGoal}
            initialTab="goals"
          />
        )}
      </main>
    </div>
  )
}

export default App
