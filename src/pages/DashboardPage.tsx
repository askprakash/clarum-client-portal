import { useEffect, useState } from 'react'
import { ActivityFeed } from '../components/ActivityFeed'
import { DocumentTable } from '../components/DocumentTable'
import { portalService } from '../services/portalService'
import type { AppView, ClientDocument } from '../types'
import { formatDate } from '../utils/format'

type DashboardPageProps = {
  onNavigate: (view: AppView) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const client = portalService.getCurrentClient()
  const [recentDocuments, setRecentDocuments] = useState<ClientDocument[]>([])
  const [attentionDocuments, setAttentionDocuments] = useState<ClientDocument[]>([])
  const [error, setError] = useState('')
  const activity = portalService.listActivity()

  useEffect(() => {
    let cancelled = false
    Promise.all([
      portalService.listRecentDocuments(4),
      portalService.listDocumentsNeedingAttention(),
    ])
      .then(([recent, attention]) => {
        if (cancelled) return
        setRecentDocuments(recent)
        setAttentionDocuments(attention)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Documents could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="page">
      <div className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">Welcome back, {client.fullName.split(' ')[0]}</p>
          <h1>Your Client Portal</h1>
          <p className="hero-panel__subtitle">Everything you need, all in one place.</p>
          <p className="lede">Track progress, access documents, manage invoices and stay connected with our team.</p>
        </div>
        <div className="hero-panel__art"><img src="/clarum-login-hero.jpg" alt="" /></div>
        <div className="hero-panel__quote">Great<br />Partnerships<br />Build Brighter<br />Futures<span /></div>
      </div>

      {error && <p role="alert">{error}</p>}

      <div className="quick-actions">
        {[
          ['▤', 'View Projects', 'Check project status and milestones', 'dashboard'],
          ['▧', 'Access Documents', 'View and download important files', 'documents'],
          ['▣', 'Manage Invoices', 'View billing and make payments', 'documents'],
          ['☏', 'Send a Message', 'Get in touch with our team', 'profile'],
        ].map(([icon, title, detail, target]) => <button type="button" className="quick-card" key={title} onClick={() => onNavigate(target as AppView)}><span className="quick-card__icon">{icon}</span><strong>{title}</strong><span>{detail}</span><b>→</b></button>)}
      </div>
      <div className="dashboard-grid dashboard-grid--portal">
        <article className="card">
          <div className="card__header">
            <h2>Recent documents</h2>
            <button type="button" className="text-link" onClick={() => onNavigate('documents')}>
              View all
            </button>
          </div>
          <DocumentTable documents={recentDocuments} />
        </article>

        <article className="card">
          <div className="card__header">
            <h2>Documents requiring attention</h2>
            <span className="count-pill">{attentionDocuments.length}</span>
          </div>
          {attentionDocuments.length === 0 ? (
            <p className="empty-state">Nothing needs your attention right now.</p>
          ) : (
            <ul className="attention-list">
              {attentionDocuments.map((document) => (
                <li key={document.id}>
                  <p className="attention-list__name">{document.name}</p>
                  <p className="muted">{document.attentionReason}</p>
                  <p className="attention-list__meta">
                    {document.category} · {formatDate(document.date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <div className="card__header">
            <h2>Recent activity</h2>
          </div>
          <ActivityFeed items={activity} />
        </article>
        <article className="card">
          <div className="card__header"><h2>Need help?</h2><button type="button" className="text-link">Contact support</button></div>
          <p className="lede">Our team is here to support you. Send us a message and we’ll get back to you shortly.</p>
          <button type="button" className="btn btn--primary" onClick={() => onNavigate('profile')}>Contact support&nbsp; →</button>
        </article>
      </div>
    </section>
  )
}
