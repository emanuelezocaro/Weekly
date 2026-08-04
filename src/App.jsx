import { useEffect, useLayoutEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import DashboardView from './components/DashboardView'
import DayAgenda from './components/DayAgenda'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import { useHabitData } from './hooks/useHabitData'
import './App.css'

/* visualViewport tracks the *actual* visible height on iOS more reliably
   than any CSS unit tried so far (see App.css) -- but on a home-screen PWA
   cold launch it can itself report a too-short height for the first moment
   after opening, with no resize event ever firing afterward to correct it.
   screen.height is the true physical portrait height, so it's used as a
   floor only during that initial settle window; after that, live
   measurements take over uncapped so real shrinks (the on-screen keyboard
   opening) still work normally. */
function useAppHeightVar() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    let settled = false
    const setAppHeight = () => {
      const measured = window.visualViewport?.height ?? window.innerHeight
      const height = !settled && isStandalone ? Math.max(measured, window.screen.height) : measured
      root.style.setProperty('--app-height', `${height}px`)
    }
    setAppHeight()
    const retryTimers = [50, 150, 300, 600, 1000].map((delay) => setTimeout(setAppHeight, delay))
    const settleTimer = setTimeout(() => {
      settled = true
      setAppHeight()
    }, 1200)
    window.addEventListener('resize', setAppHeight)
    window.addEventListener('orientationchange', setAppHeight)
    window.addEventListener('pageshow', setAppHeight)
    window.visualViewport?.addEventListener('resize', setAppHeight)
    return () => {
      retryTimers.forEach(clearTimeout)
      clearTimeout(settleTimer)
      window.removeEventListener('resize', setAppHeight)
      window.removeEventListener('orientationchange', setAppHeight)
      window.removeEventListener('pageshow', setAppHeight)
      window.visualViewport?.removeEventListener('resize', setAppHeight)
    }
  }, [])
}

/* TEMPORARY diagnostic overlay -- every previous fix for the standalone-mode
   bottom-nav gap has looked correct locally and still failed on the user's
   real device, so instead of guessing again this reads the actual numbers
   from that device directly. Remove once the real cause is found. */
function DebugHeightBadge() {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;bottom:0;left:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;'
    document.body.appendChild(probe)
    const safeBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0
    document.body.removeChild(probe)

    const update = () => {
      const appEl = document.querySelector('.app')
      const navEl = document.querySelector('.bottom-nav')
      const appRect = appEl?.getBoundingClientRect()
      const navRect = navEl?.getBoundingClientRect()
      setInfo({
        innerH: window.innerHeight,
        vvH: window.visualViewport?.height,
        vvTop: window.visualViewport?.offsetTop,
        scrH: window.screen.height,
        docH: document.documentElement.clientHeight,
        appH: appRect ? Math.round(appRect.height) : null,
        appBottom: appRect ? Math.round(appRect.bottom) : null,
        navBottom: navRect ? Math.round(navRect.bottom) : null,
        navTop: navRect ? Math.round(navRect.top) : null,
        safeBottom,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
      })
    }
    update()
    const id = setInterval(update, 500)
    window.addEventListener('resize', update)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', update)
    }
  }, [])

  if (!info) return null
  return (
    <pre
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 4px)',
        left: 4,
        zIndex: 9999,
        margin: 0,
        padding: '6px 8px',
        fontSize: 10,
        lineHeight: 1.4,
        background: 'rgba(0,0,0,0.8)',
        color: '#5f5',
        borderRadius: 6,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        whiteSpace: 'pre',
      }}
    >
      {`innerH:${info.innerH} vvH:${info.vvH} vvTop:${info.vvTop}
scrH:${info.scrH} docH:${info.docH}
appH:${info.appH} appBottom:${info.appBottom}
navTop:${info.navTop} navBottom:${info.navBottom}
safeBottom:${info.safeBottom} standalone:${String(info.standalone)}`}
    </pre>
  )
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
    <>
      <DebugHeightBadge />
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
    </>
  )
}

export default App
