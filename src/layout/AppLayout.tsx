import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { AppView, ClientProfile } from '../types'
import type { ReactNode } from 'react'

type AppLayoutProps = {
  currentView: AppView
  client: ClientProfile
  isAdmin?: boolean
  clientOpen?: boolean
  mobileNavOpen: boolean
  onNavigate: (view: AppView) => void
  onToggleMobileNav: () => void
  onCloseMobileNav: () => void
  onSignOut: () => void
  children: ReactNode
}

export function AppLayout({
  currentView,
  client,
  isAdmin = false,
  clientOpen = false,
  mobileNavOpen,
  onNavigate,
  onToggleMobileNav,
  onCloseMobileNav,
  onSignOut,
  children,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <TopBar
        client={client}
        isAdmin={isAdmin}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={onToggleMobileNav}
      />
      {mobileNavOpen && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={onCloseMobileNav}
        />
      )}
      <div className="app-body">
        <Sidebar
          currentView={currentView}
          isAdmin={isAdmin}
          clientOpen={clientOpen}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          mobileOpen={mobileNavOpen}
          onCloseMobile={onCloseMobileNav}
        />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
