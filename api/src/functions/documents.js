import { app } from '@azure/functions'
import { authorizeClient, json } from '../auth.js'
import { downloadClientDocument, listClientDocuments, uploadClientDocument } from '../storage.js'

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

    try {
      if (request.method === 'GET') {
        const id = request.query.get('id')
        if (!id) {
          return json(200, { documents: await listClientDocuments(auth.client.id) })
        }
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return json(400, { error: 'Invalid document identifier' })
        }
        const file = await downloadClientDocument(auth.client.id, id)
        if (!file) return json(404, { error: 'Document not found' })
        const disposition = request.query.get('download') === '1' ? 'attachment' : 'inline'
        return {
          status: 200,
          headers: {
            'Content-Type': file.contentType,
            'Content-Disposition': `${disposition}; filename="${file.document.name.replace(/"/g, '')}"`,
            'Cache-Control': 'no-store',
          },
          body: file.buffer,
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
      const document = await uploadClientDocument(auth.client.id, {
        name: uploaded.name || 'document',
        contentType: uploaded.type,
        category,
        buffer: Buffer.from(await uploaded.arrayBuffer()),
      })
      return json(201, { document })
    } catch (error) {
      return json(500, { error: error instanceof Error ? error.message : 'Document request failed' })
    }
  },
})
