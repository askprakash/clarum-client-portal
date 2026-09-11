import { app } from '@azure/functions'
import { authorizeClient, json } from '../auth.js'
import { getDocumentBytes, listDocumentsForClient, uploadDocument } from '../documents.js'

const categories = new Set([
  'Tax Returns',
  'Organizers',
  'Financial Statements',
  'Engagement Letters',
  'Payroll',
  'Correspondence',
  'Other',
  'Permanent',
  'Accounting',
  'Tax',
  'Advisory',
  'Workpapers',
  'Client Shared',
  'Client Uploads',
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
          return json(200, { documents: await listDocumentsForClient(clientOid, auth.role) })
        }
        const downloaded = await getDocumentBytes(clientOid, auth.role, id)
        if (!downloaded) return json(404, { error: 'Document not found' })
        const disposition = request.query.get('download') === '1' ? 'attachment' : 'inline'
        return {
          status: 200,
          headers: {
            'Content-Type': downloaded.contentType || 'application/octet-stream',
            'Content-Disposition': `${disposition}; filename="${downloaded.name.replace(/"/g, '')}"`,
            'Cache-Control': 'no-store',
          },
          body: downloaded.buffer,
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

      const document = await uploadDocument(clientOid, auth.role, {
        fileName: uploaded.name || 'document',
        buffer: Buffer.from(await uploaded.arrayBuffer()),
        contentType: uploaded.type || 'application/octet-stream',
        category,
      })
      return json(201, { document })
    } catch (error) {
      return json(500, { error: error instanceof Error ? error.message : 'Document request failed' })
    }
  },
})
