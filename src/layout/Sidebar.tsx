import type { AppView } from '../types'

type NavItem = {
  id: AppView
  label: string
}

const clientNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'documents', label: 'Documents' },
  { id: 'upload', label: 'Upload Documents' },
  { id: 'profile', label: 'Profile' },
]

type SidebarProps = {
  currentView: AppView
  isAdmin?: boolean
  clientOpen?: boolean
  onNavigate: (view: AppView) => void
  onSignOut: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  currentView,
  isAdmin = false,
  clientOpen = false,
  onNavigate,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: NavItem[] = isAdmin
    ? [
        { id: 'clients', label: 'Clients' },
        { id: 'staff', label: 'Staff' },
        ...(clientOpen ? clientNavItems : []),
      ]
    : clientNavItems

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
