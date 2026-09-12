import { Logo } from '../components/Logo'
import type { ClientProfile } from '../types'

type TopBarProps = {
  client: ClientProfile
  isAdmin?: boolean
  mobileNavOpen: boolean
  onToggleMobileNav: () => void
}

export function TopBar({ client, isAdmin = false, mobileNavOpen, onToggleMobileNav }: TopBarProps) {
  const initials = client.fullName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="menu-toggle"
          aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileNavOpen}
          onClick={onToggleMobileNav}
        >
          <span />
          <span />
          <span />
        </button>
        <Logo />
      </div>
      <div className="topbar__right">
        <button className="topbar__icon" aria-label="Notifications" type="button">♧<span>1</span></button>
        <div className="avatar">{initials}</div>
        <div className="topbar__identity">
          <p className="topbar__client">{client.fullName}</p>
          <p className="topbar__org">{isAdmin ? 'Administrator' : client.organization}</p>
        </div>
        <span className="topbar__chevron">⌄</span>
      </div>
    </header>
  )
}
