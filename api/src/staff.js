import { createLocalAccount, setAccountEnabled } from './graph.js'
import { readState, updateState } from './store.js'

const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'prakash@clarumcpa.com').trim().toLowerCase()

function mapStaff(row) {
  return {
    id: row.oid,
    displayName: row.displayName,
    email: row.email,
    status: row.status === 'disabled' ? 'disabled' : 'active',
  }
}

export async function getActiveStaffByOid(oid) {
  const { state } = await readState()
  const row = state.staff.find((member) => member.oid === oid && member.status === 'active')
  return row ? mapStaff(row) : null
}

export async function getStaffByOid(oid) {
  const { state } = await readState()
  const row = state.staff.find((member) => member.oid === oid)
  return row ? mapStaff(row) : null
}

export async function listStaff() {
  const { state } = await readState()
  return [...state.staff]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map(mapStaff)
}

export async function countActiveStaff() {
  const { state } = await readState()
  return state.staff.filter((member) => member.status === 'active').length
}

export async function createStaff({ displayName, email, graphToken }) {
  const normalizedEmail = email.trim().toLowerCase()
  const { state } = await readState()
  if (state.staff.some((member) => member.email === normalizedEmail)) {
    throw new Error('A staff account with this email already exists')
  }

  const { oid, temporaryPassword } = await createLocalAccount({
    email: normalizedEmail,
    displayName,
    graphToken,
  })

  const now = new Date().toISOString()
  await updateState((current) => {
    if (current.staff.some((member) => member.email === normalizedEmail || member.oid === oid)) {
      throw new Error('A staff account with this email already exists')
    }
    current.staff.push({
      oid,
      email: normalizedEmail,
      displayName,
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    return current
  })

  return { staff: await getStaffByOid(oid), temporaryPassword }
}

export async function setStaffStatus(oid, status, graphToken) {
  const existing = await getStaffByOid(oid)
  if (!existing) return null

  await setAccountEnabled(oid, status === 'active', graphToken)
  await updateState((current) => {
    const row = current.staff.find((member) => member.oid === oid)
    if (row) {
      row.status = status
      row.updatedAt = new Date().toISOString()
    }
    return current
  })
  return getStaffByOid(oid)
}

export async function updateStaff(oid, displayName) {
  const existing = await getStaffByOid(oid)
  if (!existing) return null
  await updateState((current) => {
    const row = current.staff.find((member) => member.oid === oid)
    if (row) { row.displayName = displayName; row.updatedAt = new Date().toISOString() }
    return current
  })
  return getStaffByOid(oid)
}

export async function bootstrapFirstAdmin({ oid, emails, displayName }) {
  const { state } = await readState()
  if (state.staff.length > 0) return null
  if (!emails.includes(bootstrapEmail)) return null

  const now = new Date().toISOString()
  await updateState((current) => {
    if (current.staff.length > 0) return current
    current.staff.push({
      oid,
      email: bootstrapEmail,
      displayName: displayName || 'Administrator',
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    return current
  })
  return getActiveStaffByOid(oid)
}
