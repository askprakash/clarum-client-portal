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
      <div className="welcome">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome, {client.organization}</h1>
          <p className="lede">
            Review recent files, complete items that need your attention, and send
            documents to CLARUM when you are ready.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => onNavigate('upload')}>
          Quick Upload
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      <div className="dashboard-grid">
        <article className="card card--span-2">
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
      </div>
    </section>
  )
}
