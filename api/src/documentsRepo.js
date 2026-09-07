import { query } from './db.js'

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    date: new Date(row.uploaded_at).toISOString().slice(0, 10),
    status: row.status,
    attentionReason: row.attention_reason || undefined,
    fileType: row.file_type,
  }
}

export async function listDocumentsForClient(clientOid) {
  const result = await query(
    'SELECT * FROM documents WHERE client_oid = @clientOid ORDER BY uploaded_at DESC',
    { clientOid },
  )
  return result.recordset.map(mapRow)
}

export async function getDocumentRow(clientOid, id) {
  const result = await query('SELECT * FROM documents WHERE client_oid = @clientOid AND id = @id', {
    clientOid,
    id,
  })
  return result.recordset[0] ?? null
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
  await query(
    `INSERT INTO documents
       (id, client_oid, name, category, file_type, status, content_type, size_bytes, uploaded_by_oid, uploaded_by_role)
     VALUES
       (@id, @clientOid, @name, @category, @fileType, 'available', @contentType, @sizeBytes, @uploadedByOid, @uploadedByRole)`,
    { id, clientOid, name, category, fileType, contentType, sizeBytes, uploadedByOid, uploadedByRole },
  )
  const row = await getDocumentRow(clientOid, id)
  return mapRow(row)
}
