import { app } from '@azure/functions'
import { authorizePortal, json } from '../auth.js'
import { listAllowedClients } from '../clients.js'

app.http('clients', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'clients',
  handler: async (request) => {
    const auth = await authorizePortal(request)
    if (auth.status) return json(auth.status, auth.body)
    if (auth.role !== 'admin') {
      return json(403, { error: 'Administrator sign-in is required' })
    }
    return json(200, { clients: listAllowedClients() })
  },
})
