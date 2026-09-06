import { useEffect, useState } from 'react'
import { portalService } from '../services/portalService'
import type { ClientProfile } from '../types'

type ClientsPageProps = {
  onOpenClient: (client: ClientProfile) => void
}

export function ClientsPage({ onOpenClient }: ClientsPageProps) {
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    portalService
      .listClients()
      .then((items) => {
        if (!cancelled) setClients(items)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Clients could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Firm</p>
          <h1>Clients</h1>
          <p className="lede">Open a client to review documents, uploads, and profile details.</p>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}

      <article className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3}>Loading clients…</td>
                </tr>
              )}
              {!loading && clients.length === 0 && (
                <tr>
                  <td colSpan={3}>No clients are assigned yet.</td>
                </tr>
              )}
              {clients.map((client) => (
                <tr key={client.id}>
                  <td data-label="Client">
                    <button type="button" className="text-link" onClick={() => onOpenClient(client)}>
                      {client.organization}
                    </button>
                  </td>
                  <td data-label="Email">{client.email}</td>
                  <td data-label="Status">Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
