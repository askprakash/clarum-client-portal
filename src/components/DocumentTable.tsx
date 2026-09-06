import { useState } from 'react'
import { portalService } from '../services/portalService'
import type { ClientDocument } from '../types'
import { formatDate } from '../utils/format'

type DocumentTableProps = {
  documents: ClientDocument[]
  emptyMessage?: string
}

export function DocumentTable({
  documents,
  emptyMessage = 'No documents to display.',
}: DocumentTableProps) {
  const [error, setError] = useState('')

  async function handleOpen(document: ClientDocument, download: boolean) {
    setError('')
    try {
      await portalService.openDocument(document, download)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The document could not be opened.')
    }
  }

  if (documents.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document name</th>
              <th>Category</th>
              <th>Date</th>
              <th className="data-table__actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td data-label="Document name">
                  <div className="doc-name">
                    <span>{document.name}</span>
                    <span className="doc-meta">{document.fileType}</span>
                  </div>
                </td>
                <td data-label="Category">{document.category}</td>
                <td data-label="Date">{formatDate(document.date)}</td>
                <td data-label="Actions" className="data-table__actions">
                  <div className="action-row">
                    <button type="button" className="btn btn--ghost" onClick={() => void handleOpen(document, false)}>
                      View
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => void handleOpen(document, true)}>
                      Download
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
