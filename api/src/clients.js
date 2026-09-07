import { query } from './db.js'
import { createLocalAccount, setAccountEnabled } from './graph.js'

function mapRow(row) {
  return {
    id: row.oid,
    fullName: row.full_name,
    title: row.title,
    organization: row.organization,
    email: row.email,
    phone: row.phone,
    mailingAddress: row.mailing_address,
    clientSince: row.client_since,
    engagements: JSON.parse(row.engagements || '[]'),
    preferredContact: row.preferred_contact,
    status: row.status,
  }
}

// Used by auth: only ever returns a client that is allowed to sign in right now.
export async function getActiveClientByOid(oid) {
  const result = await query("SELECT * FROM clients WHERE oid = @oid AND status = 'active'", { oid })
  return result.recordset[0] ? mapRow(result.recordset[0]) : null
}

// Used by the admin UI: returns a client regardless of status.
export async function getClientByOid(oid) {
  const result = await query('SELECT * FROM clients WHERE oid = @oid', { oid })
  return result.recordset[0] ? mapRow(result.recordset[0]) : null
}

export async function listClients() {
  const result = await query('SELECT * FROM clients ORDER BY organization', {})
  return result.recordset.map(mapRow)
}

export async function createClient({ organization, fullName, email, phone, mailingAddress, preferredContact }) {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await query('SELECT id FROM clients WHERE email = @email', { email: normalizedEmail })
  if (existing.recordset.length > 0) {
    throw new Error('A client with this email already exists')
  }

  const { oid, temporaryPassword } = await createLocalAccount({ email: normalizedEmail, displayName: fullName })

  await query(
    `INSERT INTO clients (oid, email, full_name, title, organization, phone, mailing_address, preferred_contact, status)
     VALUES (@oid, @email, @fullName, 'Client', @organization, @phone, @mailingAddress, @preferredContact, 'active')`,
    {
      oid,
      email: normalizedEmail,
      fullName,
      organization,
      phone: phone || 'Not provided',
      mailingAddress: mailingAddress || 'Not provided',
      preferredContact: preferredContact === 'Phone' ? 'Phone' : 'Email',
    },
  )

  const client = await getClientByOid(oid)
  return { client, temporaryPassword }
}

export async function setClientStatus(oid, status) {
  const existing = await getClientByOid(oid)
  if (!existing) return null

  await setAccountEnabled(oid, status === 'active')
  await query('UPDATE clients SET status = @status, updated_at = SYSUTCDATETIME() WHERE oid = @oid', {
    oid,
    status,
  })
  return getClientByOid(oid)
}
