import { useState } from 'react'
import type { ClientDocument } from '../types'
import { formatDate } from '../utils/format'
import { Modal } from './Modal'

type DocumentTableProps = {
  documents: ClientDocument[]
  emptyMessage?: string
}

function downloadPlaceholder(document: ClientDocument) {
  const content = [
    'CLARUM Client Portal',
    'Sample file — not connected to SharePoint.',
    '',
    `Document: ${document.name}`,
    `Category: ${document.category}`,
    `Date: ${document.date}`,
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `${document.name.replace(/[^\w.-]+/g, '_')}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export function DocumentTable({
  documents,
  emptyMessage = 'No documents to display.',
}: DocumentTableProps) {
  const [viewing, setViewing] = useState<ClientDocument | null>(null)

  if (documents.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <>
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
                    <button type="button" className="btn btn--ghost" onClick={() => setViewing(document)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => downloadPlaceholder(document)}
                    >
                      Download
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <dl className="detail-list">
            <div>
              <dt>Category</dt>
              <dd>{viewing.category}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(viewing.date)}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{viewing.fileType}</dd>
            </div>
            {viewing.attentionReason && (
              <div>
                <dt>Attention</dt>
                <dd>{viewing.attentionReason}</dd>
              </div>
            )}
          </dl>
          <p className="muted">
            Document preview will be available after Microsoft Graph and SharePoint
            are connected.
          </p>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={() => setViewing(null)}>
              Close
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => downloadPlaceholder(viewing)}
            >
              Download
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
