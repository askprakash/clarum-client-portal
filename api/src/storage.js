import { BlobServiceClient } from '@azure/storage-blob'

const containerName = process.env.DOCUMENT_CONTAINER || 'client-documents'

function getContainer() {
  const connection = process.env.DOCUMENT_STORAGE_CONNECTION
  if (!connection) {
    throw new Error('Document storage is not configured')
  }
  return BlobServiceClient.fromConnectionString(connection).getContainerClient(containerName)
}

export async function ensureContainer() {
  const container = getContainer()
  await container.createIfNotExists()
  return container
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function blobNameFor(oid, id) {
  if (!uuidPattern.test(oid) || !uuidPattern.test(id)) {
    throw new Error('Invalid document identifier')
  }
  return `${oid}/${id}`
}

function asciiMeta(value) {
  return encodeURIComponent(String(value || '').slice(0, 200))
}

function fromMeta(value, fallback = '') {
  if (!value) return fallback
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function toDocument(blob, oid) {
  const meta = blob.metadata ?? {}
  const id = blob.name.slice(oid.length + 1)
  const name = fromMeta(meta.name, id)
  const extension = name.includes('.') ? name.split('.').pop().toUpperCase() : (fromMeta(meta.fileType, 'FILE'))
  return {
    id,
    name,
    category: fromMeta(meta.category, 'Correspondence'),
    date: (fromMeta(meta.uploadedAt) || blob.properties.lastModified?.toISOString() || new Date().toISOString()).slice(0, 10),
    status: fromMeta(meta.status, 'available'),
    attentionReason: fromMeta(meta.attentionReason) || undefined,
    fileType: extension,
  }
}

export async function listClientDocuments(oid) {
  const container = await ensureContainer()
  const documents = []
  for await (const blob of container.listBlobsFlat({ prefix: `${oid}/` })) {
    documents.push(toDocument(blob, oid))
  }
  return documents.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getClientDocument(oid, id) {
  const container = await ensureContainer()
  const blob = container.getBlockBlobClient(blobNameFor(oid, id))
  if (!(await blob.exists())) return null
  const properties = await blob.getProperties()
  return {
    blob,
    document: toDocument(
      {
        name: blob.name,
        metadata: properties.metadata,
        properties: { lastModified: properties.lastModified },
      },
      oid,
    ),
    properties,
  }
}

export async function uploadClientDocument(oid, file) {
  const container = await ensureContainer()
  const id = crypto.randomUUID()
  const blob = container.getBlockBlobClient(blobNameFor(oid, id))
  await blob.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.contentType || 'application/octet-stream' },
    metadata: {
      name: asciiMeta(file.name),
      category: asciiMeta(file.category),
      uploadedAt: asciiMeta(new Date().toISOString()),
      status: 'available',
      fileType: asciiMeta(file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'FILE'),
    },
  })
  const listed = await listClientDocuments(oid)
  return listed.find((item) => item.id === id) ?? listed[0]
}

export async function downloadClientDocument(oid, id) {
  const found = await getClientDocument(oid, id)
  if (!found) return null
  const download = await found.blob.download()
  const chunks = []
  for await (const chunk of download.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return {
    document: found.document,
    contentType: found.properties.contentType || 'application/octet-stream',
    buffer: Buffer.concat(chunks),
  }
}
