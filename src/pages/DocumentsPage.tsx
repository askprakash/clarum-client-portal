import { useEffect, useMemo, useState } from 'react'
import { DocumentTable } from '../components/DocumentTable'
import { portalService } from '../services/portalService'
import type { ClientDocument, DocumentCategory } from '../types'

export function DocumentsPage({ onUpload }: { onUpload?: () => void }) {
  const client = portalService.getCurrentClient()
  const [category, setCategory] = useState<DocumentCategory | 'All'>('All')
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  function loadDocuments() {
    setLoading(true)
    setError('')
    portalService.listDocuments()
      .then((items) => setDocuments(items))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Documents could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false)
        setError('SharePoint is taking too long to respond. Please try again.')
      }
    }, 20000)
    portalService.listDocuments().then((items) => { if (!cancelled) setDocuments(items) }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Documents could not be loaded.')
    }).finally(() => { window.clearTimeout(timeout); if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  const filtered = useMemo(
    () => (category === 'All' ? documents : documents.filter((doc) => doc.category === category)),
    [category, documents],
  )
  const categoryOptions = useMemo(() => {
    const found = [...new Set(documents.map((doc) => doc.category))]
    return ['All', ...found]
  }, [documents])

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Files</p>
          <h1>Documents</h1>
          <p className="lede">
            View and download files shared with {client.organization}. Internal CLARUM
            workpapers are not shown in the client portal.
          </p>
        </div>
        {onUpload && <button type="button" className="btn btn--primary" onClick={onUpload}>Upload document</button>}
      </div>

      {error && <p role="alert">{error} <button type="button" className="text-link" onClick={loadDocuments}>Try again</button></p>}

      <article className="card">
        <div className="card__header card__header--wrap">
          <h2>All documents</h2>
          <label className="filter">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              {categoryOptions.map((item) => (
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
