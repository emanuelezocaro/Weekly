function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11 L12 4 L20 11" />
      <path d="M6 10 V20 H18 V10" />
    </svg>
  )
}

// A day tile with a "+" instead of the usual calendar grid -- this is the
// section where you add entries (blocks, uscite, sigarette, cibo), so the
// icon should say that at a glance, not just "calendar".
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <line x1="12" y1="10" x2="12" y2="16" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="18" x2="6" y2="12" />
      <line x1="12" y1="18" x2="12" y2="7" />
      <line x1="18" y1="18" x2="18" y2="14" />
    </svg>
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

const TABS = [
  { id: 'dashboard', label: 'Dash', Icon: HomeIcon },
  { id: 'calendar', label: 'Add', Icon: CalendarIcon },
  { id: 'report', label: 'Report', Icon: ReportIcon },
  { id: 'settings', label: 'Set', Icon: SettingsIcon },
]

export default function TopNav({ active, onChange }) {
  return (
    <nav className="top-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`top-nav__tab top-nav__tab--${id} ${active === id ? 'is-active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
