import { useEffect, useMemo, useState } from 'react'
import { DocumentTable } from '../components/DocumentTable'
import { portalService } from '../services/portalService'
import type { ClientDocument, DocumentCategory } from '../types'

const categories: Array<DocumentCategory | 'All'> = [
  'All',
  'Tax Returns',
  'Organizers',
  'Financial Statements',
  'Engagement Letters',
  'Payroll',
  'Correspondence',
]

export function DocumentsPage() {
  const client = portalService.getCurrentClient()
  const [category, setCategory] = useState<(typeof categories)[number]>('All')
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    portalService
      .listDocuments()
      .then((items) => {
        if (!cancelled) setDocuments(items)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Documents could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () => (category === 'All' ? documents : documents.filter((doc) => doc.category === category)),
    [category, documents],
  )

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Files</p>
          <h1>Documents</h1>
          <p className="lede">
            View and download files prepared for {client.organization}. Uploads are stored
            for your account after server-side authorization.
          </p>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}

      <article className="card">
        <div className="card__header card__header--wrap">
          <h2>All documents</h2>
          <label className="filter">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p className="empty-state">Loading documents…</p>
        ) : (
          <DocumentTable documents={filtered} emptyMessage="No documents in this category." />
        )}
      </article>
    </section>
  )
}
