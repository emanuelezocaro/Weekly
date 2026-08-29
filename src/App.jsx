import { useEffect, useState } from 'react'
import TopNav from './components/TopNav'
import DashboardView from './components/DashboardView'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

/* The page scrolls naturally (see App.css/index.css), with the top nav
   pinned via position: sticky instead of living outside a fixed-height
   scroll container. Each view's own segmented tab strip scrolls away with
   the rest of the content -- it isn't pinned, so it doesn't need to know
   the topbar's height the way a sticky element under it would. */

/* Collapses the top nav out of the way while scrolling down (reclaiming
   its space for content), and brings it right back on any upward scroll --
   the standard "hide on scroll down, show on scroll up" toolbar behavior.
   The reference point only moves once a scroll has actually covered
   MIN_DELTA_PX -- comparing every single scroll tick to the immediately
   preceding one is sensitive enough to flip-flop (hide, then immediately
   show again) on the small back-and-forth jitter a real touch scroll
   produces, instead of reacting to the overall direction the page is
   actually moving in. Read at most once per animation frame (rAF-throttled)
   rather than on every 'scroll' event, which can fire many times faster
   than the page can usefully react to. */
const MIN_DELTA_PX = 24

function useHideTopbarOnScroll() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    function evaluate() {
      ticking = false
      const y = window.scrollY
      const delta = y - lastY
      if (y <= 40) {
        setHidden(false)
        lastY = y
      } else if (delta > MIN_DELTA_PX) {
        setHidden(true)
        lastY = y
      } else if (delta < -MIN_DELTA_PX) {
        setHidden(false)
        lastY = y
      }
    }
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(evaluate)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return hidden
}

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
  const topbarHidden = useHideTopbarOnScroll()
  const [tab, setTab] = useState('dashboard')
  const [periodLabel, setPeriodLabel] = useState(null)
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
    outputs,
    addOutput,
    removeOutput,
    outputsSkipped,
    confirmNoOutputs,
    undoNoOutputs,
    cigarettes,
    setCigarettes,
    food,
    setFoodField,
    diary,
    setDiaryEntry,
    goals,
    setGoal,
    exportData,
    importData,
  } = useHabitData()

  return (
    <div className="app">
      <div className="app-topbar">
        <div className={`app-topbar__inner ${topbarHidden ? 'app-topbar__inner--hidden' : ''}`}>
          <TopNav active={tab} onChange={setTab} />
        </div>

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
        {tab === 'dashboard' && (
          <DashboardView
            activities={activities}
            durations={durations}
            checklist={checklist}
            cigarettes={cigarettes}
            outputs={outputs}
            food={food}
            goals={goals}
            onPeriodLabel={setPeriodLabel}
          />
        )}
        {tab === 'calendar' && (
          <DayAgenda
            activities={activities}
            durations={durations}
            checklist={checklist}
            outputs={outputs}
            outputsSkipped={outputsSkipped}
            cigarettes={cigarettes}
            food={food}
            diary={diary}
            onAddDuration={addDuration}
            onRemoveDuration={removeDuration}
            onToggleChecklist={toggleChecklist}
            onAddOutput={addOutput}
            onRemoveOutput={removeOutput}
            onConfirmNoOutputs={confirmNoOutputs}
            onUndoNoOutputs={undoNoOutputs}
            onSetCigarettes={setCigarettes}
            onSetFoodField={setFoodField}
            onSetDiaryEntry={setDiaryEntry}
            onPeriodLabel={setPeriodLabel}
          />
        )}
        {tab === 'report' && (
          <ReportView
            activities={activities}
            durations={durations}
            checklist={checklist}
            outputs={outputs}
            cigarettes={cigarettes}
            food={food}
            diary={diary}
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
