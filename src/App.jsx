import { useLayoutEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import DashboardView from './components/DashboardView'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

/* Confirmed on the user's real device via a diagnostic readout: in standalone
   mode, window.innerHeight / visualViewport.height permanently under-report
   the true screen height by ~59px (852 real vs 793 reported) -- not a
   momentary cold-launch glitch, it never self-corrects. That's exactly the
   gap that was showing up below the nav. screen.height is the true physical
   height, so it's used whenever the shortfall looks like this quirk (under
   120px); a much bigger shortfall means the on-screen keyboard has opened,
   and then the real (shrunk) measurement is used so focused inputs stay
   visible above it. */
function useAppHeightVar() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    const setAppHeight = () => {
      const measured = window.visualViewport?.height ?? window.innerHeight
      const deficit = window.screen.height - measured
      const height = isStandalone && deficit < 120 ? window.screen.height : measured
      root.style.setProperty('--app-height', `${height}px`)
    }
    setAppHeight()
    window.addEventListener('resize', setAppHeight)
    window.addEventListener('orientationchange', setAppHeight)
    window.addEventListener('pageshow', setAppHeight)
    window.visualViewport?.addEventListener('resize', setAppHeight)
    return () => {
      window.removeEventListener('resize', setAppHeight)
      window.removeEventListener('orientationchange', setAppHeight)
      window.removeEventListener('pageshow', setAppHeight)
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
