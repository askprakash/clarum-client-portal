import { createLocalAccount, setAccountEnabled } from './graph.js'
import { readState, updateState } from './store.js'

function mapClient(row) {
  return {
    id: row.oid,
    fullName: row.fullName,
    title: row.title || 'Client',
    organization: row.organization,
    email: row.email,
    phone: row.phone || 'Not provided',
    mailingAddress: row.mailingAddress || 'Not provided',
    clientSince: row.clientSince || 'Not provided',
    engagements: Array.isArray(row.engagements) ? row.engagements : [],
    preferredContact: row.preferredContact === 'Phone' ? 'Phone' : 'Email',
    status: row.status === 'disabled' ? 'disabled' : 'active',
  }
}

export async function getActiveClientByOid(oid) {
  const { state } = await readState()
  const row = state.clients.find((client) => client.oid === oid && client.status === 'active')
  return row ? mapClient(row) : null
}

export async function getClientByOid(oid) {
  const { state } = await readState()
  const row = state.clients.find((client) => client.oid === oid)
  return row ? mapClient(row) : null
}

export async function listClients() {
  const { state } = await readState()
  return [...state.clients]
    .sort((a, b) => a.organization.localeCompare(b.organization))
    .map(mapClient)
}

export async function createClient({
  organization,
  fullName,
  email,
  phone,
  mailingAddress,
  preferredContact,
  graphToken,
}) {
  const normalizedEmail = email.trim().toLowerCase()
  const { state } = await readState()
  if (state.clients.some((client) => client.email === normalizedEmail)) {
    throw new Error('A client with this email already exists')
  }

  const { oid, temporaryPassword } = await createLocalAccount({
    email: normalizedEmail,
    displayName: fullName,
    graphToken,
  })

  const now = new Date().toISOString()
  await updateState((current) => {
    if (current.clients.some((client) => client.email === normalizedEmail || client.oid === oid)) {
      throw new Error('A client with this email already exists')
    }
    current.clients.push({
      oid,
      email: normalizedEmail,
      fullName,
      title: 'Client',
      organization,
      phone: phone || 'Not provided',
      mailingAddress: mailingAddress || 'Not provided',
      preferredContact: preferredContact === 'Phone' ? 'Phone' : 'Email',
      engagements: [],
      clientSince: now.slice(0, 10),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    return current
  })

  return { client: await getClientByOid(oid), temporaryPassword }
}

export async function setClientStatus(oid, status, graphToken) {
  const existing = await getClientByOid(oid)
  if (!existing) return null

  await setAccountEnabled(oid, status === 'active', graphToken)
  await updateState((current) => {
    const row = current.clients.find((client) => client.oid === oid)
    if (row) {
      row.status = status
      row.updatedAt = new Date().toISOString()
    }
    return current
  })
  return getClientByOid(oid)
}
