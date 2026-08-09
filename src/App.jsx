import { useLayoutEffect, useRef, useState } from 'react'
import TopNav from './components/TopNav'
import DashboardView from './components/DashboardView'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

/* The page now scrolls naturally (see App.css/index.css), with the header
   and top nav pinned via position: sticky instead of living outside a
   fixed-height scroll container. Each view's own segmented tab strip is
   also sticky, and needs to stop right below the topbar rather than
   underneath it -- but the topbar's height isn't a fixed number (it grows
   with env(safe-area-inset-top), which varies by device), so it's
   measured directly and exposed as --topbar-height for that sticky offset
   to use instead of a guessed constant. */
function useTopbarHeightVar(topbarRef) {
  useLayoutEffect(() => {
    const el = topbarRef.current
    if (!el) return
    const root = document.documentElement
    const setTopbarHeight = () => {
      root.style.setProperty('--topbar-height', `${el.getBoundingClientRect().height}px`)
    }
    setTopbarHeight()
    const observer = new ResizeObserver(setTopbarHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [topbarRef])
}

/* Media-player "skip" glyph (triangle + bar) instead of a plain arrow --
   filled with the logo's own oxblood (#57101f, see .app-header__brand) so
   it reads as tied to the brand, not a generic system icon. Mirrored via
   scaleX for the "prev" direction rather than drawn twice. */
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
  const topbarRef = useRef(null)
  useTopbarHeightVar(topbarRef)
  const [tab, setTab] = useState('dashboard')
  const [periodLabel, setPeriodLabel] = useState(null)
  const {
    activities,
    entries,
    editEntry,
    removeEntry,
    addManualEntry,
    addActivity,
    renameActivity,
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
      <div className="app-topbar" ref={topbarRef}>
        <header className="app-header">
          <button type="button" className="app-header__left" onClick={() => setTab('dashboard')}>
            <h1 className="app-header__brand">
              Weekl<span className="app-header__brand-accent">y</span>
            </h1>
          </button>
          <div className="app-header__period-group">
            <span className="app-header__arrow-slot">
              {periodLabel?.prevAvailable && <SkipIcon direction="prev" />}
            </span>
            <p className="app-header__period">{periodLabel?.label}</p>
            <span className="app-header__arrow-slot">
              {periodLabel?.nextAvailable && <SkipIcon direction="next" />}
            </span>
          </div>
        </header>

        <TopNav active={tab} onChange={setTab} />
      </div>

      <main className="app-main">
        {tab === 'dashboard' && (
          <DashboardView
            activities={activities}
            entries={entries}
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
            entries={entries}
            outputs={outputs}
            outputsSkipped={outputsSkipped}
            cigarettes={cigarettes}
            food={food}
            diary={diary}
            onEditEntry={editEntry}
            onRemoveEntry={removeEntry}
            onAddManualEntry={addManualEntry}
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
            entries={entries}
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
