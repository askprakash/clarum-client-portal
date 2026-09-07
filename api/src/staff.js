import { query } from './db.js'
import { createLocalAccount, setAccountEnabled } from './graph.js'

const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'prakash@clarumcpa.com').trim().toLowerCase()

function mapRow(row) {
  return {
    id: row.oid,
    displayName: row.display_name,
    email: row.email,
    status: row.status,
  }
}

export async function getActiveStaffByOid(oid) {
  const result = await query("SELECT * FROM staff WHERE oid = @oid AND status = 'active'", { oid })
  return result.recordset[0] ? mapRow(result.recordset[0]) : null
}

export async function getStaffByOid(oid) {
  const result = await query('SELECT * FROM staff WHERE oid = @oid', { oid })
  return result.recordset[0] ? mapRow(result.recordset[0]) : null
}

export async function listStaff() {
  const result = await query('SELECT * FROM staff ORDER BY display_name', {})
  return result.recordset.map(mapRow)
}

export async function countActiveStaff() {
  const result = await query("SELECT COUNT(*) AS count FROM staff WHERE status = 'active'", {})
  return result.recordset[0].count
}

export async function createStaff({ displayName, email }) {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await query('SELECT id FROM staff WHERE email = @email', { email: normalizedEmail })
  if (existing.recordset.length > 0) {
    throw new Error('A staff account with this email already exists')
  }

  const { oid, temporaryPassword } = await createLocalAccount({ email: normalizedEmail, displayName })

  await query(
    `INSERT INTO staff (oid, email, display_name, role, status) VALUES (@oid, @email, @displayName, 'admin', 'active')`,
    { oid, email: normalizedEmail, displayName },
  )

  const staff = await getActiveStaffByOid(oid)
  return { staff, temporaryPassword }
}

export async function setStaffStatus(oid, status) {
  const existing = await getStaffByOid(oid)
  if (!existing) return null

  await setAccountEnabled(oid, status === 'active')
  await query('UPDATE staff SET status = @status, updated_at = SYSUTCDATETIME() WHERE oid = @oid', {
    oid,
    status,
  })
  return getStaffByOid(oid)
}

// One-time bootstrap: the very first successful sign-in from BOOTSTRAP_ADMIN_EMAIL (defaults to
// prakash@clarumcpa.com) becomes the first staff/admin row, as long as the staff table is
// completely empty. After that, admins are managed entirely through the Staff screen — this
// path never fires again (checking total rows, not just active ones, so it can't re-fire just
// because someone later deactivated every admin).
export async function bootstrapFirstAdmin({ oid, emails, displayName }) {
  const totalCount = await query('SELECT COUNT(*) AS count FROM staff', {})
  if (totalCount.recordset[0].count > 0) return null
  if (!emails.includes(bootstrapEmail)) return null

  await query(
    `INSERT INTO staff (oid, email, display_name, role, status) VALUES (@oid, @email, @displayName, 'admin', 'active')`,
    { oid, email: bootstrapEmail, displayName: displayName || 'Administrator' },
  )
  return getActiveStaffByOid(oid)
}
