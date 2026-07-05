import { useState } from 'react'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import TopNav from './components/TopNav'
import { useHabitData } from './hooks/useHabitData'
import { useNotifications } from './hooks/useNotifications'
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
    exportData,
    importData,
    settings,
    setSettings,
    syncStatus,
    syncNow,
  } = useHabitData()

  const notifications = useNotifications({
    enabled: settings.notifEnabled,
    time: settings.notifTime,
  })

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
            onEditEntry={editEntry}
            onRemoveEntry={removeEntry}
            onAddManualEntry={addManualEntry}
          />
        )}
        {tab === 'report' && <ReportView activities={activities} entries={entries} />}
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
            notifications={notifications}
          />
        )}
      </main>
    </div>
  )
}

export default App
