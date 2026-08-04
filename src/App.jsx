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
          <p className="app-header__period">{periodLabel}</p>
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
            onEditEntry={editEntry}
            onRemoveEntry={removeEntry}
            onAddManualEntry={addManualEntry}
            onAddOutput={addOutput}
            onRemoveOutput={removeOutput}
            onConfirmNoOutputs={confirmNoOutputs}
            onUndoNoOutputs={undoNoOutputs}
            onSetCigarettes={setCigarettes}
            onSetFoodField={setFoodField}
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
