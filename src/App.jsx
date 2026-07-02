import { useState } from 'react'
import BottomNav from './components/BottomNav'
import DayAgenda from './components/DayAgenda'
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
    entries,
    startActivity,
    editEntry,
    removeEntry,
    addManualEntry,
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
          <DayAgenda
            activities={activities}
            entries={entries}
            onStartActivity={startActivity}
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
