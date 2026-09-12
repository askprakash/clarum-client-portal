import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../components/Modal'
import { portalService } from '../services/portalService'
import type { NewStaffInput, ProvisionedAccount, StaffMember } from '../types'

const emptyForm: NewStaffInput = { displayName: '', email: '' }

export function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<NewStaffInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [credentials, setCredentials] = useState<ProvisionedAccount | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<StaffMember | null>(null)

  function load() {
    setLoading(true)
    portalService
      .listStaff()
      .then((items) => setStaff(items))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Staff could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const result = await portalService.createStaff(form)
      setCredentials(result)
      setShowAddModal(false)
      setForm(emptyForm)
      load()
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not create the staff account.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(member: StaffMember) {
    setBusyId(member.id)
    setError('')
    try {
      await portalService.setStaffStatus(member.id, member.status === 'disabled' ? 'active' : 'disabled')
      load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the staff account.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setBusyId(editing.id)
    try { const updated = await portalService.updateStaff(editing.id, editing.displayName); setStaff((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditing(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the staff account.') }
    finally { setBusyId(null) }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Firm</p>
          <h1>Staff</h1>
          <p className="lede">Staff accounts can sign in as administrators and open every client.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setShowAddModal(true)}>
          Add staff
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      <article className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th className="data-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4}>Loading staff…</td>
                </tr>
              )}
              {!loading && staff.length === 0 && (
                <tr>
                  <td colSpan={4}>No staff accounts yet.</td>
                </tr>
              )}
              {staff.map((member) => (
                <tr key={member.id}>
                  <td data-label="Name"><span className="person-cell"><span className="role-icon role-icon--staff" aria-hidden="true">✦</span><span>{member.displayName}</span></span></td>
                  <td data-label="Email">{member.email}</td>
                  <td data-label="Status">{member.status === 'disabled' ? 'Disabled' : 'Active'}</td>
                  <td data-label="Actions" className="data-table__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      disabled={busyId === member.id}
                      onClick={() => void toggleStatus(member)}
                    >
                      {member.status === 'disabled' ? 'Activate' : 'Deactivate'}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setEditing({ ...member })}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {showAddModal && (
        <Modal title="Add staff" onClose={() => setShowAddModal(false)}>
          <form className="upload-form" onSubmit={(event) => void handleAdd(event)}>
            {formError && <p role="alert">{formError}</p>}
            <label className="field">
              <span>Name</span>
              <input
                required
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
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
            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create staff account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit staff" onClose={() => setEditing(null)}>
          <form className="upload-form" onSubmit={(event) => void handleEdit(event)}>
            <label className="field"><span>Name</span><input required value={editing.displayName} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} /></label>
            <label className="field"><span>Email (cannot be changed)</span><input value={editing.email} disabled /></label>
            <div className="form-actions"><button type="submit" className="btn btn--primary" disabled={busyId === editing.id}>Save changes</button></div>
          </form>
        </Modal>
      )}

      {credentials && (
        <Modal title="Staff account created" onClose={() => setCredentials(null)}>
          <p>Share these sign-in details securely. This password is shown only once.</p>
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
          <p className="muted">They will be asked to set a new password the first time they sign in.</p>
        </Modal>
      )}
    </section>
  )
}
