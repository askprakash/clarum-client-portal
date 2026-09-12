import { portalService } from '../services/portalService'
import type { AppView } from '../types'

type DashboardPageProps = {
  onNavigate: (view: AppView) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const client = portalService.getCurrentClient()

  return (
    <section className="page">
      <div className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">Welcome back, {client.fullName.split(' ')[0]}</p>
          <h1>Your Client Portal</h1>
        </div>
        <div className="hero-panel__art"><img src="/clarum-login-hero.jpg" alt="" /></div>
        <div className="hero-panel__quote">Great<br />Partnerships<br />Build Brighter<br />Futures<span /></div>
      </div>

      <div className="quick-actions">
        {[
          ['▤', 'View Projects', 'Check project status and milestones', 'dashboard'],
          ['▧', 'Access Documents', 'View and download important files', 'documents'],
        ].map(([icon, title, detail, target]) => <button type="button" className="quick-card" key={title} onClick={() => onNavigate(target as AppView)}><span className="quick-card__icon">{icon}</span><strong>{title}</strong><span>{detail}</span><b>→</b></button>)}
      </div>
    </section>
  )
}
