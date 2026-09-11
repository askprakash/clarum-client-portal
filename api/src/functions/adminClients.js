import { app } from '@azure/functions'
import { authorizePortal, json } from '../auth.js'
import { createClient, setClientStatus } from '../clients.js'
import { graphTokenFromRequest } from '../graph.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

app.http('adminClientsCreate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'firm/clients',
  handler: async (request) => {
    const auth = await authorizePortal(request)
    if (auth.status) return json(auth.status, auth.body)
    if (auth.role !== 'admin') {
      return json(403, { error: 'Administrator sign-in is required' })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json(400, { error: 'Invalid request body' })
    }

    const organization = String(body.organization || '').trim()
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim()
    if (!organization || !fullName || !email) {
      return json(400, { error: 'Organization, contact name, and email are required' })
    }
    if (!emailPattern.test(email)) {
      return json(400, { error: 'Enter a valid email address' })
    }

    try {
      const { client, temporaryPassword } = await createClient({
        organization,
        fullName,
        email,
        phone: body.phone ? String(body.phone) : undefined,
        mailingAddress: body.mailingAddress ? String(body.mailingAddress) : undefined,
        preferredContact: body.preferredContact === 'Phone' ? 'Phone' : 'Email',
        graphToken: graphTokenFromRequest(request, body),
      })
      return json(201, { client, temporaryPassword })
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : 'Could not create the client' })
    }
  },
})

app.http('adminClientsStatus', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'firm/clients/{oid}',
  handler: async (request) => {
    const auth = await authorizePortal(request)
    if (auth.status) return json(auth.status, auth.body)
    if (auth.role !== 'admin') {
      return json(403, { error: 'Administrator sign-in is required' })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json(400, { error: 'Invalid request body' })
    }
    const status = body.status === 'disabled' ? 'disabled' : body.status === 'active' ? 'active' : null
    if (!status) {
      return json(400, { error: 'Status must be active or disabled' })
    }

    try {
      const client = await setClientStatus(request.params.oid, status, graphTokenFromRequest(request, body))
      if (!client) return json(404, { error: 'Client not found' })
      return json(200, { client })
    } catch (error) {
      return json(400, { error: error instanceof Error ? error.message : 'Could not update the client' })
    }
  },
})
