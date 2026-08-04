import { useLayoutEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import DashboardView from './components/DashboardView'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

/* screen.height was tried as a floor in standalone mode (on the theory that
   window.innerHeight/visualViewport.height under-report the true screen
   height), but on the real device it made things worse: the actual
   paintable/interactive canvas genuinely tops out at the measured value, so
   stretching .app past it pushed the nav below the real visible area
   instead of closing the gap above it. visualViewport is the correct,
   trustworthy measurement -- back to using it directly.

   One wrinkle: visualViewport.height also shrinks when the on-screen
   keyboard opens. Once .bottom-nav became position:absolute against .app
   (so content can scroll under it), letting --app-height shrink for the
   keyboard collapsed the whole layout instead of just resizing it -- the
   nav (anchored to .app's now much shorter bottom edge) ended up stranded
   mid-screen. iOS already scrolls the focused input above the keyboard on
   its own, so .app doesn't need to shrink for that at all: a big, sudden
   drop from the tallest height seen is treated as "keyboard opened" and
   ignored, keeping the last keyboard-closed height instead. */
function useAppHeightVar() {
  useLayoutEffect(() => {
    const root = document.documentElement
    let maxHeight = 0
    const setAppHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight
      if (maxHeight - height > 150) return
      maxHeight = Math.max(maxHeight, height)
      root.style.setProperty('--app-height', `${maxHeight}px`)
    }
    const resetAndSetAppHeight = () => {
      maxHeight = 0
      setAppHeight()
    }
    setAppHeight()
    window.addEventListener('resize', setAppHeight)
    window.addEventListener('orientationchange', resetAndSetAppHeight)
    window.addEventListener('pageshow', resetAndSetAppHeight)
    window.visualViewport?.addEventListener('resize', setAppHeight)
    return () => {
      window.removeEventListener('resize', setAppHeight)
      window.removeEventListener('orientationchange', resetAndSetAppHeight)
      window.removeEventListener('pageshow', resetAndSetAppHeight)
      window.visualViewport?.removeEventListener('resize', setAppHeight)
    }
  }, [])
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="7" x2="19" y2="7" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
      <line x1="5" y1="13" x2="19" y2="13" />
      <circle cx="16" cy="13" r="2" fill="currentColor" stroke="none" />
      <line x1="5" y1="19" x2="19" y2="19" />
      <circle cx="11" cy="19" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function App() {
  useAppHeightVar()
  const [tab, setTab] = useState('dashboard')
  const [periodLabel, setPeriodLabel] = useState(null)
  const [settingsInitialTab, setSettingsInitialTab] = useState('goals')
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
      <header className="app-header">
        <button type="button" className="app-header__left" onClick={() => setTab('dashboard')}>
          <h1 className="app-header__brand">
            Weekl<span className="app-header__brand-accent">y</span>
          </h1>
        </button>
        <p className="app-header__period">{periodLabel || (tab === 'settings' ? 'Impostazioni' : '')}</p>
        <button
          type="button"
          className={`header-settings-btn ${tab === 'settings' ? 'is-active' : ''}`}
          onClick={() => setTab('settings')}
          aria-label="Impostazioni"
        >
          <SettingsIcon />
        </button>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && (
          <DashboardView
            activities={activities}
            entries={entries}
            cigarettes={cigarettes}
            outputs={outputs}
            food={food}
            goals={goals}
            onOpenSettings={(subtab) => {
              setSettingsInitialTab(subtab || 'goals')
              setTab('settings')
            }}
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
            initialTab={settingsInitialTab}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

export default App
