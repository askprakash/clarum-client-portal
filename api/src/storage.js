// Raw document bytes only. Metadata (name, category, status, who uploaded it, when) lives in
// Azure SQL — see documentsRepo.js — not in blob metadata as it used to.

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

export function blobNameFor(clientOid, documentId) {
  if (!uuidPattern.test(clientOid) || !uuidPattern.test(documentId)) {
    throw new Error('Invalid document identifier')
  }
  return `${clientOid}/${documentId}`
}

export async function putDocumentBytes(clientOid, documentId, buffer, contentType) {
  const container = await ensureContainer()
  const blob = container.getBlockBlobClient(blobNameFor(clientOid, documentId))
  await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' },
  })
}

export async function getDocumentBytes(clientOid, documentId) {
  const container = await ensureContainer()
  const blob = container.getBlockBlobClient(blobNameFor(clientOid, documentId))
  if (!(await blob.exists())) return null
  const download = await blob.download()
  const chunks = []
  for await (const chunk of download.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function deleteDocumentBytes(clientOid, documentId) {
  const container = await ensureContainer()
  const blob = container.getBlockBlobClient(blobNameFor(clientOid, documentId))
  await blob.deleteIfExists()
}
