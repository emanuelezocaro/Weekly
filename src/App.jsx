import { useState } from 'react'
import BottomNav from './components/BottomNav'
import CalendarView from './components/CalendarView'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
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
    logs,
    toggleEntry,
    addActivity,
    renameActivity,
    deleteActivity,
    reorderActivities,
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
        <h1>Weekly</h1>
        <p className="app-header__subtitle">{TITLES[tab]}</p>
      </header>

      <main className="app-main">
        {tab === 'calendar' && (
          <CalendarView activities={activities} logs={logs} onToggle={toggleEntry} />
        )}
        {tab === 'report' && <ReportView activities={activities} logs={logs} />}
        {tab === 'settings' && (
          <SettingsView
            activities={activities}
            onAdd={addActivity}
            onRename={renameActivity}
            onDelete={deleteActivity}
            onReorder={reorderActivities}
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

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

export default App
