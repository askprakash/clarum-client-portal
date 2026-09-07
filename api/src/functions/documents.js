import { randomUUID } from 'node:crypto'
import { app } from '@azure/functions'
import { authorizeClient, json } from '../auth.js'
import { getDocumentBytes, putDocumentBytes } from '../storage.js'
import { getDocumentRow, insertDocument, listDocumentsForClient } from '../documentsRepo.js'

const categories = new Set([
  'Tax Returns',
  'Organizers',
  'Financial Statements',
  'Engagement Letters',
  'Payroll',
  'Correspondence',
  'Other',
])

app.http('documents', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'documents',
  handler: async (request) => {
    const auth = await authorizeClient(request)
    if (auth.status) return json(auth.status, auth.body)
    const clientOid = auth.client.id

    try {
      if (request.method === 'GET') {
        const id = request.query.get('id')
        if (!id) {
          return json(200, { documents: await listDocumentsForClient(clientOid) })
        }
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return json(400, { error: 'Invalid document identifier' })
        }
        const row = await getDocumentRow(clientOid, id)
        if (!row) return json(404, { error: 'Document not found' })
        const buffer = await getDocumentBytes(clientOid, id)
        if (!buffer) return json(404, { error: 'Document not found' })
        const disposition = request.query.get('download') === '1' ? 'attachment' : 'inline'
        return {
          status: 200,
          headers: {
            'Content-Type': row.contentType || 'application/octet-stream',
            'Content-Disposition': `${disposition}; filename="${row.name.replace(/"/g, '')}"`,
            'Cache-Control': 'no-store',
          },
          body: buffer,
        }
      }

      const form = await request.formData()
      const uploaded = form.get('file')
      const category = String(form.get('category') || 'Correspondence')
      if (!uploaded || typeof uploaded === 'string') {
        return json(400, { error: 'Choose a file to upload' })
      }
      if (!categories.has(category)) {
        return json(400, { error: 'Choose a valid category' })
      }
      if (uploaded.size > 20 * 1024 * 1024) {
        return json(400, { error: 'Files must be 20 MB or smaller' })
      }

      const id = randomUUID()
      const name = uploaded.name || 'document'
      const buffer = Buffer.from(await uploaded.arrayBuffer())
      const contentType = uploaded.type || 'application/octet-stream'

      await putDocumentBytes(clientOid, id, buffer, contentType)
      const document = await insertDocument({
        id,
        clientOid,
        name,
        category,
        fileType: name.includes('.') ? name.split('.').pop().toUpperCase() : 'FILE',
        contentType,
        sizeBytes: buffer.length,
        uploadedByOid: auth.oid,
        uploadedByRole: auth.role,
      })
      return json(201, { document })
    } catch (error) {
      return json(500, { error: error instanceof Error ? error.message : 'Document request failed' })
    }
  },
})
