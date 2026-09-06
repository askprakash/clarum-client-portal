import { Logo } from '../components/Logo'
import type { ClientProfile } from '../types'

type TopBarProps = {
  client: ClientProfile
  mobileNavOpen: boolean
  onToggleMobileNav: () => void
}

export function TopBar({ client, mobileNavOpen, onToggleMobileNav }: TopBarProps) {
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
        <p className="topbar__client">{client.fullName}</p>
        <p className="topbar__org">{client.organization}</p>
      </div>
    </header>
  )
}
