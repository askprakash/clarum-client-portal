import { isSharePointConflict, readPortalState, writePortalState } from './sharepoint.js'

const seedClient = {
  oid: 'e7468903-52b6-4e96-97ca-239c0ec6188a',
  email: 'prakash@prcanalytics.com',
  fullName: 'PRC ANALYTICS INC',
  title: 'Client',
  organization: 'PRC ANALYTICS INC',
  phone: 'Not provided',
  mailingAddress: 'Not provided',
  preferredContact: 'Email',
  engagements: [],
  clientSince: 'Not provided',
  status: 'active',
  folderId: '',
  folderName: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function emptyState() {
  return {
    staff: [],
    clients: [seedClient],
  }
}

function normalizeState(parsed) {
  return {
    staff: Array.isArray(parsed?.staff) ? parsed.staff : [],
    clients: Array.isArray(parsed?.clients) ? parsed.clients : [seedClient],
  }
}

export async function readState() {
  const { state, etag } = await readPortalState()
  return { state: state ? normalizeState(state) : emptyState(), etag }
}

export async function updateState(mutator) {
  let lastError
  for (let attempt = 0; attempt < 6; attempt++) {
    const { state, etag } = await readState()
    const next = await mutator(state)
    try {
      await writePortalState(next, etag)
      return next
    } catch (error) {
      lastError = error
      if (!isSharePointConflict(error)) throw error
    }
  }
  throw lastError ?? new Error('Could not save portal data. Please try again.')
}
