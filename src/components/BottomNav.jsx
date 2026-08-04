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

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: HomeIcon },
  { id: 'calendar', label: 'Add', Icon: CalendarIcon },
  { id: 'report', label: 'Report', Icon: ReportIcon },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav__tab bottom-nav__tab--${id} ${active === id ? 'is-active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
