import type { AppView } from '../types'

type NavItem = {
  id: AppView
  label: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'documents', label: 'Documents' },
  { id: 'upload', label: 'Upload Documents' },
  { id: 'profile', label: 'Profile' },
]

type SidebarProps = {
  currentView: AppView
  onNavigate: (view: AppView) => void
  onSignOut: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  currentView,
  onNavigate,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  function handleNavigate(view: AppView) {
    onNavigate(view)
    onCloseMobile()
  }

  return (
    <aside className={mobileOpen ? 'sidebar is-open' : 'sidebar'} aria-label="Primary">
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === currentView ? 'nav-link is-active' : 'nav-link'}
            aria-current={item.id === currentView ? 'page' : undefined}
            onClick={() => handleNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button type="button" className="nav-link nav-link--muted" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
