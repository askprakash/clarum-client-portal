import type { ReactNode } from 'react'
import type { AppView, ClientProfile } from '../types'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type AppLayoutProps = {
  currentView: AppView
  client: ClientProfile
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
