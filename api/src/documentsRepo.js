import { readState, updateState } from './store.js'

function mapDocument(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    date: String(row.uploadedAt || '').slice(0, 10),
    status: row.status,
    attentionReason: row.attentionReason || undefined,
    fileType: row.fileType,
  }
}

export async function listDocumentsForClient(clientOid) {
  const { state } = await readState()
  return state.documents
    .filter((row) => row.clientOid === clientOid)
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)))
    .map(mapDocument)
}

export async function getDocumentRow(clientOid, id) {
  const { state } = await readState()
  return state.documents.find((row) => row.clientOid === clientOid && row.id === id) ?? null
}

export async function insertDocument({
  id,
  clientOid,
  name,
  category,
  fileType,
  contentType,
  sizeBytes,
  uploadedByOid,
  uploadedByRole,
}) {
  const uploadedAt = new Date().toISOString()
  await updateState((current) => {
    current.documents.push({
      id,
      clientOid,
      name,
      category,
      fileType,
      status: 'available',
      contentType,
      sizeBytes,
      uploadedByOid,
      uploadedByRole,
      uploadedAt,
    })
    return current
  })
  const row = await getDocumentRow(clientOid, id)
  return mapDocument(row)
}
