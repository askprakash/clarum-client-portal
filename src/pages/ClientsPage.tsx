import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { portalService } from '../services/portalService'
import type { ClientProfile, NewClientInput, ProvisionedAccount } from '../types'

type ClientsPageProps = {
  onOpenClient: (client: ClientProfile) => void
}

const emptyForm: NewClientInput = {
  organization: '',
  fullName: '',
  email: '',
  phone: '',
  mailingAddress: '',
  preferredContact: 'Email',
}

export function ClientsPage({ onOpenClient }: ClientsPageProps) {
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<NewClientInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [credentials, setCredentials] = useState<ProvisionedAccount | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ClientProfile | null>(null)

  function load() {
    setLoading(true)
    portalService
      .listClients()
      .then((items) => setClients(items))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Clients could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAddClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const result = await portalService.createClient(form)
      setCredentials(result)
      setShowAddModal(false)
      setForm(emptyForm)
      load()
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not create the client.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(client: ClientProfile) {
    setBusyId(client.id)
    setError('')
    try {
      await portalService.setClientStatus(client.id, client.status === 'disabled' ? 'active' : 'disabled')
      load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the client.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setBusyId(editing.id)
    try {
      const updated = await portalService.updateClient(editing.id, {
        organization: editing.organization, fullName: editing.fullName, email: editing.email,
        phone: editing.phone === 'Not provided' ? '' : editing.phone,
        mailingAddress: editing.mailingAddress === 'Not provided' ? '' : editing.mailingAddress,
        preferredContact: editing.preferredContact,
      })
      setClients((current) => current.map((item) => item.id === updated.id ? updated : item))
      setEditing(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the client.') }
    finally { setBusyId(null) }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Firm</p>
          <h1>Clients</h1>
          <p className="lede">Open a client to review documents, uploads, and profile details.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setShowAddModal(true)}>
          Add client
        </button>
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
                <th className="data-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4}>Loading clients…</td>
                </tr>
              )}
              {!loading && clients.length === 0 && (
                <tr>
                  <td colSpan={4}>No clients are assigned yet.</td>
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
                  <td data-label="Status">{client.status === 'disabled' ? 'Disabled' : 'Active'}</td>
                  <td data-label="Actions" className="data-table__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      disabled={busyId === client.id}
                      onClick={() => void toggleStatus(client)}
                    >
                      {client.status === 'disabled' ? 'Activate' : 'Deactivate'}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setEditing({ ...client })}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {showAddModal && (
        <Modal title="Add client" onClose={() => setShowAddModal(false)}>
          <form className="upload-form" onSubmit={(event) => void handleAddClient(event)}>
            {formError && <p role="alert">{formError}</p>}
            <label className="field">
              <span>Organization</span>
              <input
                required
                value={form.organization}
                onChange={(event) => setForm({ ...form, organization: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Contact name</span>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Phone (optional)</span>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label className="field">
              <span>Mailing address (optional)</span>
              <textarea
                rows={2}
                value={form.mailingAddress}
                onChange={(event) => setForm({ ...form, mailingAddress: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Preferred contact</span>
              <select
                value={form.preferredContact}
                onChange={(event) =>
                  setForm({ ...form, preferredContact: event.target.value as 'Email' | 'Phone' })
                }
              >
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create client account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit client" onClose={() => setEditing(null)}>
          <form className="upload-form" onSubmit={(event) => void handleEdit(event)}>
            <label className="field"><span>Organization</span><input required value={editing.organization} onChange={(event) => setEditing({ ...editing, organization: event.target.value })} /></label>
            <label className="field"><span>Contact name</span><input required value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} /></label>
            <label className="field"><span>Email (cannot be changed)</span><input value={editing.email} disabled /></label>
            <label className="field"><span>Phone</span><input value={editing.phone === 'Not provided' ? '' : editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} /></label>
            <label className="field"><span>Mailing address</span><textarea rows={2} value={editing.mailingAddress === 'Not provided' ? '' : editing.mailingAddress} onChange={(event) => setEditing({ ...editing, mailingAddress: event.target.value })} /></label>
            <div className="form-actions"><button type="submit" className="btn btn--primary" disabled={busyId === editing.id}>Save changes</button></div>
          </form>
        </Modal>
      )}

      {credentials && (
        <Modal title="Client account created" onClose={() => setCredentials(null)}>
          <p>
            Share these sign-in details with the client through a channel you trust (phone call, secure
            message). This password is shown only once — it is not stored anywhere after you close this window.
          </p>
          <dl className="detail-list">
            <div>
              <dt>Portal URL</dt>
              <dd>portal.clarumcpa.com</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{credentials.email}</dd>
            </div>
            <div>
              <dt>Temporary password</dt>
              <dd>{credentials.temporaryPassword}</dd>
            </div>
          </dl>
          <p className="muted">Keep these sign-in details secure.</p>
        </Modal>
      )}
    </section>
  )
}
