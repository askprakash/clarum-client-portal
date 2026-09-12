import { app } from '@azure/functions'
import { authorizeClient, json } from '../auth.js'
import { createFolder } from '../documents.js'

app.http('folders', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'documents/folders',
  handler: async (request) => {
    const auth = await authorizeClient(request)
    if (auth.status) return json(auth.status, auth.body)
    try {
      const body = await request.json()
      const parent = String(body.parent || '')
      const name = String(body.name || '')
      const folder = await createFolder(auth.client.id, auth.role, parent, name)
      return json(201, { folder: { id: folder.id, name: folder.name } })
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : 'Folder could not be created' })
    }
  },
})
