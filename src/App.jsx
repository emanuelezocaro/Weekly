import { useState } from 'react'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import TopNav from './components/TopNav'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

const TITLES = {
  calendar: 'Calendario',
  report: 'Report',
  settings: 'Impostazioni',
}

function App() {
  const [tab, setTab] = useState('calendar')
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
    exportData,
    importData,
    settings,
    setSettings,
    syncStatus,
    syncNow,
  } = useHabitData()

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__left">
          <h1>Weekly</h1>
          <p className="app-header__subtitle">{TITLES[tab]}</p>
        </div>
        <div className="app-header__sep" />
        <TopNav active={tab} onChange={setTab} />
      </header>

      <main className="app-main">
        {tab === 'calendar' && (
          <DayAgenda
            activities={activities}
            entries={entries}
            outputs={outputs}
            onEditEntry={editEntry}
            onRemoveEntry={removeEntry}
            onAddManualEntry={addManualEntry}
            onAddOutput={addOutput}
            onRemoveOutput={removeOutput}
          />
        )}
        {tab === 'report' && (
          <ReportView activities={activities} entries={entries} outputs={outputs} />
        )}
        {tab === 'settings' && (
          <SettingsView
            activities={activities}
            onAdd={addActivity}
            onRename={renameActivity}
            onDelete={deleteActivity}
            onExport={exportData}
            onImport={importData}
            settings={settings}
            setSettings={setSettings}
            syncStatus={syncStatus}
            onSyncNow={syncNow}
          />
        )}
      </main>
    </div>
  )
}

export default App
