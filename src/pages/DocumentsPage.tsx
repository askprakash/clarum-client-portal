import { useMemo, useState } from 'react'
import { DocumentTable } from '../components/DocumentTable'
import { portalService } from '../services/portalService'
import type { DocumentCategory } from '../types'

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
  const [category, setCategory] = useState<(typeof categories)[number]>('All')
  const documents = portalService.listDocuments()

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
            View and download files prepared for Northline Manufacturing. Sample
            records are shown until SharePoint is connected.
          </p>
        </div>
      </div>

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
        <DocumentTable documents={filtered} emptyMessage="No documents in this category." />
      </article>
    </section>
  )
}
