// Clients, staff, and document metadata live in the same Azure blob account that already
// stores files. That avoids a separate Azure SQL database for this portal.

import { ensureContainer } from './storage.js'

const stateBlobName = 'portal-meta/state.json'

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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function emptyState() {
  return {
    staff: [],
    clients: [seedClient],
    documents: [],
  }
}

async function readBody(download) {
  const chunks = []
  for await (const chunk of download.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

export async function readState() {
  const container = await ensureContainer()
  const blob = container.getBlockBlobClient(stateBlobName)
  if (!(await blob.exists())) {
    return { state: emptyState(), etag: undefined }
  }
  const download = await blob.download()
  const parsed = JSON.parse(await readBody(download))
  return {
    state: {
      staff: Array.isArray(parsed.staff) ? parsed.staff : [],
      clients: Array.isArray(parsed.clients) ? parsed.clients : [seedClient],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
    },
    etag: download.etag,
  }
}

async function writeState(state, etag) {
  const container = await ensureContainer()
  const blob = container.getBlockBlobClient(stateBlobName)
  const payload = JSON.stringify(state)
  await blob.upload(payload, Buffer.byteLength(payload), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
    conditions: etag ? { ifMatch: etag } : { ifNoneMatch: '*' },
  })
}

function isConflict(error) {
  return error?.statusCode === 412 || error?.statusCode === 409
}

export async function updateState(mutator) {
  let lastError
  for (let attempt = 0; attempt < 6; attempt++) {
    const { state, etag } = await readState()
    const next = await mutator(state)
    try {
      await writeState(next, etag)
      return next
    } catch (error) {
      lastError = error
      if (!isConflict(error)) throw error
    }
  }
  throw lastError ?? new Error('Could not save portal data. Please try again.')
}
