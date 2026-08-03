import { useState } from 'react'
import DashboardView from './components/DashboardView'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import TopNav from './components/TopNav'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

const TITLES = {
  dashboard: 'Oggi',
  calendar: 'Calendario',
  report: 'Report',
  settings: 'Impostazioni',
}

function App() {
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
          <h1>Weekly</h1>
          <p className="app-header__subtitle">{TITLES[tab]}</p>
        </button>
        <div className="app-header__sep" />
        {periodLabel && <p className="app-header__period">{periodLabel}</p>}
        <TopNav active={tab} onChange={setTab} />
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
    </div>
  )
}

export default App
